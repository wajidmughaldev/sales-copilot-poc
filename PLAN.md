# PLAN.md — Step-by-Step Implementation Milestones

> **RULE FOR AI AGENT:** Only implement ONE milestone at a time. After completing a milestone, run `npx tsc --noEmit`, update `MEMORY.md`, and STOP to ask the user for approval before moving to the next milestone.

- [x] **Milestone 1: Core Types & Default Sales Skill Engine**
  - Create `src/types/index.ts` matching `SPEC.md` Section 2.
  - Create `src/lib/skills.ts` containing:
    - `DEFAULT_AGENCY_SKILL`: A complete B2B Digital Agency Cold Calling skill (offer, goal, filler bridges, and 5 common objections).
    - `buildSystemPrompt(skill: SalesSkill, stage: CallStage): string` enforcing the 35-word limit, bold punchwords, and spoken contractions.
  - Verify with `npx tsc --noEmit`.

- [x] **Milestone 2: Resilient Browser Speech-to-Text Adapter**
  - Create `src/lib/stt-adapter.ts` wrapping `window.SpeechRecognition || window.webkitSpeechRecognition`.
  - Implement `start()`, `stop()`, `isSupported()`, and auto-restart on silent Chrome disconnects.
  - Verify with `npx tsc --noEmit`.

- [x] **Milestone 3: Low-Latency Streaming AI Endpoint (`/api/suggest`)**
  - Create `src/app/api/suggest/route.ts`.
  - Implement input sanitization (max 6 turns, max 500 chars per turn).
  - Connect to Groq Streaming API (`llama-3.3-70b-versatile`) using `process.env.GROQ_API_KEY` (with a clean fallback mock stream if no API key is set yet so UI testing never crashes).
  - Stream raw text tokens back to the client.
  - Verify with `npx tsc --noEmit`.

- [x] **Milestone 4: Split-Screen Cold Caller Cockpit & Teleprompter UI**
  - Create `src/components/TranscriptPanel.tsx` (Left panel with live interim text & speaker bubbles).
  - Create `src/components/TeleprompterCard.tsx` (Right panel with instant filler badges, large teleprompter text with highlighted bold punchwords, and 1-click objection buttons).
  - Assemble the main cockpit in `src/app/page.tsx` connecting `stt-adapter` -> `/api/suggest` -> streaming Teleprompter state.
  - Verify with `npx tsc --noEmit` and `npm run build`.

- [x] **Milestone 5: Customizable Sales Skill Modal (`localStorage`)**
  - Create `src/components/SkillModal.tsx` allowing the user to edit `agencyOffer`, `callGoal`, `fillerBridges`, and `objectionMatrix` or reset to default.
  - Persist custom skills in `localStorage`.
  - Run final `npm run build` verification.

- [x] **Milestone 6 (Phase 2): Dual-Channel Audio Capture (Mic + Tab Dialer) & Deepgram Live STT**
  - Create secure Next.js route `src/app/api/deepgram-token/route.ts` returning server-side `process.env.DEEPGRAM_API_KEY`.
  - Create `src/lib/deepgram-dual-stt.ts` capturing Caller Mic via `getUserMedia({ audio: true })` and Dialer Tab Audio via `getDisplayMedia({ video: true, audio: true })`.
  - Use `AudioContext` and `ChannelMergerNode(2)` to merge Mic into Channel 0 (Caller) and Tab Audio into Channel 1 (Client), streaming via `MediaRecorder` to Deepgram Live Nova-2 WebSocket (`multichannel=true&model=nova-2&smart_format=true&endpointing=300`).
  - Upgrade `src/lib/stt-adapter.ts` to support both `'browser'` and `'deepgram-dual'` modes with clean fallback.
  - Update `src/app/page.tsx` with mode toggle, emitting `onFinal(text, speaker)` and auto-triggering `/api/suggest` only when `speaker === 'client'`.
  - Verify with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
