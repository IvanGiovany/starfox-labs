import type { Root } from "hast";

// Browser side of the live preview: sends the body to /admin/writing/preview
// and gets back the rendered HTML tree. Pass an AbortSignal and abort it when
// newer text comes along, so only the latest preview is ever shown.

export type PreviewResult = { ok: true; tree: Root } | { ok: false; error: string };

export async function fetchPreview(bodyMd: string, signal: AbortSignal): Promise<PreviewResult> {
  let response: Response;
  try {
    response = await fetch("/admin/writing/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyMd }),
      signal,
      // A signed-out request is redirected to /login by proxy.ts; don't follow it.
      redirect: "manual",
    });
  } catch (error) {
    if (signal.aborted) throw error; // replaced by a newer request: the caller ignores it
    return { ok: false, error: "Couldn't reach the server for the preview. Check your connection." };
  }

  if (response.type === "opaqueredirect" || response.status === 401) {
    return { ok: false, error: "Your sign-in has expired. Save your work, then reload to sign in again." };
  }
  if (!response.ok) {
    const message = await response
      .json()
      .then((data: { error?: string }) => data.error)
      .catch(() => undefined);
    return { ok: false, error: message ?? "The preview couldn't be rendered. Try again in a moment." };
  }
  return { ok: true, tree: ((await response.json()) as { tree: Root }).tree };
}
