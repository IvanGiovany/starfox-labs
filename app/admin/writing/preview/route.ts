import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/admin/post-form";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { markdownToHast } from "@/lib/markdown";

// The editor's live preview: markdown in, the rendered HTML tree out (as
// JSON). The editor turns the tree into React with the same components as
// the public article page (lib/markdown-react.tsx).
//
// Why a route handler and not a server action: Next.js runs a page's server
// actions one at a time, so a Save pressed while a preview is rendering would
// wait for it. Route handlers are ordinary requests that run alongside them.
// POST handlers are never cached, and the render itself is uncached too.

const NO_STORE = { "Cache-Control": "no-store" };

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  // proxy.ts already sends signed-out visitors to /login; this also turns away
  // signed-in readers (Phase 4) who aren't the admin.
  const user = await getCurrentUser();
  if (!user || !(await isAdmin())) return error(401, "Sign in as the admin to preview.");

  // Refuse oversized requests before reading them (UTF-8 is at most 4 bytes per character).
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LIMITS.preview * 4) return error(413, "This article is too long to preview.");

  let bodyMd: unknown;
  try {
    ({ bodyMd } = await request.json());
  } catch {
    return error(400, "Expected JSON like { \"bodyMd\": \"…\" }.");
  }
  if (typeof bodyMd !== "string") return error(400, "Expected JSON like { \"bodyMd\": \"…\" }.");
  if (bodyMd.length > LIMITS.preview) return error(413, "This article is too long to preview.");

  return NextResponse.json({ tree: await markdownToHast(bodyMd) }, { headers: NO_STORE });
}
