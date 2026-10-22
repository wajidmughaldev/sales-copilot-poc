// src/lib/stt-adapter.ts
// Speech-to-Text Adapter - supports Browser Web Speech API (Phase 1)
// and Deepgram Nova-2 Dual-Channel WebSocket (Phase 2).

import type { SpeakerRole } from '../types/index';
import { createDeepgramDualAdapter } from './deepgram-dual-stt';

export type STTMode = 'browser' | 'deepgram-dual';

export interface STTCallbacks {
  onInterim: (text: string, speaker?: SpeakerRole) => void;
  onFinal: (text: string, speaker?: SpeakerRole) => void;
  onError: (err: string) => void;
  onStatusChange: (isListening: boolean) => void;
}

export interface STTAdapter {
  start: () => void | Promise<void>;
  stop: () => void;
  isSupported: () => boolean;
}

export interface STTOptions {
  mode?: STTMode;
}

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

export function createSTTAdapter(callbacks: STTCallbacks, options?: STTOptions): STTAdapter {
  if (options?.mode === 'deepgram-dual') {
    return createDeepgramDualAdapter(callbacks);
  }

  const { onInterim, onFinal, onError, onStatusChange } = callbacks;
  const Ctor = getSpeechRecognitionConstructor();

  let shouldBeListening = false;
  let recognition: BrowserSpeechRecognition | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  function buildRecognition(): BrowserSpeechRecognition | null {
    if (!Ctor) return null;

    const rec = new Ctor();
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
      if (event.error === 'no-speech') return;
      onError(`STT error: ${event.error} - ${event.message ?? ''}`);
    };

    rec.onend = () => {
      if (shouldBeListening) {
        if (restartTimer) clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          if (shouldBeListening) {
            recognition = buildRecognition();
            try {
              recognition?.start();
            } catch {
              // Ignore restart error if already active
            }
          }
        }, 150);
      } else {
        onStatusChange(false);
      }
    };

    return rec;
  }

  function isSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }

  function start(): void {
    if (!isSupported()) {
      onError('SpeechRecognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (shouldBeListening) return;
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
