import { NextResponse } from "next/server";
import { fetchRemoteImage } from "@/lib/admin/fetch-remote-image";
import { ImageError, mediaPath, type ImageUse } from "@/lib/admin/image-rules";
import { prepareImageOnServer } from "@/lib/admin/prepare-image-server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { withSize } from "@/lib/image-size";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// "Paste image URL" in the editor: the server downloads the image (safely, see
// fetch-remote-image.ts), prepares it like any other upload, and stores our
// own copy in the media bucket. The editor then links to that copy, never to
// the original site.
//
// A route handler rather than a server action: an import can take several
// seconds, and server actions run one at a time, so it would hold up Save.

const NO_STORE = { "Cache-Control": "no-store" };

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  // Only from our own pages: this request makes the server fetch a URL and
  // write to storage, so another site must not be able to trigger it.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return fail(403, "Imports can only be started from the editor.");
  }
  const user = await getCurrentUser();
  if (!user || !(await isAdmin())) return fail(401, "Your sign-in has expired. Save your work, then reload to sign in again.");

  let url: unknown;
  let use: unknown;
  try {
    ({ url, use } = await request.json());
  } catch {
    return fail(400, "Expected JSON like { \"url\": \"https://…\", \"use\": \"body\" }.");
  }
  if (typeof url !== "string" || url.length > 2048 || (use !== "body" && use !== "cover")) {
    return fail(400, "Expected JSON like { \"url\": \"https://…\", \"use\": \"body\" }.");
  }

  try {
    const downloaded = await fetchRemoteImage(url);
    const image = await prepareImageOnServer(downloaded.bytes, use as ImageUse);

    const supabase = await createSupabaseServerClient();
    const path = mediaPath(image.extension);
    const { error } = await supabase.storage.from("media").upload(path, image.bytes, {
      contentType: image.type,
      cacheControl: "31536000", // a new random name every time, so it can be kept for a year
      upsert: false,
    });
    if (error) return fail(502, "The image was downloaded but couldn't be saved. Try again in a moment.");

    const { publicUrl } = supabase.storage.from("media").getPublicUrl(path).data;
    return NextResponse.json(
      { url: withSize(publicUrl, image.width, image.height), width: image.width, height: image.height },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof ImageError) return fail(422, error.message);
    console.error("Image import failed", error);
    return fail(500, "Something went wrong importing that image. Try again.");
  }
}
