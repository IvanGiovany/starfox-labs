// Hobbies: how a hobby card shows its image, and the category that feeds the
// home page's "Learning" card. Shared by the admin and (in Phase 3) the public
// Hobbies page and home grid.

/** photo: fills the card, with a caption. cutout: an object on a transparent background. none: a text card. */
export const IMAGE_STYLES = ["photo", "cutout", "none"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  photo: "PHOTO",
  cutout: "CUT-OUT",
  none: "NONE",
};

export function isImageStyle(value: string): value is ImageStyle {
  return (IMAGE_STYLES as readonly string[]).includes(value);
}

/** Items in this category are what Ivan is learning now (the home page's Learning card). */
export const LEARNING_CATEGORY = "Learning";
