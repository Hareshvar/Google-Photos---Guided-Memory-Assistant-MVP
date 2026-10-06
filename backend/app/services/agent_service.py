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

        # Sliding Window Memory: Carry context from the last 5 exchanges (max 10 messages)
        # Drop oldest exchange first when history exceeds 10 messages
        history = history[-10:] if len(history) > 10 else history

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
- "is_factual_question_about_photo": boolean (true if user is asking a factual question about a photo on screen/selected, e.g. "when was the image taken", "with whom did I take the picture", "who is in this photo", "where was this", "what date is this", "tell me about this photo")
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

        msg_lower = clean_user_message.lower().strip()

        # 1. Robust Greetings Normalizer (Handles "heyyy", "hiii", "hellooo", etc.)
        normalized_word = re.sub(r'^(h+e+y+|h+i+|h+e+l+o+|y+o+|s+u+p+).*$', r'\1', msg_lower)
        normalized_word = re.sub(r'(.)\1+', r'\1', normalized_word)
        GREETINGS_SET = {"hi", "hello", "hey", "yo", "sup", "greetings"}
        is_greeting = normalized_word in GREETINGS_SET or any(
            g in msg_lower.split() for g in ["hi", "hello", "hey", "heyy", "heyyy", "hiii", "helloo", "hellooo", "good morning", "good afternoon"]
        )

        if is_greeting:
            return ChatResponse(
                response="Hi there! I can help you find photos from your library. Are you looking for photos around a specific life stage or memory anchor (like a trip, new job, or event)?",
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        # Check if user is confirming a pending clarifying question from assistant history
        if history:
            last_assistant_msg = next(
                (m.content if hasattr(m, 'content') else m.get('content', '')
                 for m in reversed(history)
                 if (m.role if hasattr(m, 'role') else m.get('role')) == "assistant"),
                None
            )
            if last_assistant_msg and "?" in last_assistant_msg and "no exact date or perfect keyword needed" not in last_assistant_msg:
                # Check if user message is an affirmative confirmation or contains key confirmation details
                is_affirmative = any(w in msg_lower for w in ["yes", "yeah", "sure", "correct", "that's right", "that one"]) or msg_lower in ACKNOWLEDGMENTS
                q_year_match = re.search(r'\b(202[0-9]|201[0-9])\b', last_assistant_msg)
                user_has_q_year = bool(q_year_match and q_year_match.group(1) in msg_lower)

                if is_affirmative or user_has_q_year:
                    # Identify the target anchor tag from the question
                    target_tag = None
                    last_q_lower = last_assistant_msg.lower()
                    if "job" in last_q_lower:
                        target_tag = "job"
                    elif "goa" in last_q_lower or "trip" in last_q_lower:
                        target_tag = "trip"
                    elif "city" in last_q_lower or "moved" in last_q_lower:
                        target_tag = "city"
                    elif "diwali" in last_q_lower:
                        target_tag = "diwali"

                    target_yr = q_year_match.group(1) if q_year_match else None

                    if target_tag or target_yr:
                        all_photos = data_manager.load_photos()
                        matching_photos = [
                            p for p in all_photos
                            if (not target_yr or p.timestamp.startswith(target_yr))
                            and (not target_tag or any(target_tag in t.label.lower() for t in p.tags))
                        ]
                        if matching_photos:
                            return ChatResponse(
                                response="Here are the photos from your library that match what you described.",
                                candidates=matching_photos,
                                needs_followup=False,
                                meta=meta
                            )

        # 2. Conversational Acknowledgments / Small Talk
        ACKNOWLEDGMENTS = ["fine", "ok", "okay", "cool", "yeah", "yes", "sure", "thanks", "thank you", "got it", "great", "nice", "awesome", "alright"]
        if msg_lower in ACKNOWLEDGMENTS:
            return ChatResponse(
                response="Great! What photo would you like to find? Tell me a bit about what you remember — like a trip, a new job, or a specific event.",
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        # Extract any active year mentioned in recent conversation history
        active_year = None
        if history:
            for m in reversed(history):
                m_content = m.content if hasattr(m, 'content') else (m.get('content', '') if isinstance(m, dict) else '')
                ym = re.search(r'\b(202[0-9]|201[0-9])\b', m_content)
                if ym:
                    active_year = ym.group(1)
                    break

        # 3. Generic Vague Prompts & Broad Anchors ("trip", "job", "city", "photo", etc.)
        if msg_lower in ["trip", "a trip", "vacation", "trips"]:
            if active_year:
                all_photos = data_manager.load_photos()
                matching_yr_photos = [p for p in all_photos if p.timestamp.startswith(active_year) and any("trip" in t.label.lower() for t in p.tags)]
                if matching_yr_photos:
                    return ChatResponse(
                        response="Here are the photos from your library that match what you described.",
                        candidates=matching_yr_photos,
                        needs_followup=False,
                        meta=meta
                    )
                else:
                    return ChatResponse(
                        response=f"I couldn't find any trip photos from {active_year} in your library. Would you like to try searching by another year or memory anchor?",
                        candidates=[],
                        needs_followup=False,
                        meta=meta
                    )
            else:
                return ChatResponse(
                    response="Was this your Goa Trip around June 2024, or a different trip?",
                    candidates=[],
                    needs_followup=True,
                    meta=meta
                )

        if msg_lower in ["job", "new job", "work"]:
            if active_year:
                all_photos = data_manager.load_photos()
                matching_yr_photos = [p for p in all_photos if p.timestamp.startswith(active_year) and any("job" in t.label.lower() for t in p.tags)]
                if matching_yr_photos:
                    return ChatResponse(
                        response="Here are the photos from your library that match what you described.",
                        candidates=matching_yr_photos,
                        needs_followup=False,
                        meta=meta
                    )
                else:
                    return ChatResponse(
                        response=f"I couldn't find any job photos from {active_year} in your library. Would you like to try searching by another year or memory anchor?",
                        candidates=[],
                        needs_followup=False,
                        meta=meta
                    )
            else:
                return ChatResponse(
                    response="Was this around when you Started New Job in December 2025, or a different time?",
                    candidates=[],
                    needs_followup=True,
                    meta=meta
                )

        if msg_lower in ["city", "moved", "moving", "new city"]:
            if active_year:
                all_photos = data_manager.load_photos()
                matching_yr_photos = [p for p in all_photos if p.timestamp.startswith(active_year) and any("city" in t.label.lower() or "move" in t.label.lower() for t in p.tags)]
                if matching_yr_photos:
                    return ChatResponse(
                        response="Here are the photos from your library that match what you described.",
                        candidates=matching_yr_photos,
                        needs_followup=False,
                        meta=meta
                    )
                else:
                    return ChatResponse(
                        response=f"I couldn't find any moving or city photos from {active_year} in your library. Would you like to try searching by another year or memory anchor?",
                        candidates=[],
                        needs_followup=False,
                        meta=meta
                    )
            else:
                return ChatResponse(
                    response="Was this when you Moved to New City in August 2023, or another time?",
                    candidates=[],
                    needs_followup=True,
                    meta=meta
                )

        if msg_lower in ["festival", "festivals", "celebration", "celebrations", "holiday", "holidays", "event", "events"]:
            return ChatResponse(
                response="Which festival or celebration were you looking for — for example, Diwali 2023, or a different event?",
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        # Broad Standalone Year Prompts ("2024", "2023", "2025", etc.)
        year_match = re.search(r'\b(202[0-9]|201[0-9])\b', msg_lower)
        if year_match and len(msg_lower.split()) <= 3 and not any(kw in msg_lower for kw in ["goa", "diwali", "job", "city", "moved", "trip", "beach"]):
            yr = year_match.group(1)
            if yr == "2024":
                yr_prompt = "What are you looking for from 2024 — for example, your Goa Trip, or a different memory?"
            elif yr == "2023":
                yr_prompt = "What are you looking for from 2023 — for example, Diwali 2023 or when you Moved to New City?"
            elif yr == "2025":
                yr_prompt = "What are you looking for from 2025 — for example, when you Started New Job in December 2025?"
            else:
                yr_prompt = f"What photo are you looking for from {yr}? Tell me a bit about what you remember (like a trip or event)."

            return ChatResponse(
                response=yr_prompt,
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        VAGUE_PHOTO_PROMPTS = [
            "photo", "photos", "a photo", "picture", "pictures", "find a photo", "find photo",
            "search photo", "help me find a photo", "looking for a photo", "show photos",
            "i want to find a photo", "find me a photo", "get photo"
        ]
        if msg_lower in VAGUE_PHOTO_PROMPTS:
            return ChatResponse(
                response="Was this photo around a specific time — starting a new job, moving, or a trip?",
                candidates=[],
                needs_followup=True,
                meta=meta
            )

        # 4. Handle Factual Follow-up Questions about Already-Shown / Selected Photos
        is_factual_q = extracted.get("is_factual_question_about_photo", False) or any(
            kw in msg_lower for kw in [
                "when was", "date of", "timestamp", "taken", "where was", "location", "place of",
                "who is", "who was", "with whom", "who took", "people in", "person in",
                "what tag", "which tag", "tag on", "details of", "tell me about",
                "what camera", "what device", "phone model", "when was the image", "when was the photo"
            ]
        )

        all_photos = data_manager.load_photos()

        if is_factual_q:
            target_photos = []
            if selected_photo_ids:
                target_photos = [p for p in all_photos if p.id in selected_photo_ids]
            elif history:
                # Look for most recent candidate photos in history
                for m in reversed(history):
                    candidates_list = getattr(m, 'candidates', None) or (m.get('candidates') if isinstance(m, dict) else None)
                    if candidates_list:
                        c_ids = [c.id if hasattr(c, 'id') else c.get('id') for c in candidates_list if c]
                        target_photos = [p for p in all_photos if p.id in c_ids]
                        if target_photos:
                            break

            msg_lower = clean_user_message.lower()
            if any(k in msg_lower for k in ["who", "whom", "people", "person", "friend", "family", "with me"]):
                resp = "I don't have information about who is in this photo recorded in the metadata."

            elif any(k in msg_lower for k in ["when", "date", "timestamp", "time", "taken"]):
                if target_photos:
                    dates = sorted(list(set([p.timestamp for p in target_photos if p.timestamp])))
                    if len(dates) == 1:
                        d_str = dates[0]
                        try:
                            dt = datetime.strptime(d_str, "%Y-%m-%d")
                            formatted_date = dt.strftime("%B %d, %Y")
                            resp = f"This photo was taken on {formatted_date} ({d_str})."
                        except Exception:
                            resp = f"This photo was taken on {d_str}."
                    elif len(dates) > 1:
                        resp = f"The selected photos were taken between {dates[0]} and {dates[-1]}."
                    else:
                        resp = "I don't have date or timestamp information available for this photo."
                else:
                    resp = "I don't have date or timestamp information available for that photo."

            elif any(k in msg_lower for k in ["where", "location", "place", "city"]):
                resp = "I don't have location information available for this photo in the metadata."

            elif any(k in msg_lower for k in ["tag", "label", "event", "trip"]):
                if target_photos and target_photos[0].tags:
                    tag_names = ", ".join([f"'{t.label}'" for t in target_photos[0].tags])
                    resp = f"This photo is tagged with {tag_names}."
                else:
                    resp = "I don't have tag or label information available for this photo."

            elif any(k in msg_lower for k in ["camera", "device", "phone"]):
                resp = "I don't have camera or device information recorded for this photo."

            else:
                resp = "I don't have information available for that question regarding this photo."

            return ChatResponse(
                response=resp,
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
        else:
            # If not a generic vague phrase and no time_anchor or public_event, don't force generic followup
            if not (time_anchor or public_event):
                needs_followup = False

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
        candidates = self._filter_photos(all_photos, time_anchor, public_event, resolved_date_range, clean_user_message)
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

        response_text = "Here are the photos from your library that match what you described."

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
        resolved_date_range: Optional[Tuple[str, str]],
        raw_message: Optional[str] = None
    ) -> List[Photo]:
        """Filters photos.json by matching tag labels, resolved event dates, or timeframe."""
        matches = []
        query_terms = []

        if time_anchor:
            query_terms.append(time_anchor.lower())
        if public_event:
            query_terms.append(public_event.lower())

        # Fallback raw message terms ONLY if no structured time_anchor or public_event was extracted
        if not query_terms and raw_message:
            raw_words = [w.strip().lower() for w in raw_message.split() if len(w.strip()) >= 3]
            stop_words = {"the", "and", "for", "are", "you", "can", "see", "show", "find", "get", "with", "this", "that", "want", "some", "like", "yes", "yeah", "sure", "one", "that's", "one's"}
            for w in raw_words:
                if w not in stop_words and w not in query_terms:
                    query_terms.append(w)

        # Check if an explicit year filter is requested (e.g. "2024" or "2023")
        explicit_year = None
        if time_anchor and re.search(r'\b(202[0-9]|201[0-9])\b', time_anchor):
            explicit_year = re.search(r'\b(202[0-9]|201[0-9])\b', time_anchor).group(1)
        elif raw_message and re.search(r'\b(202[0-9]|201[0-9])\b', raw_message):
            explicit_year = re.search(r'\b(202[0-9]|201[0-9])\b', raw_message).group(1)

        for p in photos:
            photo_matched = False

            # Enforce strict year constraint if explicit year was specified
            if explicit_year and not p.timestamp.startswith(explicit_year):
                continue

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

        return matches

agent_service = AgentService()
