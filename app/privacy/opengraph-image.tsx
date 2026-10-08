// /privacy's link preview: the site's own card. Needed as a file here because
// a page that sets its own `openGraph` metadata doesn't inherit the root's
// opengraph-image (found by the preview check, 2026-10-08).
export { alt, contentType, default, size } from "../opengraph-image";
