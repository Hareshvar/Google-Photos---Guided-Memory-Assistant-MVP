import logging
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from app.config import settings
from app.models.schemas import Photo, ChatMessage, ChatResponse
from app.services.data_manager import data_manager
from app.services.llm_orchestrator import llm_orchestrator
from app.services.tag_service import tag_service

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """You are a memory-search assistant helping someone find one specific photo
they remember but can't precisely describe. If no time anchor is given,
ask about a life stage or event first ("was this around a specific time —
starting a new job, moving, a trip?"), never a generic "tell me more."
Ask at most one follow-up before searching. Once you search, look at the
actual candidate photos alongside anything the user described, and
present your best matches — but always let the user confirm; never assume
you've found the right one. If nothing matches, say so honestly and
suggest a different anchor rather than guessing. Keep the tone warm and
conversational, like a friend helping someone remember something."""

SCOPE_REDIRECT_TEXT = "I'm here specifically to help you find a photo in your library — I'm not able to help with that. Want to tell me more about the photo you're looking for?"

def _parse_selection_and_clean(user_message: str) -> Tuple[List[str], str]:
    """Extracts photo IDs from '[Referencing selected photo IDs: ...]' and returns (selected_ids, clean_text)."""
    match = re.search(r'\[Referencing selected photo IDs:\s*([^\]]+)\]', user_message)
    if match:
        ids_str = match.group(1)
        selected_ids = [pid.strip() for pid in ids_str.split(',') if pid.strip()]
        clean_text = re.sub(r'\[Referencing selected photo IDs:\s*[^\]]+\]', '', user_message).strip()
        return selected_ids, clean_text
    return [], user_message.strip()

