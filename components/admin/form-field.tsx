import type { ReactNode } from "react";

// One labelled form field with an optional hint and an error message (which
// replaces the hint). Shared by the article editor and the item forms.
export function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-fg-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-fg-muted">{hint}</p>
      )}
    </div>
  );
}
