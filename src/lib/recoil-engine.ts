"use client";

import { invoke } from "@tauri-apps/api/core";

export type RecoilScope = "Red Dot" | "x2" | "x3" | "x4" | "x6";

export type RecoilStatus = {
  running: boolean;
  enabled: boolean;
  scope: RecoilScope;
  global_scale: number;
  step_interval_ms: number;
};

export async function startRecoilEngine(): Promise<void> {
  await invoke("recoil_start");
}

export async function stopRecoilEngine(): Promise<void> {
  await invoke("recoil_stop");
}

export async function setRecoilEnabled(enabled: boolean): Promise<void> {
  await invoke("recoil_set_enabled", { enabled });
}

export async function toggleRecoilEnabled(): Promise<boolean> {
  return invoke("recoil_toggle_enabled");
}

export async function setRecoilScope(scope: RecoilScope): Promise<void> {
  await invoke("recoil_set_scope", { scope });
}

export async function updateRecoilSettings(globalScale: number, stepIntervalMs: number): Promise<void> {
  await invoke("recoil_update_settings", {
    globalScale,
    stepIntervalMs,
  });
}

export async function updateRecoilHotkeys(hotkeys: Record<string, string>): Promise<void> {
  await invoke("recoil_update_hotkeys", { hotkeys });
}

export async function readRecoilStatus(): Promise<RecoilStatus> {
  return invoke("recoil_status");
}
