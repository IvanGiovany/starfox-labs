import type { EncodeMessage, EncodeRequest } from "./mp3-encoder.worker";
import { CUT_RULES, SnippetError } from "./snippet-rules";

// The page's side of the MP3 encoder. The worker (and lamejs with it) starts
// when the cutter opens, so it has downloaded by the time Ivan has picked his
// part, and it's never downloaded otherwise. One snippet is encoded at a time.

/** encode() was cancelled: by a newer encode, cancel() or close(). Not an error to show. */
export class EncodeCancelled extends Error {}

export type SnippetEncoder = {
  /** The snippet (channels at CUT_RULES.sampleRate) as an MP3. `onProgress` gets 0–1. */
  encode(channels: Float32Array[], onProgress?: (fraction: number) => void): Promise<Blob>;
  /** Stops the encode in progress, if any. */
  cancel(): void;
  /** Stops the worker (the cutter closed). A later encode() starts a new one. */
  close(): void;
};

export function createSnippetEncoder(): SnippetEncoder {
  let worker: Worker | null = null;
  let pending: { reject: (error: Error) => void } | null = null;

  function start(): Worker {
    if (!worker) {
      worker = new Worker(new URL("./mp3-encoder.worker.ts", import.meta.url), { type: "module" });
      // Usually the worker's code failed to download (offline). The next encode tries again.
      worker.onerror = (event) => {
        event.preventDefault();
        stop(new SnippetError("Couldn't start the MP3 encoder. Check your connection and try again."));
      };
    }
    return worker;
  }

  /** Ending the worker is the only way to stop it mid-encode. */
  function stop(reason: Error) {
    worker?.terminate();
    worker = null;
    const job = pending;
    pending = null;
    job?.reject(reason);
  }

  start();

  return {
    encode(channels, onProgress) {
      if (pending) stop(new EncodeCancelled());
      const current = start();
      return new Promise<Blob>((resolve, reject) => {
        const job = { reject };
        pending = job;
        current.onmessage = (event: MessageEvent<EncodeMessage>) => {
          if (pending !== job) return;
          const message = event.data;
          if (message.type === "progress") return onProgress?.(message.fraction);
          pending = null;
          if (message.type === "done") resolve(message.mp3);
          else reject(new SnippetError("Couldn't make the MP3. Try again, or upload a ready-made snippet."));
        };
        // Copied, not transferred: the cutter keeps its arrays for the preview.
        const request: EncodeRequest = { channels, sampleRate: CUT_RULES.sampleRate, kbps: CUT_RULES.kbps };
        current.postMessage(request);
      });
    },
    cancel() {
      if (pending) stop(new EncodeCancelled());
    },
    close() {
      stop(new EncodeCancelled());
    },
  };
}
