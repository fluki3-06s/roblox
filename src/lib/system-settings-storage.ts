"use client";

import { invoke } from "@tauri-apps/api/core";

const LEGACY_STORAGE_KEY = "pubg-desktop-system-settings-v1";

export type PersistedSystemSettings = {
  verticalStrength?: number[];
  horizontalStrength?: number[];
  selectedMode?: string;
  uiAccentColor?: string;
  soundTone?: "guitar" | "piano" | "soft" | "metal";
  hotkeys?: Record<string, string>;
  userName?: string;
  savedConfigs?: Array<{
    id: string;
    name: string;
    vertical: number;
    horizontal: number;
    hotkeys?: Record<string, string>;
    createdAt?: number;
  }>;
};

function readLegacyLocalSettings(): PersistedSystemSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSystemSettings;
  } catch {
    return null;
  }
}

export async function readSystemSettings(): Promise<PersistedSystemSettings | null> {
  if (typeof window === "undefined") return null;

  try {
    const raw = await invoke<string | null>("load_secure_settings");
    if (raw) {
      return JSON.parse(raw) as PersistedSystemSettings;
    }

    const legacy = readLegacyLocalSettings();
    if (legacy) {
      await invoke("save_secure_settings", { payload: JSON.stringify(legacy) });
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }

    return null;
  } catch {
    return readLegacyLocalSettings();
  }
}

export async function writeSystemSettings(settings: PersistedSystemSettings): Promise<void> {
  const payload = JSON.stringify(settings);
  try {
    await invoke("save_secure_settings", { payload });
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, payload);
    }
  }
}
