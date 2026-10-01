"use client";

import type { SaveIntent } from "@/lib/admin/post-form";

// The sticky bar at the bottom of the article editor and the item forms: a
// status line, then Save draft + Publish (or Update + Unpublish once
// published), and "Save and add another". Always within thumb reach on a phone.
export function SaveBar({
  status,
  isError,
  published,
  pending,
  savingIntent,
  onSave,
}: {
  /** "Unsaved changes", "Saved at 14:32", an error… */
  status: string;
  isError: boolean;
  published: boolean;
  pending: boolean;
  savingIntent: SaveIntent | null;
  onSave: (intent: SaveIntent, addAnother?: boolean) => void;
}) {
  const busy = (intent: SaveIntent) => pending && savingIntent === intent;
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-rule bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:px-0">
      <p role={isError ? "alert" : "status"} className={`mb-2 min-h-5 text-sm ${isError ? "text-danger" : "text-fg-muted"}`}>
        {status}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {published ? (
          <>
            <button type="button" disabled={pending} onClick={() => onSave("save")} className="button-primary flex-1 sm:flex-none">
              {busy("save") ? "Updating…" : "Update"}
            </button>
            <button type="button" disabled={pending} onClick={() => onSave("unpublish")} className="row-action border border-rule">
              {busy("unpublish") ? "Unpublishing…" : "Unpublish"}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={() => onSave("save")} className="row-action border border-rule">
              {busy("save") ? "Saving…" : "Save draft"}
            </button>
            <button type="button" disabled={pending} onClick={() => onSave("publish")} className="button-primary flex-1 sm:flex-none">
              {busy("publish") ? "Publishing…" : "Publish"}
            </button>
          </>
        )}
        <button type="button" disabled={pending} onClick={() => onSave("save", true)} className="row-action sm:ml-auto">
          <span className="sm:hidden">Save + new</span>
          <span className="hidden sm:inline">Save and add another</span>
        </button>
      </div>
    </div>
  );
}
