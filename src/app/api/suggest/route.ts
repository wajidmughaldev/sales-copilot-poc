// src/app/api/suggest/route.ts
// Streaming POST Route Handler - AI Sales Copilot suggestion engine.
// SPEC.md Section 4: Groq Llama-3.3-70b, stream:true, max 6 turns, 500-char cap.
// SECURITY: GROQ_API_KEY is server-side only - never use NEXT_PUBLIC_ prefix.

import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '../../../lib/skills';
import type { SuggestRequestPayload, TranscriptTurn } from '../../../types/index';



const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PLACEHOLDER = 'your_groq_api_key_here';

function hasValidApiKey(): boolean {
  const key = process.env.GROQ_API_KEY ?? '';
  return key.length > 0 && key !== PLACEHOLDER;
}

function sanitiseTurns(turns: TranscriptTurn[]): TranscriptTurn[] {
  return turns.slice(-6).map((t) => ({ ...t, text: t.text.slice(0, 500) }));
}

function turnsToMessages(turns: TranscriptTurn[]) {
  return turns.map((t) => ({
    role: t.speaker === 'client' ? 'user' : 'assistant',
    content: t.text,
  }));
}

function createMockStream(): ReadableStream<Uint8Array> {
  const mockResponse =
    "We've helped **B2B teams** cut cost-per-lead by **40%** in 60 days... sound worth a quick look?";
  const words = mockResponse.split(' ');
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index >= words.length) {
        controller.close();
        return;
      }
      const chunk = (index === 0 ? '' : ' ') + words[index];
      controller.enqueue(encoder.encode(chunk));
      index++;
      await new Promise((r) => setTimeout(r, 80));
    },
  });
}

function createGroqStream(groqStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = groqStream.getReader();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: {
                  content?: string;
                  reasoning_content?: string;
                };
              }>;
            };
            const delta = parsed.choices?.[0]?.delta;
            const token = delta?.content ?? delta?.reasoning_content;
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          } catch {
            // Malformed SSE chunk - skip silently
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let payload: SuggestRequestPayload;

  try {
    payload = (await req.json()) as SuggestRequestPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!Array.isArray(payload?.turns) || !payload?.skill || !payload?.currentStage) {
    return new Response('Missing required fields: turns, skill, currentStage', { status: 422 });
  }

  const sanitisedTurns = sanitiseTurns(payload.turns);
  const systemPrompt = buildSystemPrompt(payload.skill, payload.currentStage);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...turnsToMessages(sanitisedTurns),
  ];

  if (!hasValidApiKey()) {
    return new Response(createMockStream(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Source': 'mock' },
    });
  }

  const rawKey = (process.env.GROQ_API_KEY ?? '').trim();
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();

  async function callGroq(modelName: string) {
    return fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.4,
        max_tokens: 120,
        stream: true,
        messages,
      }),
    });
  }

  const candidateModels = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  let groqRes: Response | null = null;
  for (const model of candidateModels) {
    const res = await callGroq(model);
    if (res.status !== 404) {
      groqRes = res;
      break;
    }
  }

  if (!groqRes) {
    groqRes = await callGroq('qwen/qwen3.8-27b');
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text();
    console.error(`[Groq API error ${groqRes.status}]`, errText);
    return new Response(`Groq API error: ${groqRes.status} - ${errText}`, { status: 502 });
  }

  if (!groqRes.body) {
    return new Response('Groq returned an empty body', { status: 502 });
  }

  return new Response(createGroqStream(groqRes.body), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Source': 'groq' },
  });
}