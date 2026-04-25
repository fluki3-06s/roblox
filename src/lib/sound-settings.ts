const SOUND_ENABLED_KEY = "pubg-desktop-sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === null) return true;
  return stored === "1";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
}