class AgentService:
    def process_chat(self, user_message: str, history: List[ChatMessage]) -> ChatResponse:
        """
        Main Layer 2 Guided Retrieval processing pipeline:
        1. Scope Guardrail & Structured Signal Extraction
        2. Photo Feedback / Un-tagging Handling for Selected Candidates
        3. Public Event Resolution via LLM Knowledge
        4. Metadata Filtering against photos.json
        5. Max 1 Follow-up Enforcement
        6. Multimodal Ranking on Candidates & Response Delivery
        """
        selected_photo_ids, clean_user_message = _parse_selection_and_clean(user_message)

        # Count prior assistant clarifying follow-ups in history (excluding initial welcome greeting)
        prior_followups = sum(
            1 for m in history
            if m.role == "assistant" and "?" in m.content and "no exact date or perfect keyword needed" not in m.content
        )
        already_asked_followup = prior_followups >= 1

        # Step 1: Structured Extraction via LLM
        extraction_prompt = f"""
Analyze the user's photo search message and conversation history.

User message: "{clean_user_message}"
History: {[{"role": m.role, "content": m.content} for m in history]}

Extract a JSON object with these keys:
- "is_out_of_scope": boolean (true ONLY if prompt is totally unrelated to photo memory search, e.g. general trivia, coding, poem requests)
- "is_negative_feedback": boolean (true if user indicates selected photo(s) are NOT relevant, wrong tag, wrong photo, e.g. "this is not related to job", "not relevant", "wrong photo", "remove")
- "time_anchor": string or null (e.g. "Started New Job", "Goa Trip", "Moved to New City", "March 2023", "2022", "last year")
- "public_event": string or null (e.g. "Diwali 2023", "Diwali", "Elections 2023")
- "visual_details": string or null (e.g. "beach", "office desk", "decorations", "diya", "sunset")
- "needs_followup": boolean (true ONLY IF no time_anchor, public_event, or life stage is present AND user message is vague)
"""
        extracted, meta = llm_orchestrator.extract_json(extraction_prompt, AGENT_SYSTEM_PROMPT)
        logger.info(f"Structured extraction result: {extracted}")

        # Check Scope Guardrail (Edge case 3.5)
        if extracted.get("is_out_of_scope", False):
            return ChatResponse(
                response=SCOPE_REDIRECT_TEXT,
                candidates=[],
                needs_followup=False,
                meta=meta
            )

        # Handle Photo Relevance Feedback (Un-tagging / Rejection)
        is_neg_feedback = extracted.get("is_negative_feedback", False) or any(
            kw in clean_user_message.lower() for kw in ["not related", "not relevant", "wrong photo", "wrong tag", "remove", "not job"]
        )

        if selected_photo_ids and is_neg_feedback:
            # Infer active tag/topic from history or extracted anchor
            active_anchor = extracted.get("time_anchor")
            if not active_anchor:
                # Look back in history for previous assistant or user message
                for m in reversed(history):
                    if "job" in m.content.lower() or "started new job" in m.content.lower():
                        active_anchor = "Started New Job"
                        break
                    elif "goa" in m.content.lower():
                        active_anchor = "Goa Trip"
                        break
                    elif "city" in m.content.lower() or "moved" in m.content.lower():
                        active_anchor = "Moved to New City"
                        break
                    elif "diwali" in m.content.lower():
                        active_anchor = "Diwali 2023"
                        break

            target_tag = active_anchor or "Started New Job"

            # Remove tag from selected photos in database
            for pid in selected_photo_ids:
                tag_service.remove_photo_from_tag(pid, target_tag)
                logger.info(f"Removed tag '{target_tag}' from photo '{pid}' based on user feedback.")

            # Load remaining photos matching the tag
            all_photos = data_manager.load_photos()
            remaining_candidates = self._filter_photos(all_photos, target_tag, None, None)
            remaining_candidates = [p for p in remaining_candidates if p.id not in selected_photo_ids]

            if remaining_candidates:
                resp = f"Got it! I've removed the photo from '{target_tag}'. Here are the remaining matching photos from your library."
            else:
                resp = f"Got it! I've un-tagged that photo from '{target_tag}'. No other photos matched this search. Would you like to try searching by another memory anchor?"

            return ChatResponse(
                response=resp,
                candidates=remaining_candidates,
                needs_followup=False,
                meta=meta
            )

        time_anchor = extracted.get("time_anchor")
        public_event = extracted.get("public_event")
        visual_details = extracted.get("visual_details")
        needs_followup = extracted.get("needs_followup", False)

        # Detect generic vague prompts (e.g. "find a photo", "a photo", "picture") lacking any anchor
        vague_phrases = ["find a photo", "find photo", "a photo", "picture", "find picture", "search photo", "help me find a photo", "looking for a photo", "show photos", "i want to find a photo", "find me a photo", "get photo", "photo"]
        msg_lower = clean_user_message.lower().strip()
        is_generic_vague = msg_lower in vague_phrases or (time_anchor and time_anchor.lower().strip() in vague_phrases)

        if is_generic_vague:
            time_anchor = None
            needs_followup = True

        # Enforce Max 1 Follow-up Rule (Edge case 3.1 & 3.2)
        if already_asked_followup:
            needs_followup = False

        # If follow-up needed and allowed, generate targeted follow-up question
        if needs_followup and not (time_anchor or public_event):
            followup_q = "Was this around a specific time — starting a new job, moving, a trip?"
            return ChatResponse(
                response=followup_q,
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        # Step 2: Resolve Public Events live via Gemini (Section 5.6)
        resolved_date_range = None
        if public_event:
            logger.info(f"Resolving public event live via Gemini world knowledge: '{public_event}'")
            res_prompt = f"Resolve the public event '{public_event}' to an approximate date range. Respond ONLY with JSON object: {{\"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD\"}}"
            date_res, _ = llm_orchestrator.extract_json(res_prompt)
            if date_res.get("start_date") and date_res.get("end_date"):
                resolved_date_range = (date_res["start_date"], date_res["end_date"])
                logger.info(f"Public event resolved to date range: {resolved_date_range}")

        # Step 3: Metadata Filter against photos.json
        all_photos = data_manager.load_photos()
        candidates = self._filter_photos(all_photos, time_anchor, public_event, resolved_date_range)
        if selected_photo_ids:
            candidates = [p for p in candidates if p.id not in selected_photo_ids]

        # If zero filter results (Edge Case 3.3)
        if not candidates:
            zero_msg = f"I couldn't find any photos matching '{clean_user_message}' in your library. Would you like to try searching by another life stage or memory anchor?"
            return ChatResponse(
                response=zero_msg,
                candidates=[],
                needs_followup=False,
                meta=meta
            )

        # Step 4: Multimodal Ranking on Candidate Set (Section 5.1 Step 3)
        candidates_payload = []
        for c in candidates:
            img_path = settings.PHOTOS_DATA_DIR / c.filename
            candidates_payload.append({
                "id": c.id,
                "timestamp": c.timestamp,
                "tags": [t.model_dump() for t in c.tags],
                "image_path": str(img_path)
            })

        query_desc = f"{user_message} (Visual clues: {visual_details or 'none'})"
        ranked_ids, ranking_meta = llm_orchestrator.rank_candidates_multimodal(candidates_payload, query_desc)

        # Reorder candidates based on ranked_ids
        id_to_photo = {p.id: p for p in candidates}
        ordered_candidates = []
        for pid in ranked_ids:
            if pid in id_to_photo:
                ordered_candidates.append(id_to_photo[pid])
        # Add any remaining candidates not explicitly listed in ranking
        for p in candidates:
            if p not in ordered_candidates:
                ordered_candidates.append(p)

        response_text = "Here are the photos from your library that match what you described. Tap the photo to confirm if it's the one you were looking for!"

        return ChatResponse(
            response=response_text,
            candidates=ordered_candidates,
            needs_followup=False,
            meta=ranking_meta
        )

    def _filter_photos(
        self,
        photos: List[Photo],
        time_anchor: Optional[str],
        public_event: Optional[str],
        resolved_date_range: Optional[Tuple[str, str]]
    ) -> List[Photo]:
        """Filters photos.json by matching tag labels, resolved event dates, or timeframe."""
        matches = []
        query_terms = []

        if time_anchor:
            query_terms.append(time_anchor.lower())
        if public_event:
            query_terms.append(public_event.lower())

        for p in photos:
            photo_matched = False
            # 1. Match tag label
            photo_tag_labels = [t.label.lower() for t in p.tags]
            for term in query_terms:
                if any(term in label for label in photo_tag_labels):
                    photo_matched = True
                    break

            # 2. Match resolved date range
            if not photo_matched and resolved_date_range:
                start_d, end_d = resolved_date_range
                if start_d <= p.timestamp <= end_d:
                    photo_matched = True

            # 3. Match explicit year or month string in time_anchor
            if not photo_matched and time_anchor:
                if time_anchor in p.timestamp:
                    photo_matched = True

            if photo_matched:
                matches.append(p)

        # If query terms exist but no tag/date matched, try broader matching
        if not matches and (time_anchor or public_event):
            # Check if any tag label contains partial word matches
            for p in photos:
                labels_str = " ".join([t.label.lower() for t in p.tags])
                for term in query_terms:
                    words = term.split()
                    if any(w in labels_str for w in words if len(w) > 3):
                        matches.append(p)
                        break

        return matches

agent_service = AgentService()
