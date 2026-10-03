import { Mp3Encoder } from "@breezystack/lamejs";

// Encodes a cut snippet as an MP3 with lamejs (the LAME encoder ported to
// JavaScript, LGPL-3.0). Only the encoder worker imports this file, so lamejs
// (about 160 KB) is downloaded only when the snippet cutter is used.

/** Samples per MP3 frame; lamejs is fed blocks of this size. */
const FRAME_SAMPLES = 1152;

/** Web Audio's samples (-1 to 1) as the 16-bit integers lamejs takes; anything louder is clipped. */
export function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out;
}

/**
 * The MP3's bytes, in parts for a Blob. Takes one or two channels: mono is sent
 * as both, so every cut snippet is stereo. `onProgress` gets 0–1 about once per
 * second of audio.
 */
export function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  kbps: number,
  onProgress?: (fraction: number) => void,
): Uint8Array<ArrayBuffer>[] {
  const left = toInt16(channels[0]);
  const right = channels.length > 1 ? toInt16(channels[1]) : left;
  const encoder = new Mp3Encoder(2, sampleRate, kbps);
  const framesPerReport = Math.ceil(sampleRate / FRAME_SAMPLES);
  // lamejs returns Int8Arrays (its types say Uint8Array); Blob wants a Uint8Array.
  const parts = [];
  for (let frame = 0; frame * FRAME_SAMPLES < left.length; frame++) {
    const from = frame * FRAME_SAMPLES;
    const out = encoder.encodeBuffer(left.subarray(from, from + FRAME_SAMPLES), right.subarray(from, from + FRAME_SAMPLES));
    if (out.length) parts.push(new Uint8Array(out));
    if (frame % framesPerReport === 0) onProgress?.(from / left.length);
  }
  parts.push(new Uint8Array(encoder.flush()));
  onProgress?.(1);
  return parts;
}
