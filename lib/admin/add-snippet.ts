import { mediaPath } from "@/lib/media";
import { checkSnippetDuration, checkSnippetFile, SNIPPET_RULES, SnippetError } from "./snippet-rules";
import { UploadError, uploadToMedia } from "./upload-media";

// A ready-made audio snippet, from a file Ivan picks or drops: checked in the
// browser (type, size, then the real length, read by decoding the audio), then
// uploaded to media/music/. The server checks the stored file again on save.

export type AddedSnippet = { path: string; seconds: number; bytes: number };

/**
 * The clip's length in seconds, by decoding it with Web Audio: the same decoder
 * the snippet cutter uses, and it also proves the browser can play the file.
 * Files are at most 2 MB (checked first), so decoding is quick.
 */
export async function readAudioDuration(file: Blob): Promise<number> {
  const context = new OfflineAudioContext(1, 1, 44_100);
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    return audio.duration;
  } catch {
    throw new SnippetError("Couldn't read this file as audio. It may be damaged; try exporting it again.");
  }
}

export async function addSnippetFile(file: File): Promise<AddedSnippet> {
  const extension = checkSnippetFile(file);
  const seconds = await readAudioDuration(file);
  checkSnippetDuration(seconds);
  const path = mediaPath("music", extension);
  await uploadToMedia(path, file, SNIPPET_RULES.types[extension]);
  return { path, seconds, bytes: file.size };
}

/** Messages from our own checks are already plain sentences; anything else gets a generic one. */
export function snippetErrorMessage(error: unknown): string {
  return error instanceof SnippetError || error instanceof UploadError ? error.message : "Something went wrong with that file. Try again.";
}
