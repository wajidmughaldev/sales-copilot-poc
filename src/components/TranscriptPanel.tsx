// src/components/TranscriptPanel.tsx
// Left panel: scrolling Prospect/Caller chat bubbles + live pulsing interim box.
// SPEC.md Section 5 - Left Panel (40% width).

'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptTurn, SpeakerRole } from '../types/index';

interface Props {
  turns: TranscriptTurn[];
  interimText: string;
  speakerRole?: SpeakerRole;
}

export default function TranscriptPanel({ turns, interimText, speakerRole = 'client' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isProspect = speakerRole === 'client';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, interimText]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-700">
      <div className="px-4 py-3 border-b border-zinc-700 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Live Transcript
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {turns.length === 0 && (
          <p className="text-zinc-600 text-sm text-center mt-8">
            Transcript will appear here once the call starts...
          </p>
        )}

        {turns.map((turn) => {
          const isTurnProspect = turn.speaker === 'client';
          return (
            <div
              key={turn.id}
              className={`flex flex-col gap-1 ${isTurnProspect ? 'items-start' : 'items-end'}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {isTurnProspect ? 'Prospect' : 'You'}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isTurnProspect
                    ? 'bg-zinc-700 text-zinc-100 rounded-tl-sm'
                    : 'bg-emerald-700 text-white rounded-tr-sm'
                }`}
              >
                {turn.text}
              </div>
            </div>
          );
        })}

        {interimText && (
          <div className={`flex flex-col gap-1 ${isProspect ? 'items-start' : 'items-end'}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {isProspect ? 'Prospect (live)' : 'You (typing...)'}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-pulse ${
                isProspect
                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-600 rounded-tl-sm'
                  : 'bg-emerald-950/80 text-emerald-200 border border-emerald-600/60 rounded-tr-sm'
              }`}
            >
              {interimText}
              <span className="ml-1 inline-block w-1.5 h-3.5 bg-zinc-400 animate-pulse align-middle" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}