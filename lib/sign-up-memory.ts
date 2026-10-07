// What this browser remembers for the sign-up prompt (localStorage). Browser
// only. Storage can be blocked (private windows, some settings): reading then
// counts as "nothing remembered" and writing quietly does nothing.

const HAD_ACCOUNT = "starfox:had-account";
const PROMPT_DISMISSED = "starfox:sign-up-prompt-dismissed";

function remembered(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function remember(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {}
}

/** Someone has been signed in on this browser (set by the header's account menu). */
export const rememberHadAccount = () => remember(HAD_ACCOUNT);
export const hadAccount = () => remembered(HAD_ACCOUNT);

/** The reader chose "Not now". */
export const rememberPromptDismissed = () => remember(PROMPT_DISMISSED);
export const promptDismissed = () => remembered(PROMPT_DISMISSED);
