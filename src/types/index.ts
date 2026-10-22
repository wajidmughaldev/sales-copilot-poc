// src/types/index.ts
// All TypeScript interfaces & contracts for the AI Sales Copilot POC.
// WARNING: Do NOT modify without also updating SPEC.md Section 2.

export type SpeakerRole = 'client' | 'caller';

export type CallStage =
  | 'opener'
  | 'discovery'
  | 'pitch'
  | 'objection_handling'
  | 'closing';

export interface TranscriptTurn {
  id: string;
  speaker: SpeakerRole;
  text: string;
  timestamp: number;
}

export interface ObjectionRule {
  trigger: string;      // e.g., "Not interested / busy"
  strategy: string;     // e.g., "Acknowledge, ask for 25 seconds, pivot to core pain"
}

export interface SalesSkill {
  id: string;
  name: string;
  agencyOffer: string;  // What we sell
  targetAudience: string;
  callGoal: string;     // e.g., "Book a 15-minute discovery Zoom call"
  toneRules: string[];
  fillerBridges: string[]; // Instant natural phrases caller can say while AI loads
  objectionMatrix: ObjectionRule[];
}

export interface SuggestRequestPayload {
  turns: TranscriptTurn[]; // Max last 6 turns
  skill: SalesSkill;
  currentStage: CallStage;
}
