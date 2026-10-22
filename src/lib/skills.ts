// src/lib/skills.ts
// Default Sales Skill + System Prompt Builder for the AI Sales Copilot POC.
// SPEC.md Section 4: Spoken-English rules - 35-word max, bold punchwords, contractions, closing question.

import type { SalesSkill, CallStage } from '../types/index';

// ---------------------------------------------------------------------------
// Default B2B Digital Agency Cold-Calling Skill
// ---------------------------------------------------------------------------
export const DEFAULT_AGENCY_SKILL: SalesSkill = {
  id: 'default-b2b-agency',
  name: 'B2B Digital Agency - Lead Gen & Paid Ads',

  agencyOffer:
    'Done-for-you paid-ads management (Google + Meta) combined with AI-powered lead follow-up sequences that turn cold clicks into booked sales calls within 48 hours.',

  targetAudience:
    'B2B service companies (consultants, coaches, SaaS, professional services) with 5-50 employees actively spending on paid traffic but frustrated with low conversion rates.',

  callGoal: 'Book a 15-minute discovery Zoom call within the next 5 business days.',

  toneRules: [
    'Sound like a confident peer, not a pitchy salesperson.',
    'Use contractions naturally - we\'re, that\'s, I\'ll, you\'ve.',
    'Never read from a script - ask one question at a time.',
    'Acknowledge the prospect\'s reality before pivoting to value.',
    'Keep every spoken suggestion under 35 words.',
  ],

  fillerBridges: [
    'Totally hear you on that...',
    'Good question, honestly...',
    'Yeah, that makes sense...',
    'Right, so what we\'ve seen is...',
    'Fair enough - and that\'s actually why I called...',
  ],

  objectionMatrix: [
    {
      trigger: 'Not interested / busy right now',
      strategy:
        'Acknowledge respect for their time, ask for exactly 25 seconds to share one number, then pivot to their biggest paid-traffic pain.',
    },
    {
      trigger: 'Send me an email',
      strategy:
        'Agree warmly, but ask one qualifying question first so the email is actually relevant - "just so I send the right thing, are you running ads currently?"',
    },
    {
      trigger: 'We already have an agency',
      strategy:
        'Validate their existing setup, then ask how satisfied they are with their cost-per-lead - create a wedge with a benchmark number.',
    },
    {
      trigger: 'How much does it cost?',
      strategy:
        'Deflect price to value: acknowledge it\'s a fair question, but reframe around ROI - "depends on your ad spend; our clients average 4x return - worth 15 mins to see if that\'s realistic for you?"',
    },
    {
      trigger: 'We do it in-house',
      strategy:
        'Compliment their initiative, then ask one probing question about their current cost-per-acquisition versus their target - expose the gap naturally.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Stage-specific context injected into the system prompt
// ---------------------------------------------------------------------------
const STAGE_CONTEXT: Record<CallStage, string> = {
  opener:
    'You\'re opening the cold call. Your ONLY goal is to earn 25 more seconds - not to pitch.',
  discovery:
    'You\'re uncovering pain. Ask one sharp question about their current lead flow or ad performance.',
  pitch:
    'You\'ve earned the right to pitch. Deliver ONE concrete result your agency achieved, then check in.',
  objection_handling:
    'The prospect just raised an objection. Acknowledge it warmly, then redirect with a question.',
  closing:
    'You\'re going for the meeting. Make booking a 15-minute Zoom feel completely low-risk.',
};

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------
export function buildSystemPrompt(skill: SalesSkill, stage: CallStage): string {
  const stageCtx = STAGE_CONTEXT[stage];

  return [
    `You are a real-time AI teleprompter for a cold caller selling: ${skill.agencyOffer}.`,
    `Target audience: ${skill.targetAudience}.`,
    `Call goal: ${skill.callGoal}.`,
    '',
    `Current stage: ${stageCtx}`,
    '',
    'OUTPUT RULES - follow every rule without exception:',
    '1. Maximum 2 sentences. Absolute hard cap: 35 words total.',
    '2. Use natural spoken contractions: we\'re, that\'s, I\'ll, you\'ve, don\'t.',
    '3. MANDATORY: You MUST wrap 2 to 4 key punchwords in **bold** (e.g. "**Totally** fair", "**40%** ROI", "**booked** calls"). Never omit the ** asterisks.',
    '4. Always end with a low-friction closing question (e.g., "Fair enough?" / "Sound interesting, or totally off base?").',
    '5. Output ONLY the exact words the caller should speak next.',
    '   - No preamble. No quotation marks. No stage directions. No explanations.',
    '',
    `Tone rules for this skill: ${(skill.toneRules ?? DEFAULT_AGENCY_SKILL.toneRules).join(' | ')}`,
  ].join('\n');
}
