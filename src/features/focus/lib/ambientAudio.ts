import type { AmbientSoundKind } from '@/domain/types';

/**
 * Lightweight, dependency-free ambient sound synthesizer using Web Audio API.
 * Never autoplays; only starts when explicitly triggered by user interaction.
 */
export class AmbientSoundPlayer {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  start(kind: AmbientSoundKind) {
    this.stop();
    if (kind === 'none' || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'brown') {
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 2.5;
      } else {
        // Soft filtered rain-like noise
        lastOut = (lastOut + 0.08 * white) / 1.08;
        data[i] = lastOut * 1.4;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.ctx = ctx;
    this.source = source;
    this.gain = gain;
  }

  stop() {
    try {
      this.source?.stop();
      this.source?.disconnect();
      this.gain?.disconnect();
      void this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.source = null;
    this.gain = null;
    this.ctx = null;
  }
}
