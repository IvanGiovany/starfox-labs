import { CUT_RULES } from "./snippet-rules";

// The snippet cutter's arithmetic, on plain arrays of samples (one Float32Array
// per channel, as Web Audio decodes them), so it can be tested without a
// browser: the waveform, the length and position of the window, finding the
// loudest part, and the cut itself with its fades.

/** The window moves in tenths of a second, and the loudest part is found at that resolution. */
const STEP_SECONDS = 0.1;

/** The snippet's length: whole seconds from 20 to 30, and never longer than the track. */
export function snippetLength(requested: number, trackSeconds: number): number {
  const longest = Math.min(CUT_RULES.maxSeconds, Math.floor(trackSeconds));
  return Math.max(CUT_RULES.minSeconds, Math.min(longest, Math.round(requested)));
}

/** Where the window starts: rounded to a tenth of a second, and kept inside the track. */
export function clampStart(start: number, length: number, trackSeconds: number): number {
  const latest = Math.max(0, trackSeconds - length);
  const rounded = Number.isFinite(start) ? Math.round(start / STEP_SECONDS) * STEP_SECONDS : 0;
  // Rounding to tenths in floating point leaves tails like 0.30000000000000004.
  return Math.min(Math.max(0, Number(rounded.toFixed(1))), latest);
}

/**
 * The waveform: the loudest sample (0–1) in each of `buckets` equal slices of
 * the track, across all channels.
 */
export function trackPeaks(channels: Float32Array[], buckets: number): Float32Array {
  const length = channels[0]?.length ?? 0;
  const peaks = new Float32Array(buckets);
  if (!length) return peaks;
  for (let bucket = 0; bucket < buckets; bucket++) {
    const from = Math.floor((bucket * length) / buckets);
    const to = Math.min(length, Math.max(from + 1, Math.floor(((bucket + 1) * length) / buckets)));
    let peak = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) {
        const value = Math.abs(data[i]);
        if (value > peak) peak = value;
      }
    }
    peaks[bucket] = Math.min(1, peak);
  }
  return peaks;
}

/**
 * How loud each tenth of a second is (its mean square, across all channels).
 * Worked out once per track; loudestStart then finds the loudest window of any length.
 */
export function blockLoudness(channels: Float32Array[], sampleRate: number): Float64Array {
  const length = channels[0]?.length ?? 0;
  const blockSize = Math.round(sampleRate * STEP_SECONDS);
  const loudness = new Float64Array(Math.ceil(length / blockSize));
  for (let block = 0; block < loudness.length; block++) {
    const from = block * blockSize;
    const to = Math.min(length, from + blockSize);
    let sum = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) sum += data[i] * data[i];
    }
    loudness[block] = sum / ((to - from) * channels.length);
  }
  return loudness;
}

/**
 * Where the loudest `length` seconds of the track start (the earliest, if
 * several are as loud): usually the chorus, so a good first guess.
 */
export function loudestStart(loudness: Float64Array, length: number, trackSeconds: number): number {
  const windowBlocks = Math.round(length / STEP_SECONDS);
  if (windowBlocks >= loudness.length) return 0;
  let sum = 0;
  for (let i = 0; i < windowBlocks; i++) sum += loudness[i];
  let best = sum;
  let bestBlock = 0;
  for (let i = windowBlocks; i < loudness.length; i++) {
    sum += loudness[i] - loudness[i - windowBlocks];
    // A running sum drifts by tiny amounts, which mustn't decide a tie.
    if (sum > best * (1 + 1e-9)) {
      best = sum;
      bestBlock = i - windowBlocks + 1;
    }
  }
  return clampStart(bestBlock * STEP_SECONDS, length, trackSeconds);
}

/**
 * The snippet: `length` seconds from `start`, faded in and out, as new arrays
 * (the track's own are left alone). The preview plays exactly this, and it's
 * what gets encoded. Keeps at most two channels, since an MP3 has no more.
 */
export function cutSnippet(channels: Float32Array[], sampleRate: number, start: number, length: number): Float32Array[] {
  const from = Math.round(start * sampleRate);
  const count = Math.round(length * sampleRate);
  const fadeIn = Math.round(CUT_RULES.fadeInSeconds * sampleRate);
  const fadeOut = Math.round(CUT_RULES.fadeOutSeconds * sampleRate);
  return channels.slice(0, 2).map((data) => {
    const snippet = data.slice(from, from + count);
    const last = snippet.length - 1;
    for (let i = 0; i < Math.min(fadeIn, snippet.length); i++) snippet[i] *= fadeGain(i / fadeIn);
    for (let i = 0; i < Math.min(fadeOut, snippet.length); i++) snippet[last - i] *= fadeGain(i / fadeOut);
    return snippet;
  });
}

/** From 0 to 1 along half a cosine: it starts and ends gently, so neither end clicks. */
function fadeGain(progress: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * progress);
}

/** 83.5 → "1:23.5": a position in the track, to a tenth of a second. */
export function formatPosition(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const minutes = Math.floor(tenths / 600);
  return `${minutes}:${((tenths % 600) / 10).toFixed(1).padStart(4, "0")}`;
}

/** A typed position: "1:23.5", "1:23", "83.5" or "83" (a comma works as the decimal point too). Null if it isn't one. */
export function parsePosition(text: string): number | null {
  const match = text.trim().replace(",", ".").match(/^(?:(\d+):)?(\d+(?:\.\d*)?)$/);
  if (!match) return null;
  const seconds = Number(match[2]);
  if (match[1] !== undefined && seconds >= 60) return null;
  return Number(match[1] ?? 0) * 60 + seconds;
}
