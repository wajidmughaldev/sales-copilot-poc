// src/components/TeleprompterCard.tsx
// Right panel: filler bridge badges, streaming teleprompter with **bold** punchwords,
// and 4 quick objection trigger buttons.
// SPEC.md Section 5 - Right Panel (60% width).

'use client';

import type { SalesSkill } from '../types/index';

interface Props {
  suggestion: string;
  isStreaming: boolean;
  skill: SalesSkill;
  onObjectionClick: (objection: string) => void;
}

const QUICK_OBJECTIONS = [
  'Busy right now',
  'Send an email',
  'Already have an agency',
  'How much is it?',
] as const;

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="text-yellow-300 font-bold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TeleprompterCard({
  suggestion,
  isStreaming,
  skill,
  onObjectionClick,
}: Props) {
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 w-full mb-1">
          Instant Fillers
        </span>
        {skill.fillerBridges.map((bridge, i) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-default select-none hover:bg-zinc-700 transition-colors"
          >
            {bridge}
          </span>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700 px-8 py-8 min-h-[140px] flex items-center justify-center relative">
          {isStreaming && (
            <span className="absolute top-3 right-4 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 animate-pulse">
              streaming
            </span>
          )}

          {suggestion ? (
            <p className="text-2xl md:text-3xl leading-relaxed text-white font-medium tracking-wide text-center">
              {parseBold(suggestion)}
            </p>
          ) : (
            <p className="text-zinc-600 text-lg text-center">
              AI suggestion will stream here after prospect speaks...
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
          Quick Objection Triggers
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_OBJECTIONS.map((obj) => (
            <button
              key={obj}
              onClick={() => onObjectionClick(obj)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-red-900/60 hover:border-red-600 hover:text-red-200 transition-all active:scale-95"
            >
              {obj}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}