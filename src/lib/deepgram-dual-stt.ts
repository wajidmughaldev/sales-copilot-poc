// src/lib/deepgram-dual-stt.ts
// Phase 2: Dual-Channel Audio Capture (Mic + Browser Tab Dialer) via Deepgram Nova-2 WebSocket.
// Channel 0 = Caller (Mic), Channel 1 = Client (Dialer Tab Audio).

import type { SpeakerRole } from '../types/index';
import type { STTCallbacks, STTAdapter } from './stt-adapter';

const DEEPGRAM_WS_URL =
  'wss://api.deepgram.com/v1/listen?multichannel=true&model=nova-2&smart_format=true&endpointing=300';

export function createDeepgramDualAdapter(callbacks: STTCallbacks): STTAdapter {
  const { onInterim, onFinal, onError, onStatusChange } = callbacks;

  let socket: WebSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let audioCtx: AudioContext | null = null;
  let micStream: MediaStream | null = null;
  let tabStream: MediaStream | null = null;
  let active = false;

  function cleanup() {
    active = false;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
    recorder = null;

    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.close(); } catch {}
    }
    socket = null;

    micStream?.getTracks().forEach((t) => t.stop());
    tabStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    tabStream = null;

    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch {}
    }
    audioCtx = null;
    onStatusChange(false);
  }

  async function start() {
    if (active) return;
    active = true;

    try {
      // 1. Fetch token securely from Next.js server route
      const tokenRes = await fetch('/api/deepgram-token');
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to retrieve Deepgram token');
      }
      const { key } = await tokenRes.json();

      // 2. Capture Caller's Mic (Channel 0)
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Capture Dialer Tab Audio (Channel 1)
      tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const tabAudioTracks = tabStream.getAudioTracks();
      if (tabAudioTracks.length === 0) {
        throw new Error('No tab audio detected. Make sure you check "Share tab audio".');
      }

      // Handle user clicking "Stop sharing" on the browser native banner
      tabStream.getVideoTracks().forEach((t) => t.addEventListener('ended', cleanup));
      tabAudioTracks.forEach((t) => t.addEventListener('ended', cleanup));

      // 4. Merge channels with Web Audio API
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtxClass();

      const micSource = audioCtx.createMediaStreamSource(micStream);
      const tabSource = audioCtx.createMediaStreamSource(new MediaStream([tabAudioTracks[0]]));

      // ChannelMergerNode: Input 0 -> Channel 0, Input 1 -> Channel 1
      const merger = audioCtx.createChannelMerger(2);
      micSource.connect(merger, 0, 0); // Caller
      tabSource.connect(merger, 0, 1); // Client

      const dest = audioCtx.createMediaStreamDestination();
      dest.channelCount = 2;
      merger.connect(dest);

      // 5. Connect to Deepgram Live Streaming WebSocket
      socket = new WebSocket(DEEPGRAM_WS_URL, ['token', key]);

      socket.onopen = () => {
        onStatusChange(true);
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        recorder = new MediaRecorder(dest.stream, { mimeType: mime });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        recorder.start(100); // 100ms low-latency audio slices
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const channelIdx = data.channel_index?.[0] ?? 0;
          const speaker: SpeakerRole = channelIdx === 0 ? 'caller' : 'client';
          const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
          if (!transcript) return;

          if (data.is_final) {
            onFinal(transcript, speaker);
          } else {
            onInterim(transcript, speaker);
          }
        } catch {}
      };

      socket.onerror = () => {
        onError('Deepgram WebSocket connection error.');
      };

      socket.onclose = () => {
        cleanup();
      };
    } catch (err: unknown) {
      cleanup();
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
    }
  }

  function stop() {
    cleanup();
  }

  function isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!navigator?.mediaDevices?.getUserMedia &&
      !!navigator?.mediaDevices?.getDisplayMedia &&
      !!(window.AudioContext || (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext)
    );
  }

  return { start, stop, isSupported };
}
