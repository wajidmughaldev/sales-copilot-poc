// src/app/page.tsx
// Cold Caller Cockpit - wires STT -> transcript -> /api/suggest -> teleprompter.
// SPEC.md Section 5: Top Bar, Split-Screen (40/60), Stage pills, Speaker toggle, Skill modal.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import TranscriptPanel from '../components/TranscriptPanel';
import TeleprompterCard from '../components/TeleprompterCard';
import SkillModal, { loadSkillFromStorage, saveSkillToStorage } from '../components/SkillModal';
import { createSTTAdapter } from '../lib/stt-adapter';
import type { TranscriptTurn, CallStage, SpeakerRole, SalesSkill } from '../types/index';

const STAGES: { label: string; value: CallStage }[] = [
  { label: 'Opener', value: 'opener' },
  { label: 'Discovery', value: 'discovery' },
  { label: 'Pitch', value: 'pitch' },
  { label: 'Objection', value: 'objection_handling' },
  { label: 'Close', value: 'closing' },
];

function makeId() { return Math.random().toString(36).slice(2, 9); }

export default function CopilotPage() {
  const [skill, setSkill] = useState<SalesSkill>(loadSkillFromStorage);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [interimText, setInterimText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [stage, setStage] = useState<CallStage>('opener');
  const [speakerRole, setSpeakerRole] = useState<SpeakerRole>('client');
  const [manualInput, setManualInput] = useState('');
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const sttRef = useRef<ReturnType<typeof createSTTAdapter> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestion = useCallback(
    async (latestTurns: TranscriptTurn[]) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setSuggestion('');
      setIsStreaming(true);
      try {
        const res = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turns: latestTurns, skill, currentStage: stage }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const errText = await res.text();
          setSuggestion(`⚠️ Suggestion error (${res.status}): ${errText}`);
          return;
        }
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          if (ctrl.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done || ctrl.signal.aborted) break;
          setSuggestion((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      } finally {
        if (abortRef.current === ctrl) setIsStreaming(false);
      }
    },
    [skill, stage]
  );

  const appendTurn = useCallback(
    (text: string, speaker: SpeakerRole) => {
      const turn: TranscriptTurn = { id: makeId(), speaker, text, timestamp: Date.now() };
      setTurns((prev) => {
        const next = [...prev, turn];
        if (speaker === 'client') fetchSuggestion(next);
        return next;
      });
      setInterimText('');
    },
    [fetchSuggestion]
  );

  useEffect(() => {
    sttRef.current = createSTTAdapter({
      onInterim: setInterimText,
      onFinal: (text) => appendTurn(text, speakerRole),
      onError: (err) => console.error('[STT]', err),
      onStatusChange: setIsListening,
    });
  }, [appendTurn, speakerRole]);

  const toggleMic = () => {
    if (!sttRef.current) return;
    isListening ? sttRef.current.stop() : sttRef.current.start();
  };

  const submitManual = () => {
    const text = manualInput.trim();
    if (!text) return;
    appendTurn(text, speakerRole);
    setManualInput('');
    setInterimText('');
  };

  const handleObjection = useCallback(
    (obj: string) => appendTurn(obj, 'client'),
    [appendTurn]
  );

  const handleSaveSkill = useCallback((updated: SalesSkill) => {
    saveSkillToStorage(updated);
    setSkill(updated);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* TOP BAR */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex-wrap">
        <span className="font-bold text-sm text-emerald-400 tracking-tight mr-1">Sales Copilot</span>

        <button id="btn-mic-toggle" onClick={toggleMic}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${isListening ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>

        <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded ${isListening ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
          {isListening ? 'Listening' : 'Paused'}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {(['client', 'caller'] as SpeakerRole[]).map((role) => (
            <button key={role} onClick={() => setSpeakerRole(role)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${speakerRole === role ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {role === 'client' ? 'Input: Prospect' : 'Input: Me'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {STAGES.map((s) => (
            <button key={s.value} onClick={() => setStage(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${stage === s.value ? 'bg-yellow-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input id="input-manual-text" type="text" value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              setInterimText(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder="Type to simulate speech..."
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 w-44 focus:outline-none focus:border-indigo-500" />
          <button id="btn-submit-manual" onClick={submitManual}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">Send</button>
          <button id="btn-customize-skill" onClick={() => setSkillModalOpen(true)}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-semibold rounded-lg transition-colors border border-zinc-600">
            Customize Skill
          </button>
        </div>
      </header>

      {/* SPLIT PANELS */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 overflow-hidden">
          <TranscriptPanel turns={turns} interimText={interimText} speakerRole={speakerRole} />
        </div>
        <div className="w-3/5 overflow-hidden">
          <TeleprompterCard suggestion={suggestion} isStreaming={isStreaming} skill={skill} onObjectionClick={handleObjection} />
        </div>
      </div>

      {/* SKILL MODAL */}
      {skillModalOpen && (
        <SkillModal skill={skill} onSave={handleSaveSkill} onClose={() => setSkillModalOpen(false)} />
      )}
    </div>
  );
}