# Implementation Plan: Guided Memory Assistant (MVP)

> **Project:** Google Photos Graduation Project — Solution 1 of 3 (MVP)  
> **Reference Documents:** [`PRD_Guided_Memory_Assistant.md`](file:///d:/Product%20Management/Projects/Graduation%20Project/Guided%20Search%20Assistant%20MVP/PRD_Guided_Memory_Assistant.md) | [`Architecture.md`](file:///d:/Product%20Management/Projects/Graduation%20Project/Guided%20Search%20Assistant%20MVP/Architecture.md)  
> **Target Platform:** Mobile-First Responsive Web Application (Next.js + Python FastAPI)

---

## Overview & Execution Strategy

This implementation plan outlines a step-by-step phased rollout for the Guided Memory Assistant MVP. 
Per project guidelines, we build **mobile-first**, establish empirical backend verification before UI integration, enforce a single unified signal-matching function, and build a resilient LLM fallback architecture.

---

## Phase 1: Backend Setup & Foundation Data Layer

### 1.1 Project Structure Setup
- Initialize Python FastAPI directory structure at `backend/`:
  - `app/main.py`: Application entrypoint & CORS middleware.
  - `app/config.py`: Environment variable loader (`.env` parser).
  - `app/models/`: Pydantic data schemas.
  - `app/services/`: Business logic handlers.
  - `app/data/`: Data storage directory containing `photos.json` and `signals.json`.

### 1.2 Data Schemas (`app/models/schemas.py`)
- Define Pydantic models:
  - `Tag`: `label: str`, `status: Literal["suggested", "confirmed"]`
  - `Photo`: `id: str`, `filename: str`, `timestamp: str`, `tags: List[Tag]`
  - `CalendarEvent`: `title: str`, `date: str`, `inferred_tag: str`
  - `GmailSignal`: `subject: str`, `date_range: List[str]`, `inferred_tag: str`
  - `MapsSignal`: `pattern: str`, `detected_week: str`, `inferred_tag: str`
  - `SignalsData`: `calendar_events`, `gmail_signals`, `maps_signals`

### 1.3 Data Storage & Seed File Pre-load
- Setup starting `app/data/photos.json` with all 17 seed photos from `Photos_Data/` having **empty `tags: []` arrays**.
- Map photo IDs (`newjob_01`..`02`, `newcity_01`..`02`, `goa_01`..`05`, `diwali_01`..`03`, `general_01`..`05`) to actual image files in `Photos_Data/`.
- Setup `app/data/signals.json` with pre-seeded signals for Calendar, Gmail, and Maps.

### 1.4 Unified Signal-Matching Engine (`app/services/signal_engine.py`)
- Implement a single, reusable `apply_signal_matching(photo: Photo, signals: SignalsData) -> Photo` function:
  - Compares photo timestamp against Calendar event dates.
  - Compares photo timestamp against Gmail `date_range` windows.
  - Compares photo timestamp against Maps `detected_week` windows.
  - Appends any match to `photo.tags` with status `"suggested"`.
- Implement startup event hook in `main.py` that executes `apply_signal_matching` across all 17 seed photos, populating `photos.json` on startup.

### 1.5 Basic Media & Photo API Endpoints
- `GET /api/photos`: Return list of all photos with tags.
- `GET /api/photos/{photo_id}/image`: Serve static image file from `Photos_Data/`.
- `GET /api/signals`: Return active signals overview.

#### Phase 1 Verification Criteria
- [ ] Run FastAPI server on `PORT=8000`.
- [ ] Send `GET /api/photos` via curl/script and verify post-startup state matches PRD Section 3.2 (suggested tags present for Goa, New Job, New City; empty tags for General photos).
- [ ] Verify image serving endpoint resolves files correctly from `Photos_Data/`.

---

## Phase 2: Layer 1 Tagging Engine & Tag Management API

### 2.1 Tag Operations Service (`app/services/tag_service.py`)
Implement functions that mutate `photos.json` and persist changes:
1. **Assign Tag**: `assign_tag(photo_ids, tag_label)` $\rightarrow$ sets tag status `"confirmed"`.
2. **Confirm Suggestion**: `confirm_suggestion(photo_id, tag_label)` $\rightarrow$ changes status from `"suggested"` to `"confirmed"`.
3. **Rename Tag**: `rename_tag(old_label, new_label)` $\rightarrow$ updates tag label across all photos.
4. **Remove Photo from Tag**: `remove_photo_from_tag(photo_id, tag_label)` $\rightarrow$ deletes tag from specific photo.
5. **Merge Tags**: `merge_tags(source_label, target_label)` $\rightarrow$ replaces source label with target label across all photos.
6. **Delete Tag Group**: `delete_tag_group(tag_label)` $\rightarrow$ removes tag from all photos (without deleting photo files).
7. **Bulk Date-Range Tagging**: `bulk_tag_range(start_date, end_date, tag_label)` $\rightarrow$ tags all photos within date range.

### 2.2 Check-in Banner API
- `GET /api/check-in`: Scans `photos.json` for any unconfirmed `"suggested"` tag and returns banner state:
  - Returns `has_new_suggestion: bool`, `suggested_tag: str`, `photo_count: int`.

### 2.3 Simulated Photo Upload API (`POST /api/photos/upload`)
- Implement simulated upload using a pool of pre-generated upload images (5–10 images).
- Passes the uploaded image through the **exact same `apply_signal_matching` function** used during startup.
- Saves new entry to `photos.json` and triggers check-in banner state.

#### Phase 2 Verification Criteria
- [ ] Execute automated test script covering all 7 tag operations (Assign, Confirm, Rename, Remove, Merge, Delete, Bulk Tag).
- [ ] Verify persistence in `photos.json` after each operation.
- [ ] Test simulated upload endpoint and confirm it uses the unified signal matching logic.

---

## Phase 3: Resilient LLM Orchestrator & Guided Retrieval Agent

### 3.1 Resilient LLM Orchestrator (`app/services/llm_orchestrator.py`)
- Implement wrapper class `LLMOrchestrator`:
  - **Primary**: Google Gemini 2.5 Flash / Pro API calls.
  - **Retry Policy**: Exponential backoff retry (up to 2 retries) on rate limit / 429 / 5xx errors.
  - **Fallback**: Groq API using model configured in `GROQ_VISION_MODEL_NAME` (`qwen/qwen3.8-27b`).
  - **Path Logging**: Logs provider used (`gemini` or `groq`), latency, and retry count for every response.
  - Supports both text completion and multimodal vision ranking requests.

### 3.2 Conversational Retrieval Agent (`app/services/agent_service.py`)
- Implement 3-step retrieval pipeline:
  1. **Structured Extraction**: Extracts time anchor, event name, visual details, and determines `needs_followup: bool`.
  2. **Public Event Resolution**: If user mentions a public event (e.g. "Diwali 2023"), prompts Gemini to resolve it to an exact date range.
  3. **Metadata Filtering**: Filters `photos.json` by matching tag or date range.
  4. **Multimodal Ranking**: Sends filtered candidate images directly to `LLMOrchestrator` to rank best matches based on visual descriptions.
- **Scope Guardrail**: Non-photo queries (e.g., general knowledge, math) receive a polite redirect.
- **Max 1 Follow-up Rule**: Never asks a second follow-up question before running a search.

### 3.3 Retrieval API Endpoints
- `POST /api/chat`: Handles user message, returns agent response, follow-up flag, or candidate photo grid.
- `POST /api/confirm`: Confirms selected photo match and closes search task.

#### Phase 3 Verification Criteria
- [ ] Run test suite with sample queries:
  - Time anchor query ("Photos from my Goa trip") $\rightarrow$ Direct search result.
  - Vague query ("Photos from last year") $\rightarrow$ 1 targeted follow-up question.
  - Public event query ("Photos around Diwali 2023") $\rightarrow$ Live date resolution & search result.
  - Out-of-scope query ("What is the capital of France?") $\rightarrow$ Scope redirect response.
- [ ] Simulate Gemini rate limit to verify automatic failover to Groq vision model with path log output.

---

## Phase 4: Mobile-First Next.js Frontend Integration

### 4.1 Frontend Setup & Design System
- Initialize Next.js application in `frontend/`.
- Configure Tailwind CSS with Google Photos exact color tokens:
  - `google-blue`: `#4285F4`
  - `google-red`: `#EA4335`
  - `google-yellow`: `#FBBC04`
  - `google-green`: `#34A853`
  - Background & surface colors matching Google Photos dark/light theme tokens.

### 4.2 UI Screen Implementation (Mobile Viewport)
Based on Stitch export packages in `UI_Design/Mobile UI/`:
1. **Screen 1 — Library View (`google_photos_mobile_library`)**:
   - Chronological photo grid grouped by timeline dates.
   - Tag badges on photos (`suggested` dotted border vs `confirmed` solid badge).
   - Top search bar with chat affordance ("Can't find it? Let's talk it through").
   - Bottom navigation bar (Photos, Memories, Library, Search).
2. **Screen 2 — Life Stages Panel (`google_photos_mobile_life_stages`)**:
   - Subheading grouped views ("Goa Trip", "Started New Job", "Moved to New City").
   - Group thumbnail preview grid.
3. **Screen 3 — Tag Editor & Check-in Banner (`google_photos_mobile_tag_assignment_1/2`, `google_photos_mobile_review_suggestions`)**:
   - Tag action drawer (assign, rename, remove, merge, delete group, bulk date range tag).
   - Check-in banner component at top of library screen.
4. **Screen 4 & 5 — Conversational Retrieval Chat (`google_photos_mobile_guided_retrieval`, `google_photos_candidate_confirmation_mobile`)**:
   - Full mobile chat interface.
   - Embedded candidate photo grid inside chat messages.
   - Tappable photo card for user confirmation.

### 4.3 API Client Integration
- Setup React hooks / custom fetch client connecting to FastAPI backend on `http://localhost:8000`.

#### Phase 4 Verification Criteria
- [ ] Build Next.js app with `npm run build` cleanly without TypeScript/React errors.
- [ ] Verify mobile viewport rendering (375px–430px layout breakpoints).
- [ ] Test full interactive flow on mobile UI: view library, open Life Stages, edit tags, receive check-in banner, trigger guided search chat, tap candidate to confirm match.

---

## Phase 5: End-to-End System Integration & Polish

### 5.1 End-to-End Workflow Verification
- Perform end-to-end verification of all user scenarios:
  1. App load $\rightarrow$ Backend signal matching runs $\rightarrow$ Library displays tagged grid.
  2. Check-in banner surfaces new suggestion $\rightarrow$ User confirms $\rightarrow$ Tag status updates to `"confirmed"`.
  3. User performs multi-select tag edit $\rightarrow$ State updates immediately.
  4. Simulated "Upload" button clicked $\rightarrow$ Upload matching runs $\rightarrow$ New banner surfaces.
  5. Guided Retrieval search $\rightarrow$ Agent asks follow-up or returns candidates $\rightarrow$ User confirms match.

### 5.2 Final Deliverables Checklist
- [ ] Responsive Next.js Mobile Frontend.
- [ ] Python FastAPI Backend Service.
- [ ] Valid `.env` configuration file.
- [ ] Verified Gemini + Groq model failover logging.
- [ ] Clean code documentation & execution instructions.
