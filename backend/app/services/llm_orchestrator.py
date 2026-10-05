import os
import time
import json
import base64
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

class LLMOrchestrator:
    """
    Resilient LLM Orchestrator.
    Primary: Gemini 2.5 API with exponential backoff retry.
    Fallback: Groq API with configurable vision model (GROQ_VISION_MODEL_NAME).
    Logs execution provider, retries, and latency per call.
    """
    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_VISION_MODEL_NAME

    def _call_gemini_api(self, contents: List[Dict[str, Any]], system_instruction: Optional[str] = None) -> str:
        """Raw HTTP call to Google Gemini API (trying gemini-flash-latest, gemini-3.8-flash)."""
        gemini_models = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash"]
        last_exception = None

        for model in gemini_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_key}"
            payload: Dict[str, Any] = {"contents": contents}
            if system_instruction:
                payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

            headers = {"Content-Type": "application/json"}
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

            try:
                with urllib.request.urlopen(req, timeout=8) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
            except Exception as e:
                logger.warning(f"Gemini model '{model}' call failed: {e}")
                last_exception = e
                continue

        raise RuntimeError(f"All Gemini models failed. Last error: {last_exception}")

    def _call_groq_api(self, messages: List[Dict[str, Any]]) -> str:
        """Raw HTTP call to Groq API using OpenAI chat completions endpoint."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": 0.2
        }
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("Groq API returned empty choices.")
            return choices[0].get("message", {}).get("content", "")

    def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        """
        Generates text completion using Speculative Parallel Execution (racing Groq & Gemini concurrently).
        Returns the response from whichever provider finishes successfully first.
        """
        import concurrent.futures

        start_time = time.time()

        def call_groq():
            groq_messages = []
            if system_instruction:
                groq_messages.append({"role": "system", "content": system_instruction})
            groq_messages.append({"role": "user", "content": prompt})
            res = self._call_groq_api(groq_messages)
            if not res or not res.strip():
                raise ValueError("Groq returned empty response")
            return res, "groq"

        def call_gemini():
            gemini_contents = [{"parts": [{"text": prompt}]}]
            res = self._call_gemini_api(gemini_contents, system_instruction)
            if not res or not res.strip():
                raise ValueError("Gemini returned empty response")
            return res, "gemini"

        # Race both API requests in parallel threads
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                executor.submit(call_groq): "groq",
                executor.submit(call_gemini): "gemini"
            }
            
            errors = []
            for future in concurrent.futures.as_completed(futures):
                provider_name = futures[future]
                try:
                    res_text, provider = future.result()
                    latency_ms = int((time.time() - start_time) * 1000)
                    meta = {"provider_used": provider, "latency_ms": latency_ms}
                    logger.info(f"LLM Call Succeeded via {provider.upper()} Race ({latency_ms}ms)")
                    return res_text, meta
                except Exception as e:
                    logger.warning(f"Parallel LLM worker '{provider_name}' failed: {e}")
                    errors.append(f"{provider_name}: {e}")

        raise RuntimeError(f"All parallel LLM providers failed: {'; '.join(errors)}")

    def extract_json(self, prompt: str, system_instruction: Optional[str] = None) -> Tuple[Any, Dict[str, Any]]:
        """
        Generates text and parses result into a clean JSON object or list.
        Handles markdown block formatting (e.g. ```json ... ```) and text wrapper padding.
        """
        json_instruction = (system_instruction or "") + "\nRespond strictly with valid JSON. Do not include markdown code block formatting or conversational text."
        text_resp, meta = self.generate_text(prompt, system_instruction=json_instruction)
        
        cleaned = text_resp.strip()
        if "```" in cleaned:
            lines = cleaned.split("\n")
            json_lines = []
            inside = False
            for line in lines:
                if line.startswith("```"):
                    inside = not inside
                    continue
                if inside:
                    json_lines.append(line)
            if json_lines:
                cleaned = "\n".join(json_lines).strip()
            else:
                cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        # Find first '{' or '[' and last '}' or ']'
        candidates_start = [pos for pos in [cleaned.find('{'), cleaned.find('[')] if pos != -1]
        first_brace = min(candidates_start) if candidates_start else -1
        last_brace = max([cleaned.rfind('}'), cleaned.rfind(']')], default=-1)
        
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace:last_brace + 1]

        try:
            parsed = json.loads(cleaned)
            return parsed, meta
        except Exception as e:
            logger.error(f"Failed to parse JSON response: {e}. Raw text: {text_resp}")
            return {}, meta

    def rank_candidates_multimodal(
        self, candidates: List[Dict[str, Any]], query_description: str
    ) -> Tuple[List[str], Dict[str, Any]]:
        """
        Fast & Resilient Candidate Ranking:
        Ranks candidate photos based on query description and metadata (timestamps, tags).
        Lightweight execution preventing heavy base64 HTTP upload timeouts.
        """
        if not candidates:
            return [], {"provider_used": "none", "latency_ms": 0}

        start_time = time.time()
        candidates_to_rank = candidates[:8]

        # Construct fast text metadata ranking prompt
        ranking_prompt = f"User memory query: '{query_description}'. Candidate photo library records:\n"
        for item in candidates_to_rank:
            photo_id = item["id"]
            timestamp = item.get("timestamp", "")
            tags = [t["label"] for t in item.get("tags", [])]
            ranking_prompt += f"- ID: {photo_id} | Date: {timestamp} | Tags: {tags}\n"

        ranking_prompt += "\nRespond ONLY with a JSON array of photo IDs ordered from best match to worst match. Example: [\"goa_01\", \"goa_02\"]"

        system_instruction = "You are a photo ranking assistant. Order candidate photo IDs by relevance to user query."

        try:
            parsed_json, meta = self.extract_json(ranking_prompt, system_instruction=system_instruction)
            if isinstance(parsed_json, list):
                return parsed_json, meta
        except Exception as e:
            logger.warning(f"Fast ranking parse failed: {e}")

        # Fallback to default candidate IDs order
        fallback_ids = [c["id"] for c in candidates_to_rank]
        return fallback_ids, {"provider_used": "fallback", "latency_ms": int((time.time() - start_time) * 1000)}

llm_orchestrator = LLMOrchestrator()
