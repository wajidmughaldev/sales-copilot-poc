# MEMORY.md — Project State & Session Handoff Log

## Current Status
- **Phase:** Phase 1 POC (Browser STT + Streaming AI Teleprompter)
- **Active Milestone:** ALL MILESTONES COMPLETE
- **Last Completed Milestone:** Milestone 5 — SkillModal + localStorage ✅
- **POC Status:** Phase 1 fully implemented and production-build verified.

## Completed Work Log
- **[Init]:** Created `AGENTS.md`, `SPEC.md`, `PLAN.md`, `MEMORY.md`, `CLAUDE.md`, `.cursorrules`, and `.env.example`.
- **[Milestone 1]:** Created `src/types/index.ts` (exact match SPEC.md Section 2 — all 6 exports: `SpeakerRole`, `CallStage`, `TranscriptTurn`, `ObjectionRule`, `SalesSkill`, `SuggestRequestPayload`). Created `src/lib/skills.ts` with `DEFAULT_AGENCY_SKILL` (B2B Digital Agency — Google + Meta ads, 5 filler bridges, 5 objection rules) and `buildSystemPrompt(skill, stage)` enforcing 35-word cap, spoken contractions, bold punchwords, low-friction closing question, and zero preamble output rules. `npx tsc --noEmit` passed with zero errors.
- **[Milestone 2]:** Created `src/lib/stt-adapter.ts` — factory `createSTTAdapter(callbacks)` returning `{ start, stop, isSupported }`. Wraps `window.SpeechRecognition || window.webkitSpeechRecognition` with a custom `BrowserSpeechRecognition` interface shim (no third-party types needed). Sets `continuous=true`, `interimResults=true`, `lang='en-US'`. Implements `shouldBeListening` sentinel: if Chrome fires `onend` while `shouldBeListening===true`, schedules `recognition.start()` within 150ms via `setTimeout`. Silently swallows `no-speech` errors (Chrome false-alarm). SSR-safe (window guard). `npx tsc --noEmit` passed with zero errors.
- **[Milestone 3]:** Created `src/app/api/suggest/route.ts`. POST handler validates JSON, rejects on missing fields (422), sanitises turns (slice last 6, truncate 500 chars), builds system prompt via `buildSystemPrompt`, formats messages. If `GROQ_API_KEY` is missing/placeholder streams mock response word-by-word at ~80ms/word. Live path: fetches Groq `llama-3.3-70b-versatile` with `temperature:0.4`, `max_tokens:90`, `stream:true`; parses SSE `data:` lines; forwards only `.choices[0].delta.content` tokens as plain UTF-8. Returns `502` on Groq errors. `npx tsc --noEmit` passed with zero errors.
- **[Milestone 4]:** Created `src/components/TranscriptPanel.tsx` (auto-scroll chat, Prospect/You bubbles, pulsing live interim box). Created `src/components/TeleprompterCard.tsx` (filler badge strip, `parseBold()` renders `**punchwords**` as yellow spans, streaming indicator, 4 quick-objection buttons). Replaced `src/app/page.tsx` with full Cold Caller Cockpit: STT adapter wired via `useEffect`/`useRef`, `appendTurn` triggers `fetchSuggestion` only on prospect turns, streaming fetch reads `ReadableStream` token-by-token into state. Top Bar: mic toggle, status badge, speaker role pills, 5 call stage pills, manual text input. All files written as UTF-8 (no BOM). Removed `runtime='edge'` — incompatible with project `cacheComponents` config. `npx tsc --noEmit` + `npm run build` both exited code 0.
- **[Milestone 5]:** Created `src/components/SkillModal.tsx` — editable form for `name`, `agencyOffer`, `targetAudience`, `callGoal`, `fillerBridges` (one-per-line textarea), and `objectionMatrix` (dynamic trigger+strategy pairs with add/remove). Exports `loadSkillFromStorage()` and `saveSkillToStorage()` helpers used by `page.tsx`. Reset-to-default clears `localStorage` key `sales-copilot-skill` and restores `DEFAULT_AGENCY_SKILL`. Updated `page.tsx` to load skill from localStorage on mount via `useState(loadSkillFromStorage)`, added `Customize Skill` button in Top Bar, wired `handleSaveSkill` -> `saveSkillToStorage` + `setSkill`. `npx tsc --noEmit` + `npm run build` both exited code 0.

- **[QA Fixes]:**
  1. *Live Typing Bubble*: Added `speakerRole` support to `TranscriptPanel.tsx` and mirrored manual input typing into `interimText` in `src/app/page.tsx` so typing in the manual input renders a live typing bubble that clears upon Send.
  2. *Instant Stop Mic*: Updated `src/lib/stt-adapter.ts` `stop()` to immediately invoke `recognition.abort()` and synchronously fire `onStatusChange(false)` so the UI toggles to "Paused" with zero delay.
  3. *Groq API & Model Compatibility*: In `src/app/api/suggest/route.ts`, cleaned API key quotes/whitespace and added dynamic fallback across supported Groq models (`qwen/qwen3.8-27b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`). Surface descriptive error status on failure.
  4. *Safe Skill Handling*: Added default fallback for `skill.toneRules` in `src/lib/skills.ts`.

## Key Decisions
- `DEFAULT_AGENCY_SKILL` targets B2B service companies (consultants, coaches, SaaS, 5–50 employees) selling done-for-you paid-ads + AI lead follow-up.
- `buildSystemPrompt` injects stage-specific coaching context (5 stages) plus all 5 tone rules into the system message sent to Groq/Gemini.
- STT adapter uses a factory pattern (not a class) for easy Phase 2 swap-in (Deepgram WebSocket) without touching any UI or AI logic.
- `no-speech` error is intentionally swallowed — it's Chrome's normal silence timeout, not a real error; `onend` + `shouldBeListening` handles the restart.
- Route is Node.js runtime (NOT edge) — `cacheComponents` in this Next.js config is incompatible with `runtime='edge'`. Node.js runtime handles `ReadableStream` streaming fine.
- Mock stream uses 80ms/word delay to simulate real Groq token cadence during UI development.
- `X-Source: mock | groq` response header lets the frontend display a dev indicator.
- All source files written via `[System.IO.File]::WriteAllText(..., UTF8NoBOM)` — PowerShell `Set-Content` defaults to UTF-16LE which Turbopack cannot parse.
- File sizes: `types/index.ts` 37L, `skills.ts` ~105L, `stt-adapter.ts` ~160L, `route.ts` ~175L, `TranscriptPanel.tsx` ~75L, `TeleprompterCard.tsx` ~90L, `page.tsx` ~185L — all under 200L.

## Next Action for AI Coding Agent
1. **Phase 1 POC is fully complete.** All 5 milestones implemented and verified.
2. Next: add `GROQ_API_KEY` to `.env.local` and test live streaming against real Groq API.
3. Phase 2 prep: swap `src/lib/stt-adapter.ts` for Deepgram Live WebSocket adapter (no other file changes needed).

