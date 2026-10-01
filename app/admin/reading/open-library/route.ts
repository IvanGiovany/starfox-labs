import { NextResponse } from "next/server";
import { editionCovers, OpenLibraryError, searchBooks } from "@/lib/admin/open-library";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// The Reading form's Open Library autofill:
//   GET ?q=dune herbert             → matching books (title/author or ISBN)
//   GET ?covers=/works/OL893414W    → covers of that work's other editions
// Read-only and admin only. A route handler rather than a server action, so
// searching as Ivan types never queues in front of Save.

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin())) {
    return NextResponse.json({ error: "Your sign-in has expired. Save your work, then reload to sign in again." }, { status: 401, headers: NO_STORE });
  }

  const params = new URL(request.url).searchParams;
  const q = params.get("q");
  const work = params.get("covers");
  try {
    if (q !== null) {
      if (q.trim().length < 2) return NextResponse.json({ results: [] }, { headers: NO_STORE });
      return NextResponse.json({ results: await searchBooks(q) }, { headers: NO_STORE });
    }
    if (work !== null) return NextResponse.json({ covers: await editionCovers(work) }, { headers: NO_STORE });
    return NextResponse.json({ error: "Expected ?q= or ?covers=." }, { status: 400, headers: NO_STORE });
  } catch (error) {
    if (error instanceof OpenLibraryError) return NextResponse.json({ error: error.message }, { status: 502, headers: NO_STORE });
    console.error("Open Library lookup failed", error);
    return NextResponse.json({ error: "Something went wrong talking to Open Library. Try again." }, { status: 500, headers: NO_STORE });
  }
}
