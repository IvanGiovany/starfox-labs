// Pulls the 11-character video ID out of the YouTube URL formats people paste:
//   https://www.youtube.com/watch?v=ID      https://youtu.be/ID
//   https://www.youtube.com/shorts/ID       https://www.youtube.com/embed/ID
//   https://www.youtube.com/live/ID         (with or without extra ?t=… params)
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;

  if (host === "youtu.be") id = parsed.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      parsed.searchParams.get("v") ??
      parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ??
      null;
  }

  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
