# Edge Cases Specification: Guided Memory Assistant (MVP)

> **Project:** Google Photos Graduation Project — Solution 1 of 3 (MVP)  
> **Reference Documents:** [`PRD_Guided_Memory_Assistant.md`](file:///d:/Product%20Management/Projects/Graduation%20Project/Guided%20Search%20Assistant%20MVP/PRD_Guided_Memory_Assistant.md) | [`Architecture.md`](file:///d:/Product%20Management/Projects/Graduation%20Project/Guided%20Search%20Assistant%20MVP/Architecture.md) | [`implementation_plan.md`](file:///d:/Product%20Management/Projects/Graduation%20Project/Guided%20Search%20Assistant%20MVP/implementation_plan.md)  
> **Target Platform:** Mobile-First Responsive Web Application (Next.js + Python FastAPI)

---

## 1. Layer 1 — Data & Signal-Matching Edge Cases

### 1.1 Photos with No Matching Signals (Standalone / Untagged)
- **Scenario:** Photos in `Photos_Data/` (`general_01` through `general_05`) do not match any signal window in `signals.json`.
- **Expected Behavior:** Must deliberately remain with empty `tags: []`. 
- **Guardrail:** Never force auto-tagging or generate artificial tags for standalone photos. They represent the unorganized baseline backlog.

### 1.2 Overlapping Signal Windows
- **Scenario:** A photo timestamp falls within two or more signals (e.g. a trip that took place during a job transition period).
- **Expected Behavior:** The unified signal-matching engine appends both matching tags with status `"suggested"`, deduplicating identical tag labels.
- **Guardrail:** Photos can hold multiple suggested tags simultaneously.

### 1.3 Simulated Upload Pool Exhaustion
- **Scenario:** User clicks the "Upload" button after all pre-generated upload pool images (5–10 images) have already been uploaded to `photos.json`.
- **Expected Behavior:** The API returns HTTP 200 with `{"message": "Upload pool exhausted", "photo": null}`. The UI displays a toast notification: *"All demo upload photos have been added."*
- **Guardrail:** Do not throw an unhandled backend exception or corrupt `photos.json`.

### 1.4 Date Boundary Inclusivity
- **Scenario:** A photo timestamp matches the exact start or end boundary date of a signal window (e.g., photo date `2022-06-14` against Gmail date range `["2022-06-14", "2022-06-18"]`).
- **Expected Behavior:** Boundary dates are strictly inclusive (`start_date <= photo_date <= end_date`). The tag is applied as `"suggested"`.

### 1.5 Missing or Corrupted `photos.json` / `signals.json`
- **Scenario:** `photos.json` is missing, empty, or contains invalid JSON on server startup.
- **Expected Behavior:** The backend automatically regenerates `photos.json` from the seed template (17 photos with empty `tags: []`), logs a warning, and executes the startup signal-matching check.

---

## 2. Layer 1 — Tag Management Edge Cases

### 2.1 Deleting a Tag Group
- **Scenario:** User deletes a tag group (e.g., "Goa Trip") from the Life Stages panel or Tag Editor.
- **Expected Behavior:** The tag label is stripped from all photos in `photos.json`.
- **Guardrail:** Underlying image files in `Photos_Data/` are **never** deleted. The action only modifies metadata.

### 2.2 Renaming a Tag to an Existing Tag Label
- **Scenario:** User renames Tag A ("New Job") to Tag B ("Started New Job"), which already exists.
- **Expected Behavior:** Automatically merges Tag A into Tag B across all photos, consolidating them into a single tag group without creating duplicate tags on any single photo.

### 2.3 Bulk Date-Range Tagging with No Photos in Range
- **Scenario:** User selects a date range for bulk tagging (e.g. `2021-01-01` to `2021-01-31`) where no photos exist in the library.
- **Expected Behavior:** API completes successfully returning `{"updated_count": 0}`. UI displays a helpful notice: *"No photos found in selected date range."*

### 2.4 Check-in Banner Dismissal vs Acceptance
- **Scenario:** User clicks "Dismiss" on the check-in banner ("We noticed a new regular location...").
- **Expected Behavior:** The tag status remains `"suggested"` in `photos.json`. It continues to appear under the Life Stages panel with a dotted border/badge, but the top banner is hidden for the current session.
- **Scenario:** User clicks "Accept".
- **Expected Behavior:** Tag status is updated to `"confirmed"` in `photos.json`, and the banner is cleared.

---

## 3. Layer 2 — Guided Retrieval & Agent Edge Cases

### 3.1 Initial Prompt Lacks Time Anchor (Max 1 Follow-up Rule)
- **Scenario:** User types a vague memory description without any time context: *"Find that photo of me at a coffee shop."*
- **Expected Behavior:** The agent asks **exactly one** targeted follow-up question shaped around life stage/event/era:
  > *"Was this around a specific time — starting a new job, moving, or a trip?"*
- **Guardrail:** Never ask generic follow-ups ("tell me more"). Never ask a second follow-up before attempting at least one search.

### 3.2 Second Follow-up Prevention
- **Scenario:** User responds to the agent's follow-up question with another vague response: *"I think it was daytime."*
- **Expected Behavior:** Since 1 follow-up has already been asked, the agent **must not** ask a 2nd follow-up. It performs a filter/search across candidate photos using available visual clues ("daytime", "coffee shop") or presents top candidates.

### 3.3 Zero Filter Results (No Match Found)
- **Scenario:** Structured filter query returns 0 candidate photos from `photos.json` (e.g. user asks for "Trip to Tokyo in 2019").
- **Expected Behavior:** The agent states plainly and honestly that no matching photos were found:
  > *"I couldn't find any photos from a Tokyo trip in 2019. Would you like to try searching by another memory or life stage?"*
- **Guardrail:** Never guess, hallucinate, or present low-confidence/unrelated photos as if they were correct matches.

### 3.4 Public Event Date Resolution Failure
- **Scenario:** User mentions an ambiguous public event that Gemini cannot resolve to an exact date range.
- **Expected Behavior:** Agent falls back gracefully by asking a specific follow-up about the approximate year or season:
  > *"Do you remember roughly which year or season that event was?"*

### 3.5 Out-of-Scope / Non-Photo Queries
- **Scenario:** User asks a general knowledge, coding, or unrelated question in chat: *"What is the distance to the moon?"* or *"Write a poem."*
- **Expected Behavior:** Scope guardrail triggers and polite redirect is returned:
  > *"I'm here to help you find a photo in your library — want to tell me more about the photo you're looking for?"*

---

## 4. Model Failover & API Resilience Edge Cases

### 4.1 Gemini Rate Limiting / Quota Exhaustion (HTTP 429 / 503)
- **Scenario:** Gemini API returns a 429 rate limit or 503 service unavailable error during conversation or multimodal ranking.
- **Execution Flow:**
  1. Backend executes exponential backoff retry (Wait 1s $\rightarrow$ Retry 1 $\rightarrow$ Wait 2s $\rightarrow$ Retry 2).
  2. If retries fail, backend seamlessly routes call to Groq API using `GROQ_VISION_MODEL_NAME` (`qwen/qwen3.8-27b`).
  3. Response payload includes metadata logging provider path: `{"meta": {"provider_used": "groq", "attempts": 3}}`.
- **Guardrail:** Never fall back to static/hardcoded dummy answers. Always complete inference via Groq or return an explicit API error.

### 4.2 Simultaneous Outage of Primary & Fallback Models
- **Scenario:** Both Gemini and Groq APIs fail simultaneously.
- **Expected Behavior:** API returns HTTP 503 with user-facing message: *"The search assistant is temporarily unavailable. Please try again in a moment."*

### 4.3 High Candidate Photo Count during Multimodal Ranking
- **Scenario:** Filter step yields 15+ candidate photos for multimodal ranking.
- **Expected Behavior:** To prevent payload bloat and API timeout, limit the multimodal vision ranking payload to the top **8 candidates** (ordered by closest timestamp match).

---

## 5. UI & Mobile UX Edge Cases

### 5.1 Long Tag Label Overflow
- **Scenario:** User assigns a very long tag name (e.g. "Summer Vacation with College Friends at Beach Resort 2022").
- **Expected Behavior:** UI pill badges truncate cleanly with CSS ellipsis (`max-w-[140px] truncate`). The full label is viewable when editing.

### 5.2 Network Latency / Rapid Tapping
- **Scenario:** User rapidly taps "Confirm" or "Assign Tag" button multiple times during network latency.
- **Expected Behavior:** Buttons enter a disabled loading state immediately upon first tap (`disabled={isLoading}`).

### 5.3 Mobile Viewport Keyboards
- **Scenario:** Mobile soft keyboard opens during conversational chat in Next.js.
- **Expected Behavior:** Chat input container pins cleanly above keyboard using `env(safe-area-inset-bottom)` and dynamic height sizing.
