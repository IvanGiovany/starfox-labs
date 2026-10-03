import { checkTrackDuration, checkTrackFile, CUT_RULES, SnippetError } from "./snippet-rules";

// The full track for the snippet cutter: checked, then decoded in the browser.
// It's never uploaded; only the snippet cut from it is.

export type DecodedTrack = {
  /**
   * One or two channels of samples at CUT_RULES.sampleRate. Any further channels
   * are left out, since an MP3 has at most two.
   */
  channels: Float32Array[];
  seconds: number;
};

export async function decodeTrack(file: File): Promise<DecodedTrack> {
  checkTrackFile(file);
  // Decoding resamples to the context's rate, so the cut is already at the encoder's.
  const context = new OfflineAudioContext(1, 1, CUT_RULES.sampleRate);
  let audio: AudioBuffer;
  try {
    audio = await context.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new SnippetError("Couldn't read this file as audio. Export the song as an MP3 or WAV and try again.");
  }
  checkTrackDuration(audio.duration);
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < Math.min(2, audio.numberOfChannels); channel++) channels.push(audio.getChannelData(channel));
  return { channels, seconds: audio.duration };
}
