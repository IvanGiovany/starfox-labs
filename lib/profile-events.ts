// Settings tells the header's account menu that the profile changed (name,
// username or picture), so the header updates without a reload. Browser only.

export const PROFILE_CHANGED = "starfox:profile-changed";

export function announceProfileChange(): void {
  window.dispatchEvent(new Event(PROFILE_CHANGED));
}
