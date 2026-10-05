# PRD: Guided Memory Assistant (MVP)

Google Photos Graduation Project — Solution 1 of 3 (MVP; Visual Search Assistant and Ambient Life Memory Model are separate, future-track solutions, not part of this build)

---

## 0. Instructions for the builder

1. **If anything here is ambiguous or you're about to make an assumption, stop and ask the product owner before proceeding.** Do not guess and continue.
2. **Never silently fall back to a default.** If Gemini's quota is hit, retry with backoff, then fall back to Groq, and log which path was used per response. Never return a confident-sounding answer that didn't actually come from a model call.
3. **Verify before claiming something is done.** Show real output (a screenshot, a sample response, an actual file) before marking a feature complete.
4. This is a **standalone prototype** — no live Google account access (no real Gmail/Calendar/Maps OAuth). All signals are simulated from local files. Do not attempt to add real account integration.
5. The **UI will be supplied separately** (generated via Stitch) and the frontend is **Next.js**. This PRD defines behavior and data flow, not visual design — build to match whatever UI is provided, and ask if a screen described here doesn't have a corresponding design.
6. **The product must give the exact Google Photos look and feel** — not a feature-complete clone of every feature, but visually and interactively it should be indistinguishable from an update to the real app: the same chronological grid, grouped sections with subheadings, standard multi-select, recognizable search bar, and the **exact Google Photos brand colours** (Blue `#4285F4`, Red `#EA4335`, Yellow `#FBBC04`, Green `#34A853` — verified against Google Photos' own brand palette; do not substitute nearby shades). It should read as "Google Photos, with this new capability added," not as an unrelated app with similar colours.
7. **Do not choose or proceed with a hosting platform on your own.** The product owner will confirm where this is deployed. Prepare the app to be deployable (no hard-coded assumptions about a specific host), but do not select, configure, or deploy to any hosting provider without explicit sign-off first.
8. **The seed photo files already exist** and match the guide referenced in Section 3.1 exactly, filename for filename. The product owner will provide the folder path separately — do not regenerate or rename these files.
9. **This is a single responsive app, usable on both web and mobile** — one Next.js build that adapts layout at the breakpoint (bottom nav on mobile width, left nav rail on desktop width), not two separate builds. This means mobile *browser* access, not a native iOS/Android app — nothing beyond a responsive web app is required or expected for this MVP.

---

## 1. Overview

### 1.1 The problem

Users struggle to retrieve a photo they remember but can't precisely describe. Research (AI analysis of public reviews, a 113-person survey, 5 interviews) found the specific root cause: **search expects a literal keyword, but memory is naturally stored as a life stage, event, or feeling** — not a date.

- 92% of surveyed users place a photo in time using a non-exact anchor (a rough period, a life stage, or an event), not an exact date.
- 41.6% specifically think in life-stage or event terms — and this holds even for people who *do* know the exact date.
- 61.5% of users who tried to search with words struggled to phrase their memory as a search term.
- The exact date is the single most commonly forgotten detail (45.5% of all forgotten-detail mentions).

This is not a general search-quality or indexing problem (explicitly out of scope per the brief) — it is specifically about the gap between how memory is structured and what search requires.

### 1.2 Goal / metric

Move **Search Completion Rate** — the share of search attempts that turn into a submitted, usable query — for users whose memory is anchored to a life stage or event rather than a fact search can use directly.

### 1.3 What this MVP is

A two-layer system, **both layers fully built, not a minimal version of either**:
- **Layer 1 — Tagging:** photos are tagged by life stage or event, either by the user directly or auto-suggested from simulated signals (Calendar, Gmail, Maps, public events).
- **Layer 2 — Guided Retrieval:** a conversational agent asks targeted follow-up questions built around life-stage/event anchors, then retrieves and ranks candidate photos — without requiring the user to supply a perfect keyword.

A stranger must be able to sit down and actually attempt a retrieval task with this end to end — both layers need to work together for that to be true (Layer 2 has nothing to search against without Layer 1).

### 1.4 What this is explicitly NOT

- **Not a RAG chatbot.** There is no vector embedding, no semantic search index. See Section 5 for the actual mechanism.
- **Not a visual-similarity search.** That is a separate, already-scoped solution (Visual Search Assistant) and is deliberately out of this MVP.
- **Not connected to any real account.** All Calendar/Gmail/Maps signals are simulated; public events are resolved live via Gemini's own knowledge (Section 5.6) — neither uses a real external API.
- **Not using push notifications.** The "check-in" feature (Section 4.5) is an in-app, session-load check — no real push infrastructure.

---

## 2. User flow (tied to 5 screens)

1. **Library (home):** a normal chronological photo grid, in the familiar style of Google Photos. Tagged photos show a small tag badge. Photos can carry a tag and still appear in their normal place in the timeline — a tag never moves or duplicates a photo.
2. **Life Stages panel:** a browsing view grouping photos under subheadings by tag label (e.g. "Goa Trip," "Started New Job"), each followed by its photo grid — same visual pattern as Google Photos' own "People & Pets" view, just grouped by tag instead of face.
3. **Tag editor:** opened from a photo or the Life Stages panel. Supports: assign a tag to selected photo(s), rename a tag group, remove photo(s) from a tag group, merge two tag groups, delete a tag group entirely (never deletes the underlying photos), and bulk-tag a selected date range on the timeline in one action.
4. **Retrieval entry point:** a clearly visible, dedicated affordance (not folded silently into the normal search bar) — e.g. a chat-bubble icon beside search, or search placeholder text reading "Can't find it? Let's talk it through."
5. **Conversation screen:** a chat interface. User describes a memory in free text. The agent either has enough to search, or asks exactly one targeted follow-up. Candidate photos are shown as a small tappable grid inside the chat. User taps to confirm a match, ending the task — same satisfying end state as a real successful search.

---

## 3. Data

### 3.1 Seed photo library

20 AI-generated photos (Nano Banana / Gemini 2.5 Flash Image), JPEG, ~800–1200px wide, already generated and matching this plan filename-for-filename. The product owner will supply the folder path separately.

| Chapter | Files | Timestamp window | Tag at load |
|---|---|---|---|
| Started New Job | `newjob_01.jpg`, `newjob_02.jpg` | March 2023 | "Started New Job" (suggested) |
| Moved to New City | `newcity_01.jpg`, `newcity_02.jpg` | August 2023 | "Moved to New City" (suggested) |
| Goa Trip | `goa_01.jpg`–`goa_05.jpg` | June 14–18, 2022 | "Goa Trip" (suggested) |
| Diwali 2023 | `diwali_01.jpg`–`diwali_03.jpg` | November 2023 | "Diwali 2023" (suggested, resolved live — see 5.6) |
| General / Standalone | `general_01.jpg`–`general_05.jpg` | Spread, no pattern | None — deliberately untagged |

### 3.2 `photos.json` — full starting data

```json
[
  { "id": "newjob_01", "filename": "newjob_01.jpg", "timestamp": "2023-03-02", "tags": [{ "label": "Started New Job", "status": "suggested" }] },
  { "id": "newjob_02", "filename": "newjob_02.jpg", "timestamp": "2023-03-09", "tags": [{ "label": "Started New Job", "status": "suggested" }] },

  { "id": "newcity_01", "filename": "newcity_01.jpg", "timestamp": "2023-08-08", "tags": [{ "label": "Moved to New City", "status": "suggested" }] },
  { "id": "newcity_02", "filename": "newcity_02.jpg", "timestamp": "2023-08-12", "tags": [{ "label": "Moved to New City", "status": "suggested" }] },

  { "id": "goa_01", "filename": "goa_01.jpg", "timestamp": "2022-06-15", "tags": [{ "label": "Goa Trip", "status": "suggested" }] },
  { "id": "goa_02", "filename": "goa_02.jpg", "timestamp": "2022-06-15", "tags": [{ "label": "Goa Trip", "status": "suggested" }] },
  { "id": "goa_03", "filename": "goa_03.jpg", "timestamp": "2022-06-16", "tags": [{ "label": "Goa Trip", "status": "suggested" }] },
  { "id": "goa_04", "filename": "goa_04.jpg", "timestamp": "2022-06-16", "tags": [{ "label": "Goa Trip", "status": "suggested" }] },
  { "id": "goa_05", "filename": "goa_05.jpg", "timestamp": "2022-06-17", "tags": [{ "label": "Goa Trip", "status": "suggested" }] },

  { "id": "diwali_01", "filename": "diwali_01.jpg", "timestamp": "2023-11-12", "tags": [{ "label": "Diwali 2023", "status": "suggested" }] },
  { "id": "diwali_02", "filename": "diwali_02.jpg", "timestamp": "2023-11-12", "tags": [{ "label": "Diwali 2023", "status": "suggested" }] },
  { "id": "diwali_03", "filename": "diwali_03.jpg", "timestamp": "2023-11-12", "tags": [{ "label": "Diwali 2023", "status": "suggested" }] },

  { "id": "general_01", "filename": "general_01.jpg", "timestamp": "2022-09-10", "tags": [] },
  { "id": "general_02", "filename": "general_02.jpg", "timestamp": "2023-02-20", "tags": [] },
  { "id": "general_03", "filename": "general_03.jpg", "timestamp": "2023-07-05", "tags": [] },
  { "id": "general_04", "filename": "general_04.jpg", "timestamp": "2024-01-15", "tags": [] },
  { "id": "general_05", "filename": "general_05.jpg", "timestamp": "2024-03-30", "tags": [] }
]
```

`status` is either `"suggested"` (auto-detected from a signal, unconfirmed) or `"confirmed"` (user-applied, or a suggestion the user accepted). Suggested tags MUST render visually distinct in the UI (e.g. a dotted border or a "suggested" label) until confirmed. Never silently auto-apply a tag as confirmed. The five General/Standalone photos intentionally start with an empty `tags` array — this chapter represents the real "already vague" backlog and must not be auto-tagged by anything.

### 3.3 `signals.json` — full pre-seed data

```json
{
  "calendar_events": [
    { "title": "First day — new job", "date": "2023-03-01", "inferred_tag": "Started New Job" }
  ],
  "gmail_signals": [
    { "subject": "Redbus booking confirmation — Goa", "date_range": ["2022-06-14", "2022-06-18"], "inferred_tag": "Goa Trip" }
  ],
  "maps_signals": [
    { "pattern": "location_change", "detected_week": "2023-08-07", "inferred_tag": "Moved to New City" }
  ]
}
```

**Diwali 2023 is deliberately not in this file.** Public events are resolved live via Gemini's own world knowledge during the conversation itself — see Section 5.6. Do not add a `public_events` block here.

At setup, check each photo's timestamp against the three signal windows above; if it falls inside one, write/confirm the matching `suggested` tag in `photos.json`.

---

## 4. Layer 1 — Tagging, in detail

- **Self-tagging:** user selects one or more photos (standard multi-select UI) and assigns a tag — this writes directly to that photo's `tags` array in `photos.json`, status `"confirmed"`.
- **Auto-suggestion:** on setup/load, run the signal-matching check described in 3.3; write any matches as `"suggested"` tags.
- **Editing:** all six operations listed in Section 2, step 3, operate only on this same shared tag field — there is no separate "album" data structure.

### 4.5 Check-in / "noticed something new" feature

On app load, or when the simulated "Upload" button is used (Section 4.6), check whether any `suggested` tag exists that the user has not yet seen or responded to. **Only fire the in-app banner when a genuinely new, previously-unconfirmed suggestion exists — do not fire it unconditionally on every session load.** This keeps the feature honest (it reflects real state, not a timer) and it still surfaces naturally: every signal is new on first load, and each simulated Upload creates a fresh one.

Banner example: *"We noticed a new regular location — want to tag this as a life stage?"* Accepting changes the tag's status to `"confirmed"`; dismissing leaves it `"suggested"`, still visible later from the Life Stages panel.

### 4.6 Simulated "Upload" button

Does **not** generate an image live during the tester's session. Instead: pre-generate a small pool (5–10 images) during build/prep, each with a timestamp already falling inside one of the three signal windows above. Clicking "Upload" pulls the next image from this pool and runs it through the same check described in 4.5.

---

## 5. Layer 2 — Guided Retrieval, in detail

### 5.1 The actual mechanism (not RAG)

1. **Conversation → structured extraction.** Gemini reads the user's free-text description and extracts structured signals (a life stage, an event, a rough time period, a visual detail) — not a semantic search query.
2. **Structured filter.** Those signals become a filter against `photos.json` — matching tags and/or a date range. This is a plain filter, not a vector/embedding search.
3. **Multimodal reasoning on the narrowed set.** Once the filter narrows candidates to a small set, pass those actual candidate images directly to Gemini (multimodal — it can accept real images in a normal API call) along with any visual detail the user mentioned, and ask it to rank/select. No embedding model, no vector index required.
4. **User confirms.** The system never asserts it has found the correct photo on its own authority — it presents candidates, and the user taps to confirm.

### 5.2 Conversation logic

- If the user's first message already contains a usable time anchor (life stage, event, rough period, or exact date), do not ask about time again — search directly.
- If not, ask **exactly one** targeted follow-up before attempting a search. The follow-up must be shaped around life stage/event/era ("was this around a specific time — starting a new job, moving, a trip?"), never a generic "tell me more."
- Never ask a second follow-up before attempting at least one search.
- If the search returns nothing, say so plainly and suggest a different anchor — never guess or present a low-confidence match as if it were likely correct.

### 5.3 Draft system prompt

```
You are a memory-search assistant helping someone find one specific photo
they remember but can't precisely describe. If no time anchor is given,
ask about a life stage or event first ("was this around a specific time —
starting a new job, moving, a trip?"), never a generic "tell me more."
Ask at most one follow-up before searching. Once you search, look at the
actual candidate photos alongside anything the user described, and
present your best matches — but always let the user confirm; never assume
you've found the right one. If nothing matches, say so honestly and
suggest a different anchor rather than guessing. Keep the tone warm and
conversational, like a friend helping someone remember something.
```

### 5.4 Scope guardrail — the agent must only discuss photo retrieval

The conversational agent must politely decline and redirect any question unrelated to finding a photo in this library (general knowledge questions, unrelated small talk that isn't part of narrowing a memory, requests to do anything other than help locate a photo). Example redirect: *"I'm here to help you find a photo in your library — want to tell me more about the one you're looking for?"*

### 5.5 Example follow-up questions (not an exhaustive or restrictive list)

The agent is not limited to these — any follow-up is acceptable as long as it is relevant to narrowing down a photo retrieval, and is specific rather than generic:
- "Was this around a particular life stage — a new job, a move, before or after a big event?"
- "Do you remember roughly what time of year it was?"
- "Was anyone specific with you in the photo?"
- "Was it indoors or outdoors — and does anything about the setting stick out?"
- "Was there an event happening around that time that you associate it with?"

### 5.6 Public event resolution — confirmed approach

Public events (e.g. "Diwali," "the elections") are resolved using **Gemini's own world knowledge directly in conversation** — ask Gemini to resolve the named event to an approximate date or date range, then use that as the time-filter input to Section 5.1 step 2. No local signal file is used for this path (see Section 3.3).

---

## 6. Tech stack

- **Backend:** Python / FastAPI.
- **Frontend:** Next.js — one responsive build for both web and mobile browser (Section 0.9), with the exact Google Photos look-and-feel noted in Section 0.6. UI supplied separately via Stitch; build to match the provided design.
- **Storage:** flat local JSON files (`photos.json`, `signals.json`) — no database.
- **Models:** Gemini (primary) for conversation, extraction, and multimodal ranking. **Groq as fallback, including for the multimodal ranking step** — Groq's free tier currently includes at least one vision-capable model (e.g. a Qwen vision model); reference the model by a configurable setting, not a hardcoded name, since Groq's available vision models have changed before. Retry with backoff before falling back — never fall straight to a hardcoded default.
- **Hosting:** not decided yet — see Section 0.7. Build without assuming a specific platform.

---

## 7. Explicitly out of scope for this MVP

- Live OAuth integration with Gmail, Calendar, or Maps (simulated only; real integration is future-roadmap).
- Vector embeddings or visual-similarity search (deferred; this is Visual Search Assistant's territory, a separate solution).
- Real push notifications (in-app session-load check only).
- Tester-facing photo upload of their own real photos (would undermine the test — the tester must not already know the answer; see Section 4.6 for the correct, simulated version of "upload").
- Multi-user accounts or authentication (single demo library, no login).
- Choosing or configuring a hosting provider (Section 0.7).

---

## 8. Decisions log

| Question | Decision |
|---|---|
| Should the check-in banner always fire once per session, or only on a new signal? | Only on a genuinely new/unconfirmed signal (Section 4.5) |
| Should public events be pre-seeded or resolved live? | Resolved live via Gemini's own knowledge (Section 5.6) |
| Does the Groq fallback need to support multimodal ranking, or only text? | Yes, include multimodal — Groq currently offers a vision-capable free-tier model (Section 6) |
| Should Layer 1 be fully built, or a minimal version if time is short? | Fully built — both layers are in scope (Section 1.3) |
