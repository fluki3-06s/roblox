"use client";

import { ArrowLeft, Minus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SoundToggleButton } from "@/components/sound-toggle-button";
import {
  type BackgroundEffectStyle,
  readSystemSettings,
  writeSystemSettings,
} from "@/lib/system-settings-storage";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const accentPresets = [
  "#22D3EE",
  "#38BDF8",
  "#60A5FA",
  "#34D399",
  "#A78BFA",
  "#F472B6",
  "#F59E0B",
  "#EF4444",
  "#FFFFFF",
];

const backgroundEffectOptions: Array<{ value: BackgroundEffectStyle; label: string; hint: string }> = [
  { value: "network", label: "Network", hint: "Connected geometric lines" },
  { value: "evil-eye", label: "Evil Eye", hint: "Animated burning eye effect" },
  { value: "particles", label: "Particles", hint: "Floating ambient particles" },
];

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function hueFromPointer(clientX: number, clientY: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angle = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  // CSS conic-gradient starts at top (12 o'clock), so shift by +90deg.
  return (angle + 450) % 360;
}

async function handleWindowAction(action: "minimize" | "close") {
  try {
    const appWindow = getCurrentWindow();
    if (action === "minimize") {
      await appWindow.minimize();
      return;
    }
    await appWindow.close();
  } catch {
    // Ignore on non-Tauri environments.
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [accentColor, setAccentColor] = useState("#22D3EE");
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffectStyle>("network");
  const [streamerMode, setStreamerMode] = useState(false);
  const [hue, setHue] = useState(190);
  const [isPickingHue, setIsPickingHue] = useState(false);
  const [isHueHovered, setIsHueHovered] = useState(false);
  const hueRingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function setupWindow() {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.setResizable(false);
        await appWindow.setMaximizable(false);
        await appWindow.setMinimizable(true);
        await appWindow.setMinSize(new LogicalSize(760, 520));
        await appWindow.setMaxSize(new LogicalSize(760, 520));
        await appWindow.setSize(new LogicalSize(760, 520));
        await appWindow.center();
      } catch {
        // Ignore on non-Tauri environments.
      }
    }
    void setupWindow();
  }, []);

  useEffect(() => {
    async function hydrateAccent() {
      const parsed = await readSystemSettings();
      const saved = parsed?.uiAccentColor;
      if (typeof saved === "string" && isValidHexColor(saved)) {
        const normalized = saved.toUpperCase();
        setAccentColor(normalized);
      }
      if (
        parsed?.backgroundEffect === "network" ||
        parsed?.backgroundEffect === "evil-eye" ||
        parsed?.backgroundEffect === "particles"
      ) {
        setBackgroundEffect(parsed.backgroundEffect);
      }
      const savedStreamerMode = parsed?.streamerMode === true;
      setStreamerMode(savedStreamerMode);
      try {
        await invoke("set_streamer_mode", { enabled: savedStreamerMode });
      } catch {
        // Ignore on non-Tauri environments.
      }
    }
    void hydrateAccent();
  }, []);

  useEffect(() => {
    if (!isPickingHue) return;
    function onMove(event: MouseEvent) {
      if (!hueRingRef.current) return;
      const nextHue = hueFromPointer(event.clientX, event.clientY, hueRingRef.current);
      setHue(nextHue);
      void persistAccent(hslToHex(nextHue, 0.78, 0.52));
    }
    function onUp() {
      setIsPickingHue(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPickingHue]);

  async function persistAccent(nextColor: string) {
    const normalized = nextColor.toUpperCase();
    setAccentColor(normalized);
    const existing = (await readSystemSettings()) ?? {};
    await writeSystemSettings({
      ...existing,
      uiAccentColor: normalized,
    });
  }

  async function persistStreamerMode(nextEnabled: boolean) {
    setStreamerMode(nextEnabled);
    try {
      await invoke("set_streamer_mode", { enabled: nextEnabled });
    } catch {
      // Ignore on non-Tauri environments.
    }
    const existing = (await readSystemSettings()) ?? {};
    await writeSystemSettings({
      ...existing,
      streamerMode: nextEnabled,
    });
  }

  async function persistBackgroundEffect(nextEffect: BackgroundEffectStyle) {
    setBackgroundEffect(nextEffect);
    const existing = (await readSystemSettings()) ?? {};
    await writeSystemSettings({
      ...existing,
      backgroundEffect: nextEffect,
    });
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.016),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
      <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/[0.01] blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/[0.005] blur-3xl" />

      <main
        data-lenis-prevent
        className="relative h-screen overflow-y-auto bg-gradient-to-b from-white/10 via-zinc-950/58 to-black/68 p-6 [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.45)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-500/45 [&::-webkit-scrollbar-thumb:hover]:bg-zinc-400/55"
      >
        <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-20 h-10" />

        <div className="absolute right-3 top-3 z-30 flex items-center gap-0.5">
          <SoundToggleButton />
          <button
            type="button"
            onClick={() => handleWindowAction("minimize")}
            aria-label="Minimize window"
            className="flex h-8 w-8 items-center justify-center text-zinc-300 transition hover:text-white active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleWindowAction("close")}
            aria-label="Close window"
            className="flex h-8 w-8 items-center justify-center text-zinc-300 transition hover:text-white active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mx-auto mt-5 max-w-3xl pb-8">
          <button
            type="button"
            onClick={() => router.push("/system")}
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-none bg-transparent p-3">
            <h1 className="text-xl font-semibold text-white">Settings</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              Manage app preferences and control behavior.
            </p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between bg-transparent px-2 py-1">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Audio Feedback</p>
                  <p className="text-xs text-zinc-500">Toggle interaction sound effects</p>
                </div>
                <SoundToggleButton />
              </div>

              <div className="bg-transparent px-2 py-1">
                <p className="text-sm font-semibold text-zinc-200">Background Effect</p>
                <p className="text-xs text-zinc-500">Switch the animated geometry style in System screen.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {backgroundEffectOptions.map((effect) => {
                    const isActive = backgroundEffect === effect.value;
                    return (
                      <button
                        key={effect.value}
                        type="button"
                        onClick={() => void persistBackgroundEffect(effect.value)}
                        className={`rounded-none border px-2 py-2 text-left transition ${
                          isActive
                            ? "border-white/70 bg-white/10 text-white"
                            : "border-white/12 bg-transparent text-zinc-300 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-semibold">{effect.label}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{effect.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between bg-transparent px-2 py-1">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Streamer Mode</p>
                  <p className="text-xs text-zinc-500">Hide app window from screen capture tools.</p>
                  <p className="mt-1 text-[10px] text-amber-300/90">
                    Warning: If app is hidden, press Ctrl+Shift+F10 to show it again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void persistStreamerMode(!streamerMode)}
                  aria-pressed={streamerMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                    streamerMode
                      ? "border-white/50 bg-white/20"
                      : "border-white/20 bg-black/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      streamerMode ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="bg-transparent px-2 py-1">
                <p className="text-sm font-semibold text-zinc-200">UI Accent Color</p>
                <p className="text-xs text-zinc-500">Choose your preferred UI highlight tone.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {accentPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => void persistAccent(color)}
                      className={`relative h-6 w-6 rounded-full transition ${
                        accentColor === color ? "ring-2 ring-white/90" : "ring-1 ring-white/25"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Set accent ${color}`}
                    >
                      {accentColor === color ? (
                        <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-black">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAccentColor(value);
                    }}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (!isValidHexColor(value)) {
                        setAccentColor("#22D3EE");
                        return;
                      }
                      void persistAccent(value);
                    }}
                    className="ml-2 h-7 w-24 rounded-none border border-white/15 bg-black/20 px-2 text-[11px] font-semibold text-zinc-200 focus:outline-none"
                  />
                  <div className="relative ml-3">
                    <div
                      ref={hueRingRef}
                      onMouseEnter={() => setIsHueHovered(true)}
                      onMouseLeave={() => setIsHueHovered(false)}
                      onMouseDown={(event) => {
                        if (!hueRingRef.current) return;
                        const nextHue = hueFromPointer(event.clientX, event.clientY, hueRingRef.current);
                        setHue(nextHue);
                        setIsPickingHue(true);
                        void persistAccent(hslToHex(nextHue, 0.78, 0.52));
                      }}
                      className={`relative h-12 w-12 rounded-full ring-2 ring-black/55 transition duration-150 ${
                        isPickingHue || isHueHovered
                          ? "scale-135 ring-black/90"
                          : "scale-100 hover:scale-110 hover:ring-black/75"
                      }`}
                      style={{
                        background:
                          "conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                      }}
                      aria-label="Hue color selector"
                      title="Hue selector"
                    >
                      <div className="absolute inset-[9px] rounded-full bg-zinc-950/95" />
                      <span
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_2px_rgba(0,0,0,0.65)] ${
                          isPickingHue || isHueHovered ? "h-4 w-4" : "h-3 w-3"
                        }`}
                        style={{
                          left: `${50 + Math.sin((hue * Math.PI) / 180) * 19}%`,
                          top: `${50 - Math.cos((hue * Math.PI) / 180) * 19}%`,
                          backgroundColor: isValidHexColor(accentColor) ? accentColor : "#22D3EE",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
