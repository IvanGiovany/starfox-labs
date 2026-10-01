// An image's size travels in its URL fragment: ".../abc.webp#2400x1600". The
// part after "#" is never sent to the server, but the article renderer reads
// it to reserve the right space, so the page doesn't jump as images load.
// Uploads from the editor add it (lib/admin/upload-image.ts); any other image
// URL simply has no size and renders as before.

export function withSize(url: string, width: number, height: number): string {
  return `${url.split("#")[0]}#${width}x${height}`;
}

export function readSize(url: string): { src: string; width?: number; height?: number } {
  const match = url.match(/^(.*)#(\d{1,5})x(\d{1,5})$/);
  if (!match) return { src: url };
  return { src: match[1], width: Number(match[2]), height: Number(match[3]) };
}
