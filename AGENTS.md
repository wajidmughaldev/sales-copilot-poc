# AGENTS.md — AI Coding Agent Constitution & Guardrails

## 1. Executable Commands (Run These First)
- **Install dependencies:** `npm install`
- **Start local dev server:** `npm run dev`
- **Type-check (MUST pass before finishing any task):** `npx tsc --noEmit`
- **Production build check:** `npm run build`
- **Lint check:** `npm run lint`

## 2. Project Identity & Scope (POC Phase 1)
We are building a **Real-Time AI Sales Copilot (Live Teleprompter)** POC for outbound cold callers.
- **Current Phase:** Phase 1 (100% Free Browser-Native Speech-to-Text Validation).
- **Core Loop:**
  1. Capture microphone speech via browser `webkitSpeechRecognition`.
  2. Treat incoming speech in Phase 1 as the **Prospect/Client** speaking (with a manual UI toggle to switch speaker role if needed).
  3. When a sentence completes (`onFinal`), append it to the live transcript and immediately send the last 6 conversation turns + the active `SalesSkill` JSON to `/api/suggest`.
  4. Stream the LLM response (Groq Llama-3.3-70B or Gemini 2.5 Flash) via Server-Sent Events (SSE) into a high-contrast Teleprompter UI card so the human caller can read it aloud effortlessly in under 800ms.
- **Phase 2 Prep:** Speech-to-Text MUST be isolated inside `src/lib/stt-adapter.ts` so we can swap in Deepgram Live WebSockets (Mic + Browser Tab Audio) in Phase 2 without changing any UI or AI logic.

## 3. Strict Tech Stack (With Versions)
- **Framework:** Next.js (App Router, React 19, TypeScript 5+) — Single repository only.
- **Styling:** Tailwind CSS only (High-contrast dark mode UI optimized for fast eye scanning).
- **State Management:** Native React hooks (`useState`, `useReducer`, `useRef`, `useCallback`).
- **Storage:** `localStorage` for custom Sales Skills in POC. Zero databases, zero auth.
- **LLM Integration:** Native `fetch` streaming against Groq (`https://api.groq.com/openai/v1/chat/completions`) or Google Gemini API inside Next.js Route Handler (`src/app/api/suggest/route.ts`).

## 4. Three-Tier Boundaries (Always / Ask First / Never)
### ALWAYS DO:
- Read `AGENTS.md`, `SPEC.md`, `PLAN.md`, and `MEMORY.md` before writing any code.
- Implement ONLY the single active milestone requested from `PLAN.md`.
- Run `npx tsc --noEmit` after editing files to ensure zero TypeScript errors.
- Keep every source file under **200 lines of code**. Split helpers if a file grows larger.
- Update `MEMORY.md` at the end of every completed milestone.

### ASK FIRST BEFORE:
- Running `npm install` for ANY new package or third-party dependency.
- Modifying the directory structure defined in `SPEC.md`.
- Changing API route contracts or TypeScript interfaces in `src/types/index.ts`.

### NEVER DO:
- **NEVER expose API keys on the client:** Never use `NEXT_PUBLIC_` for `GROQ_API_KEY`, `GEMINI_API_KEY`, or `DEEPGRAM_API_KEY`.
- **NEVER read, print, or commit `.env` or `.env.local` files.**
- **NEVER add unrequested features:** No login/signup pages, no Prisma/Supabase databases, no Redux/Zustand, no multi-page routing, no billing screens.
- **NEVER put `webkitSpeechRecognition` directly inside React components:** It MUST live inside `src/lib/stt-adapter.ts`.
