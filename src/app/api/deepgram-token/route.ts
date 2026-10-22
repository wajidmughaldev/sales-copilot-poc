// src/app/api/deepgram-token/route.ts
// Secure endpoint that provides Deepgram API access for Phase 2 Live WebSocket STT.
// Never exposes secret key in client bundle via NEXT_PUBLIC_.

import { NextResponse } from 'next/server';

export async function GET() {
  const rawKey = (process.env.DEEPGRAM_API_KEY ?? '').trim();
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();

  if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY is not configured in .env.local' },
      { status: 400 }
    );
  }

  return NextResponse.json({ key: apiKey });
}
