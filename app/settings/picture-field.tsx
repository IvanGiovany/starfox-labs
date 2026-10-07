"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { AVATAR_CACHE_SECONDS, AVATARS_BUCKET, newAvatarPath } from "@/lib/avatars";
import { prepareAvatar, type PreparedImage } from "@/lib/images/prepare";
import { ImageError } from "@/lib/images/rules";
import { announceProfileChange } from "@/lib/profile-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { removePicture, savePicture } from "./actions";

// The profile picture: pick one (phones offer the camera too), see it, save.
// The browser prepares it first (centred square, 512 px WebP, right way up,
// no location or other metadata: lib/images/prepare.ts) and uploads it
// straight to the account's own folder; the server action then points the
// profile at it and deletes the old file.

type Preview = PreparedImage & { url: string };

export function PictureField({ userId, name, path }: { userId: string; name: string; path: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"reading" | "saving" | "removing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Free the preview's memory when it's replaced or the page closes.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview.url)), [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy("reading");
    try {
      const image = await prepareAvatar(file);
      setPreview({ ...image, url: URL.createObjectURL(image.blob) });
    } catch (reason) {
      setError(reason instanceof ImageError ? reason.message : "Couldn't read this picture. Try another one.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = ""; // picking the same file again still works
    }
  }

  async function save() {
    if (!preview) return;
    setError(null);
    setBusy("saving");
    const supabase = createSupabaseBrowserClient();
    const newPath = newAvatarPath(userId, preview.extension);
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(newPath, preview.blob, { contentType: preview.type, cacheControl: String(AVATAR_CACHE_SECONDS), upsert: false });
    if (uploadError) {
      setBusy(null);
      return setError("The picture couldn't be uploaded. Check your connection and try again.");
    }
    const result = await savePicture(newPath);
    if (result.error) {
      await supabase.storage.from(AVATARS_BUCKET).remove([newPath]);
      setBusy(null);
      return setError(result.error);
    }
    setPreview(null);
    setBusy(null);
    announceProfileChange();
    router.refresh();
  }

  async function remove() {
    setError(null);
    setBusy("removing");
    const result = await removePicture();
    setBusy(null);
    if (result.error) return setError(result.error);
    announceProfileChange();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a preview of a file still on this device
          <img src={preview.url} alt="" width={96} height={96} className="size-24 shrink-0 rounded-full object-cover" />
        ) : (
          <Avatar name={name} path={path} size={96} />
        )}
        <p className="text-sm text-fg-muted">
          {preview
            ? "This is how it will look. Save it, or pick another."
            : path
              ? "Shown next to your name, for example on comments."
              : "No picture yet: your initial is shown instead."}
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-3">
        {preview ? (
          <>
            <button type="button" onClick={save} disabled={busy !== null} autoComplete="off" className="button-primary">
              {busy === "saving" ? "Saving…" : "Save picture"}
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={busy !== null} autoComplete="off" className="button-secondary">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy !== null}
              autoComplete="off"
              className="button-secondary"
            >
              {busy === "reading" ? "Preparing…" : path ? "Choose a new picture" : "Choose a picture"}
            </button>
            {path && (
              <button type="button" onClick={remove} disabled={busy !== null} autoComplete="off" className="button-secondary">
                {busy === "removing" ? "Removing…" : "Remove picture"}
              </button>
            )}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
