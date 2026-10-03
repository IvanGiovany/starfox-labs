import { encodeMp3 } from "./mp3-encoding";

// The MP3 encoder's Web Worker: a separate thread, so encoding (a second or two
// on a laptop, longer on a phone) doesn't freeze the page and the progress bar
// keeps moving. Started by snippet-encoder.ts.

export type EncodeRequest = { channels: Float32Array[]; sampleRate: number; kbps: number };

export type EncodeMessage = { type: "progress"; fraction: number } | { type: "done"; mp3: Blob } | { type: "failed"; message: string };

// The project's TypeScript setup has the page's types, not a worker's; this is all we use.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<EncodeRequest>) => void) | null;
  postMessage(message: EncodeMessage): void;
};

scope.onmessage = ({ data }) => {
  try {
    const parts = encodeMp3(data.channels, data.sampleRate, data.kbps, (fraction) => scope.postMessage({ type: "progress", fraction }));
    scope.postMessage({ type: "done", mp3: new Blob(parts, { type: "audio/mpeg" }) });
  } catch (error) {
    scope.postMessage({ type: "failed", message: error instanceof Error ? error.message : String(error) });
  }
};
