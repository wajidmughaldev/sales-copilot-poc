// src/components/SkillModal.tsx
// Edit + persist custom SalesSkill. Reset-to-default button clears localStorage.
// SPEC.md Section 5: Customize Skill Button -> opens this modal.

'use client';

import { useState } from 'react';
import type { SalesSkill, ObjectionRule } from '../types/index';
import { DEFAULT_AGENCY_SKILL } from '../lib/skills';

interface Props {
  skill: SalesSkill;
  onSave: (updated: SalesSkill) => void;
  onClose: () => void;
}

const LS_KEY = 'sales-copilot-skill';

export function loadSkillFromStorage(): SalesSkill {
  if (typeof window === 'undefined') return DEFAULT_AGENCY_SKILL;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SalesSkill) : DEFAULT_AGENCY_SKILL;
  } catch {
    return DEFAULT_AGENCY_SKILL;
  }
}

export function saveSkillToStorage(skill: SalesSkill): void {
  localStorage.setItem(LS_KEY, JSON.stringify(skill));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const TA = 'w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none';
const INP = 'w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500';

export default function SkillModal({ skill, onSave, onClose }: Props) {
  const [form, setForm] = useState<SalesSkill>(skill);
  const [fillerText, setFillerText] = useState(skill.fillerBridges.join('\n'));

  const set = (key: keyof SalesSkill, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setObj = (i: number, key: keyof ObjectionRule, val: string) =>
    setForm((f) => {
      const matrix = [...f.objectionMatrix];
      matrix[i] = { ...matrix[i], [key]: val };
      return { ...f, objectionMatrix: matrix };
    });

  const addObj = () =>
    setForm((f) => ({
      ...f,
      objectionMatrix: [...f.objectionMatrix, { trigger: '', strategy: '' }],
    }));

  const removeObj = (i: number) =>
    setForm((f) => ({
      ...f,
      objectionMatrix: f.objectionMatrix.filter((_, idx) => idx !== i),
    }));

  const handleSave = () => {
    const updated: SalesSkill = {
      ...form,
      fillerBridges: fillerText.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    saveSkillToStorage(updated);
    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem(LS_KEY);
    onSave(DEFAULT_AGENCY_SKILL);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="font-bold text-base text-white">Customize Sales Skill</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">x</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <Field label="Skill Name">
            <input className={INP} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Agency Offer">
            <textarea className={TA} rows={2} value={form.agencyOffer} onChange={(e) => set('agencyOffer', e.target.value)} />
          </Field>
          <Field label="Target Audience">
            <textarea className={TA} rows={2} value={form.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} />
          </Field>
          <Field label="Call Goal">
            <input className={INP} value={form.callGoal} onChange={(e) => set('callGoal', e.target.value)} />
          </Field>
          <Field label="Filler Bridges (one per line)">
            <textarea className={TA} rows={4} value={fillerText} onChange={(e) => setFillerText(e.target.value)} placeholder="Totally hear you on that..." />
          </Field>

          {/* Objection Matrix */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Objection Matrix</label>
              <button onClick={addObj} className="text-xs px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md">+ Add</button>
            </div>
            {form.objectionMatrix.map((obj, i) => (
              <div key={i} className="flex flex-col gap-1.5 bg-zinc-800 rounded-xl p-3 border border-zinc-700">
                <div className="flex items-center gap-2">
                  <input className={INP + ' flex-1'} placeholder="Trigger (e.g. Not interested)" value={obj.trigger} onChange={(e) => setObj(i, 'trigger', e.target.value)} />
                  <button onClick={() => removeObj(i)} className="text-zinc-500 hover:text-red-400 text-sm px-1">x</button>
                </div>
                <textarea className={TA} rows={2} placeholder="Strategy..." value={obj.strategy} onChange={(e) => setObj(i, 'strategy', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700">
          <button onClick={handleReset} className="text-xs px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-900/60 hover:text-red-300 text-zinc-400 border border-zinc-700 transition-colors">
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700">Cancel</button>
            <button onClick={handleSave} className="text-xs px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Save Skill</button>
          </div>
        </div>
      </div>
    </div>
  );
}