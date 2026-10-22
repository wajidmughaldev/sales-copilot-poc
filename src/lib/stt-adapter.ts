// src/lib/stt-adapter.ts
// Browser Speech-to-Text Adapter � Phase 1 (Web Speech API).
// SPEC.md Section 3: Factory pattern, auto-restart on Chrome silent disconnect.
// Phase 2 NOTE: Swap this file for Deepgram Live WebSocket adapter without
// touching any UI or AI logic � all contracts are isolated here.

// ---------------------------------------------------------------------------
// Public callback contract
// ---------------------------------------------------------------------------
export interface STTCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (err: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

// ---------------------------------------------------------------------------
// Internal adapter type returned by the factory
// ---------------------------------------------------------------------------
export interface STTAdapter {
  start: () => void;
  stop: () => void;
  isSupported: () => boolean;
}

// ---------------------------------------------------------------------------
// Browser SpeechRecognition type shim
// (TypeScript does not ship webkitSpeechRecognition in its lib.dom.d.ts)
// ---------------------------------------------------------------------------
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Retrieve the constructor from the browser window (handles both prefixes)
// ---------------------------------------------------------------------------
function getSpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor =
    (w['SpeechRecognition'] as (new () => BrowserSpeechRecognition) | undefined) ??
    (w['webkitSpeechRecognition'] as (new () => BrowserSpeechRecognition) | undefined) ??
    null;
  return Ctor ?? null;
}

// ---------------------------------------------------------------------------
// Factory � SPEC.md Section 3
// ---------------------------------------------------------------------------
export function createSTTAdapter(callbacks: STTCallbacks): STTAdapter {
  const { onInterim, onFinal, onError, onStatusChange } = callbacks;

  // Guard: SSR / unsupported browser
  const Ctor = getSpeechRecognitionConstructor();

  // shouldBeListening � the single source of truth for desired mic state.
  // When true and Chrome fires onend (e.g., after a pause), we restart
  // recognition within 150ms so the mic never silently drops during a call.
  let shouldBeListening = false;
  let recognition: BrowserSpeechRecognition | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Build a fresh recognition instance and attach all event handlers.
  // Called once on start() and again on each auto-restart.
  // -------------------------------------------------------------------------
  function buildRecognition(): BrowserSpeechRecognition | null {
    if (!Ctor) return null;

    const rec = new Ctor();

    // SPEC.md Section 3 � required flags
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      onStatusChange(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          onFinal(transcript.trim());
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        onInterim(interim.trim());
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is not a true error � Chrome fires it after silence.
      // Do NOT surface it to the caller; let onend handle the restart.
      if (event.error === 'no-speech') return;
      onError(`STT error: ${event.error} � ${event.message ?? ''}`);
    };

    // CRITICAL (SPEC.md �3): If Chrome ends the session while we still want
    // to be listening, schedule an auto-restart within 150ms.
    rec.onend = () => {
      if (shouldBeListening) {
        if (restartTimer) clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          if (shouldBeListening) {
            recognition = buildRecognition();
            try {
              recognition?.start();
            } catch {
              // Ignore restart error if already started
            }
          }
        }, 150);
      } else {
        onStatusChange(false);
      }
    };

    return rec;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  function isSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }

  function start(): void {
    if (!isSupported()) {
      onError('SpeechRecognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (shouldBeListening) return; // Already running � idempotent
    shouldBeListening = true;
    recognition = buildRecognition();
    recognition?.start();
  }

  function stop(): void {
    shouldBeListening = false;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        try { recognition.stop(); } catch {}
      }
      recognition = null;
    }
    onStatusChange(false);
  }

  return { start, stop, isSupported };
}
