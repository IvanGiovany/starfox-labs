import { ImageError, type ImageUse } from "./image-rules";

// Browser side of "paste image URL": asks the server to import the image
// (app/admin/media/import/route.ts) and returns our own copy's URL.

export async function importImageFromUrl(url: string, use: ImageUse): Promise<{ url: string; width: number; height: number }> {
  let response: Response;
  try {
    response = await fetch("/admin/media/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, use }),
      // A signed-out request is redirected to /login by proxy.ts; don't follow it.
      redirect: "manual",
    });
  } catch {
    throw new ImageError("Couldn't reach the server. Check your connection.");
  }
  if (response.type === "opaqueredirect") {
    throw new ImageError("Your sign-in has expired. Save your work, then reload to sign in again.");
  }

  const data = (await response.json().catch(() => null)) as { url?: string; width?: number; height?: number; error?: string } | null;
  if (!response.ok || !data?.url || !data.width || !data.height) {
    throw new ImageError(data?.error ?? "Something went wrong importing that image. Try again.");
  }
  return { url: data.url, width: data.width, height: data.height };
}
