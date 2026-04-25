"use client";

import { ChevronRight, FolderOpen, Minus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ScienceNetworkBackground } from "@/components/science-network-background";
import { SoundToggleButton } from "@/components/sound-toggle-button";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { isSoundEnabled } from "@/lib/sound-settings";
import { readSystemSettings, writeSystemSettings } from "@/lib/system-settings-storage";
import { currentMonitor, getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

const modeItems = ["Reddot", "SCOPE X2", "SCOPE X3", "SCOPE X4", "SCOPE X6"];
const hotkeyItems = ["Reddot", "SCOPE X2", "SCOPE X3", "SCOPE X4", "SCOPE X6"];
const discordInviteUrl = "https://discord.gg/C55em8v3e";
const discordPreviewSlides = [
  "/discord-slider/8253dec.webp",
  "/discord-slider/images (1).jpg",
  "/discord-slider/Rldpdwpg.jpg",
  "/discord-slider/sd.avif",
];
const defaultHotkeys: Record<string, string> = {
  Reddot: "F1",
  "SCOPE X2": "F2",
  "SCOPE X3": "F3",
  "SCOPE X4": "F4",
  "SCOPE X6": "F5",
};

type ConfigPreset = {
  id: string;
  name: string;
  vertical: number;
  horizontal: number;
  createdAt: number;
};

const initialSavedConfigs: ConfigPreset[] = [];

const systemPresets: ConfigPreset[] = [
  { id: "sys-1", name: "M416", vertical: 50, horizontal: 50, createdAt: 1 },
  { id: "sys-2", name: "AKM", vertical: 63, horizontal: 58, createdAt: 2 },
  { id: "sys-3", name: "Beryl M762", vertical: 68, horizontal: 61, createdAt: 3 },
  { id: "sys-4", name: "SCAR-L", vertical: 47, horizontal: 45, createdAt: 4 },
  { id: "sys-5", name: "QBZ", vertical: 49, horizontal: 46, createdAt: 5 },
  { id: "sys-6", name: "AUG", vertical: 46, horizontal: 43, createdAt: 6 },
  { id: "sys-7", name: "UMP45", vertical: 40, horizontal: 37, createdAt: 7 },
  { id: "sys-8", name: "Vector", vertical: 55, horizontal: 48, createdAt: 8 },
  { id: "sys-9", name: "DP-28", vertical: 58, horizontal: 41, createdAt: 9 },
  { id: "sys-10", name: "Mini14", vertical: 35, horizontal: 34, createdAt: 10 },
  { id: "sys-11", name: "SLR", vertical: 45, horizontal: 39, createdAt: 11 },
  { id: "sys-12", name: "MK12", vertical: 38, horizontal: 36, createdAt: 12 },
];

function formatHotkeyLabel(key: string, code: string) {
  if (code.startsWith("Key")) return code.slice(3).toUpperCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;

  const codeToLabel: Record<string, string> = {
    Space: "Space",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
    Enter: "Enter",
    Escape: "Escape",
    Tab: "Tab",
    Backspace: "Backspace",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    ShiftLeft: "Shift",
    ShiftRight: "Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
    MetaLeft: "Meta",
    MetaRight: "Meta",
    CapsLock: "CapsLock",
    PrintScreen: "PrintScreen",
    ScrollLock: "ScrollLock",
    Pause: "Pause",
    Numpad0: "Num0",
    Numpad1: "Num1",
    Numpad2: "Num2",
    Numpad3: "Num3",
    Numpad4: "Num4",
    Numpad5: "Num5",
    Numpad6: "Num6",
    Numpad7: "Num7",
    Numpad8: "Num8",
    Numpad9: "Num9",
    NumpadAdd: "Num+",
    NumpadSubtract: "Num-",
    NumpadMultiply: "Num*",
    NumpadDivide: "Num/",
    NumpadDecimal: "Num.",
    NumpadEnter: "NumEnter",
  };

  const codeLabel = codeToLabel[code];
  if (codeLabel) return codeLabel;

  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key[0].toUpperCase() + key.slice(1);
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

function playModeSwitchBeep(mode: string) {
  if (!isSoundEnabled()) return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const toneMap: Record<string, [number, number]> = {
    Reddot: [740, 920],
    "SCOPE X2": [860, 1080],
    "SCOPE X3": [980, 1240],
    "SCOPE X4": [1120, 1410],
    "SCOPE X6": [1280, 1620],
  };
  const [startFreq, endFreq] = toneMap[mode] ?? [980, 1240];

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(startFreq, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, context.currentTime + 0.06);

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.34, context.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.09);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);

  oscillator.onended = () => {
    void context.close();
  };
}

function playConfigActionBeep() {
  if (!isSoundEnabled()) return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(740, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.08);

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.13);

  oscillator.onended = () => {
    void context.close();
  };
}

function normalizeSliderValue(value: number | readonly number[]) {
  const raw = Array.isArray(value) ? (value[0] ?? 1) : value;
  const clamped = Math.min(100, Math.max(1, raw));
  return [Math.round(clamped * 10) / 10];
}

function formatOffsetValue(value: number | undefined) {
  const numeric = typeof value === "number" ? value : 1;
  return numeric.toFixed(1);
}

function formatDurationLabel(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function extractDiscordCode(url: string) {
  const match = url.match(/(?:discord\.gg|discord\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return match?.[1] ?? null;
}

async function openDiscordInviteViaRpc() {
  const code = extractDiscordCode(discordInviteUrl);
  if (!code) return;

  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const response = await fetch("http://127.0.0.1:6463/rpc?v=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cmd: "INVITE_BROWSER",
        args: { code },
        nonce,
      }),
    });
    if (!response.ok) {
      throw new Error(`Discord RPC failed: ${response.status}`);
    }
  } catch {
    // Ignore RPC failure; browser link click still handles opening invite.
  }
}

export default function SystemPage() {
  const DUPLICATE_TOAST_COOLDOWN_MS = 1200;
  const [isWindowReady, setIsWindowReady] = useState(false);
  const [isPanelBooting, setIsPanelBooting] = useState(true);
  const [verticalStrength, setVerticalStrength] = useState([50]);
  const [horizontalStrength, setHorizontalStrength] = useState([50]);
  const [selectedMode, setSelectedMode] = useState<string>(modeItems[0]);
  const [savedConfigs, setSavedConfigs] = useState<ConfigPreset[]>(initialSavedConfigs);
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(defaultHotkeys);
  const [bindingTarget, setBindingTarget] = useState<string | null>(null);
  const [hotkeyNotice, setHotkeyNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; tone: "success" | "error" } | null>(
    null
  );
  const [userName, setUserName] = useState("User");
  const [draftUserName, setDraftUserName] = useState("User");
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [timeLabel, setTimeLabel] = useState("Lifetime");
  const [discordSlideIndex, setDiscordSlideIndex] = useState(0);
  const [loadedDiscordSlides, setLoadedDiscordSlides] = useState<Record<number, boolean>>({});
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [configSearch, setConfigSearch] = useState("");
  const [configSortMode, setConfigSortMode] = useState<"latest" | "name">("latest");
  const [pendingDeleteConfigId, setPendingDeleteConfigId] = useState<string | null>(null);
  const [hasHydratedSettings, setHasHydratedSettings] = useState(false);
  const [verticalOffsetInput, setVerticalOffsetInput] = useState(formatOffsetValue(50));
  const [horizontalOffsetInput, setHorizontalOffsetInput] = useState(formatOffsetValue(50));
  const [isVerticalInputEditing, setIsVerticalInputEditing] = useState(false);
  const [isHorizontalInputEditing, setIsHorizontalInputEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=user-12&backgroundType=gradientLinear"
  );
  const hotkeySectionRef = useRef<HTMLElement | null>(null);
  const lastDuplicateToastAtRef = useRef(0);
  const userNameInputRef = useRef<HTMLInputElement | null>(null);
  const sliderHoldIntervalRef = useRef<number | null>(null);
  const sliderHoldStartTimeoutRef = useRef<number | null>(null);

  function clearSliderHoldInterval() {
    if (sliderHoldStartTimeoutRef.current !== null) {
      window.clearTimeout(sliderHoldStartTimeoutRef.current);
      sliderHoldStartTimeoutRef.current = null;
    }
    if (sliderHoldIntervalRef.current === null) return;
    window.clearInterval(sliderHoldIntervalRef.current);
    sliderHoldIntervalRef.current = null;
  }

  function applyOffsetDelta(target: "vertical" | "horizontal", delta: number) {
    if (target === "vertical") {
      setVerticalStrength((prev) => normalizeSliderValue((prev[0] ?? 1) + delta));
      return;
    }
    setHorizontalStrength((prev) => normalizeSliderValue((prev[0] ?? 1) + delta));
  }

  function startOffsetHold(target: "vertical" | "horizontal", delta: number) {
    clearSliderHoldInterval();
    applyOffsetDelta(target, delta);
    sliderHoldStartTimeoutRef.current = window.setTimeout(() => {
      sliderHoldIntervalRef.current = window.setInterval(() => {
        applyOffsetDelta(target, delta);
      }, 90);
    }, 240);
  }

  function updateOffsetInput(
    target: "vertical" | "horizontal",
    rawValue: string,
    commit: boolean = false
  ) {
    const setter = target === "vertical" ? setVerticalOffsetInput : setHorizontalOffsetInput;
    const setStrength = target === "vertical" ? setVerticalStrength : setHorizontalStrength;

    if (!/^\d*\.?\d*$/.test(rawValue)) return;
    setter(rawValue);

    if (!rawValue.trim()) {
      if (commit) {
        const fallback = target === "vertical" ? verticalStrength[0] : horizontalStrength[0];
        setter(formatOffsetValue(fallback));
      }
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    if (commit) {
      const normalized = normalizeSliderValue(parsed)[0];
      if (typeof normalized === "number") {
        setStrength([normalized]);
        setter(formatOffsetValue(normalized));
      }
    }
  }

  function setModeWithFeedback(nextMode: string) {
    if (selectedMode === nextMode) return;
    setSelectedMode(nextMode);
    playModeSwitchBeep(nextMode);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsPanelBooting(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function setupSystemWindow() {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.hide();
        const monitor = await currentMonitor();
        const monitorWidth = monitor?.size.width ?? 1366;
        const monitorHeight = monitor?.size.height ?? 768;

        const targetWidth = Math.max(640, Math.min(760, Math.floor(monitorWidth * 0.62)));
        const targetHeight = Math.max(420, Math.min(500, Math.floor(monitorHeight * 0.58)));

        await appWindow.setResizable(false);
        await appWindow.setMaximizable(false);
        await appWindow.setMinimizable(true);
        await appWindow.setMinSize(new LogicalSize(targetWidth, targetHeight));
        await appWindow.setMaxSize(new LogicalSize(targetWidth, targetHeight));
        await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
        await appWindow.center();
        await appWindow.show();
        setIsWindowReady(true);
      } catch {
        // Ignore on non-Tauri environments.
        setIsWindowReady(true);
      }
    }

    void setupSystemWindow();
  }, []);

  useEffect(() => {
    const randomSeed = Math.random().toString(36).slice(2, 10);
    setAvatarUrl(
      `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${randomSeed}&backgroundType=gradientLinear`
    );
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDiscordSlideIndex((prev) => (prev + 1) % discordPreviewSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [discordPreviewSlides.length]);

  useEffect(() => {
    if (isVerticalInputEditing) return;
    setVerticalOffsetInput(formatOffsetValue(verticalStrength[0]));
  }, [verticalStrength, isVerticalInputEditing]);

  useEffect(() => {
    if (isHorizontalInputEditing) return;
    setHorizontalOffsetInput(formatOffsetValue(horizontalStrength[0]));
  }, [horizontalStrength, isHorizontalInputEditing]);

  useEffect(() => {
    return () => clearSliderHoldInterval();
  }, []);

  useEffect(() => {
    function stopHold() {
      clearSliderHoldInterval();
    }

    window.addEventListener("pointerup", stopHold);
    window.addEventListener("pointercancel", stopHold);
    return () => {
      window.removeEventListener("pointerup", stopHold);
      window.removeEventListener("pointercancel", stopHold);
    };
  }, []);

  function commitUserName() {
    const normalized = draftUserName.trim();
    if (!normalized) {
      setDraftUserName(userName);
      setIsEditingUserName(false);
      return;
    }
    const nextName = normalized.slice(0, 8);
    setUserName(nextName);
    setDraftUserName(nextName);
    setIsEditingUserName(false);
  }

  function applyPreset(preset: ConfigPreset) {
    setVerticalStrength([preset.vertical]);
    setHorizontalStrength([preset.horizontal]);
    setUserName(preset.name.slice(0, 8));
    setDraftUserName(preset.name.slice(0, 8));
    setPendingDeleteConfigId(null);
    setIsLoadModalOpen(false);
    playConfigActionBeep();
    setActionNotice({ text: `Loaded ${preset.name}`, tone: "success" });
  }

  function removeSavedConfig(configId: string) {
    setSavedConfigs((prev) => prev.filter((item) => item.id !== configId));
    setPendingDeleteConfigId(null);
    setActionNotice({ text: "Config deleted", tone: "success" });
  }

  function saveCurrentConfig() {
    const configName = userName.trim().slice(0, 8) || "Config";
    setSavedConfigs((prev) => {
      const existed = prev.find((item) => item.name === configName);
      if (existed) {
        return prev.map((item) =>
          item.name === configName
            ? {
                ...item,
                vertical: verticalStrength[0] ?? 0,
                horizontal: horizontalStrength[0] ?? 0,
                createdAt: Date.now(),
              }
            : item
        );
      }

      const created: ConfigPreset = {
        id: `cfg-${Date.now()}`,
        name: configName,
        vertical: verticalStrength[0] ?? 0,
        horizontal: horizontalStrength[0] ?? 0,
        createdAt: Date.now(),
      };
      return [created, ...prev];
    });
    setUserName(configName);
    setDraftUserName(configName);
    playConfigActionBeep();
    setActionNotice({ text: `Saved ${configName}`, tone: "success" });
  }

  const filteredSortedSavedConfigs = useMemo(() => {
    const needle = configSearch.trim().toLowerCase();
    const filtered = needle
      ? savedConfigs.filter((item) => item.name.toLowerCase().includes(needle))
      : savedConfigs;
    const cloned = [...filtered];

    if (configSortMode === "name") {
      cloned.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      cloned.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }

    return cloned;
  }, [savedConfigs, configSearch, configSortMode]);

  useEffect(() => {
    if (!hotkeyNotice) return;
    const timer = window.setTimeout(() => setHotkeyNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [hotkeyNotice]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    async function hydrateSettings() {
      try {
        const parsed = await readSystemSettings();
        if (!parsed) return;

        if (
          Array.isArray(parsed.verticalStrength) &&
          typeof parsed.verticalStrength[0] === "number"
        ) {
          setVerticalStrength([parsed.verticalStrength[0]]);
        }

        if (
          Array.isArray(parsed.horizontalStrength) &&
          typeof parsed.horizontalStrength[0] === "number"
        ) {
          setHorizontalStrength([parsed.horizontalStrength[0]]);
        }

        if (typeof parsed.selectedMode === "string" && modeItems.includes(parsed.selectedMode)) {
          setSelectedMode(parsed.selectedMode);
        }

        if (parsed.hotkeys && typeof parsed.hotkeys === "object") {
          setHotkeys(parsed.hotkeys);
        }

        if (typeof parsed.userName === "string" && parsed.userName.trim()) {
          const trimmedName = parsed.userName.trim().slice(0, 8);
          setUserName(trimmedName);
          setDraftUserName(trimmedName);
        }

        if (Array.isArray(parsed.savedConfigs)) {
          setSavedConfigs(
            parsed.savedConfigs.map((item) => ({
              ...item,
              createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            }))
          );
        }
      } finally {
        setHasHydratedSettings(true);
      }
    }

    void hydrateSettings();
  }, []);

  useEffect(() => {
    if (!hasHydratedSettings) return;

    const payload = {
      verticalStrength,
      horizontalStrength,
      selectedMode,
      hotkeys,
      userName,
      savedConfigs,
    };

    void writeSystemSettings(payload);
  }, [hasHydratedSettings, verticalStrength, horizontalStrength, selectedMode, hotkeys, userName, savedConfigs]);

  useEffect(() => {
    // Demo countdown (6h 30m from now). Replace with your real expiry timestamp.
    const subscriptionExpiresAt: number | null = Date.now() + (6 * 60 * 60 + 30 * 60) * 1000;
    if (!subscriptionExpiresAt) {
      setTimeLabel("Lifetime");
      return;
    }
    const expiresAt = subscriptionExpiresAt;

    function updateCountdown() {
      const remainingSeconds = Math.floor((expiresAt - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        setTimeLabel("Expired");
        return;
      }
      setTimeLabel(formatDurationLabel(remainingSeconds));
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!bindingTarget) return;

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();

      if (event.key === "Escape") {
        setBindingTarget(null);
        return;
      }

      const nextKey = formatHotkeyLabel(event.key, event.code);
      const duplicate = Object.entries(hotkeys).find(
        ([mode, assigned]) => mode !== bindingTarget && assigned === nextKey
      );

      if (duplicate) {
        const now = Date.now();
        if (now - lastDuplicateToastAtRef.current < DUPLICATE_TOAST_COOLDOWN_MS) {
          return;
        }

        lastDuplicateToastAtRef.current = now;
        setHotkeyNotice(`${nextKey} is already used by ${duplicate[0]}.`);
        return;
      }

      const target = bindingTarget;
      if (!target) return;

      setHotkeys((prev) => ({
        ...prev,
        [target]: nextKey,
      }));
      setBindingTarget(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindingTarget, hotkeys]);

  useEffect(() => {
    if (bindingTarget) return;

    function onHotkeySwitch(event: KeyboardEvent) {
      const pressedKey = formatHotkeyLabel(event.key, event.code);
      const matchedMode = Object.entries(hotkeys).find(([, assigned]) => assigned === pressedKey)?.[0];
      if (!matchedMode) return;

      event.preventDefault();
      setModeWithFeedback(matchedMode);
    }

    window.addEventListener("keydown", onHotkeySwitch);
    return () => window.removeEventListener("keydown", onHotkeySwitch);
  }, [bindingTarget, hotkeys, selectedMode]);

  useEffect(() => {
    if (!bindingTarget) return;

    function onPointerDown(event: MouseEvent) {
      const section = hotkeySectionRef.current;
      if (!section) return;
      if (!section.contains(event.target as Node)) {
        setBindingTarget(null);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [bindingTarget]);

  return (
    <div
      className={`relative h-screen overflow-hidden bg-black text-zinc-100 select-none ${
        isWindowReady ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,255,255,0.11),transparent_38%),radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.07),transparent_34%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
      <div className="soft-glow-move pointer-events-none absolute -left-12 top-10 h-40 w-40 rounded-full bg-white/8 blur-3xl" />
      <div className="soft-glow-move pointer-events-none absolute -right-10 bottom-12 h-44 w-44 rounded-full bg-white/7 blur-3xl [animation-delay:1.2s]" />

      <main
        className={`panel-enter relative grid h-screen grid-cols-[0.9fr_2.35fr_1.15fr] overflow-hidden rounded-none border border-white/10 bg-gradient-to-b from-white/10 via-zinc-950/58 to-black/68 shadow-[0_22px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl transition-opacity duration-400 ${
          isPanelBooting ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.11),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.07),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
        <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/6 blur-3xl" />
        <ScienceNetworkBackground className="z-[6] opacity-55" />

        <div
          data-tauri-drag-region
          className="absolute inset-x-0 top-0 z-30 h-10"
        />

        <div className="absolute right-3 top-3 z-40 flex items-center gap-0.5">
          <SoundToggleButton />
          <button
            type="button"
            onClick={() => handleWindowAction("minimize")}
            aria-label="Minimize window"
            className="flex h-8 w-8 translate-x-2 items-center justify-center rounded-md bg-transparent text-zinc-300 transition hover:text-white active:scale-95"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleWindowAction("close")}
            aria-label="Close window"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-zinc-300 transition hover:text-white active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <section className="panel-fade-up relative z-10 overflow-hidden border-r border-white/8 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Mode
          </h2>
          <ul className="mt-4 space-y-0.5">
            {modeItems.map((item) => (
              <li
                key={item}
                className={`group relative overflow-hidden rounded-none transition ${
                  selectedMode === item
                    ? "bg-white/12"
                    : "bg-transparent hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onPointerDown={() => setModeWithFeedback(item)}
                  className="block w-full px-2.5 py-2 text-left"
                >
                  <span
                    className={`absolute left-0 top-0 h-full transition ${
                      selectedMode === item
                        ? "w-1 bg-white"
                        : "w-px bg-white/40 opacity-70 group-hover:opacity-100"
                    }`}
                  />
                  <div className="flex items-center text-left">
                    <p className="text-[13px] font-semibold tracking-wide text-zinc-100 whitespace-nowrap">
                      {item}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="absolute bottom-5 left-5">
            <div className="mt-3 w-[170px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">User</p>
              <div className="mt-2 flex items-center gap-2.5">
                <Avatar className="size-7 border border-white/15">
                  <AvatarImage src={avatarUrl} alt="User avatar" />
                  <AvatarFallback className="bg-zinc-900/80 text-[10px] font-semibold text-zinc-100">
                    U
                  </AvatarFallback>
                  <AvatarBadge className="size-2 border-zinc-950 bg-emerald-400" />
                </Avatar>
                <div className="min-w-0">
                  <div className="relative h-6 w-[110px]">
                    <Input
                      ref={userNameInputRef}
                      value={isEditingUserName ? draftUserName : userName}
                      readOnly={!isEditingUserName}
                      onClick={() => {
                        if (isEditingUserName) return;
                        setDraftUserName(userName);
                        setIsEditingUserName(true);
                        window.requestAnimationFrame(() => {
                          userNameInputRef.current?.focus();
                          userNameInputRef.current?.select();
                        });
                      }}
                      onChange={(event) => {
                        if (!isEditingUserName) return;
                        setDraftUserName(event.target.value);
                      }}
                      onBlur={() => {
                        if (!isEditingUserName) return;
                        commitUserName();
                      }}
                      onKeyDown={(event) => {
                        if (!isEditingUserName) return;
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitUserName();
                        }
                        if (event.key === "Escape") {
                          setDraftUserName(userName);
                          setIsEditingUserName(false);
                        }
                      }}
                      maxLength={8}
                      className="absolute inset-0 h-6 w-full rounded-none border-0 bg-transparent px-0 py-0 text-left text-sm font-semibold tracking-wide text-zinc-100 shadow-none ring-0 outline-none focus-visible:border-0 focus-visible:ring-0"
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] tracking-wide text-zinc-400">{timeLabel}</p>
                  <div className="mt-1.5 h-px w-20 bg-linear-to-r from-white/35 via-white/10 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel-fade-up relative z-10 overflow-hidden border-r border-white/8 p-6 pt-10 [animation-delay:80ms]">
          <div className="space-y-0">
            <div className="p-3.5">
              <div className="mb-2.5 flex items-end justify-between">
                <p className="text-base font-semibold text-zinc-100">
                  Vertical Control
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Decrease vertical offset"
                    onPointerDown={() => startOffsetHold("vertical", -0.1)}
                    onPointerUp={clearSliderHoldInterval}
                    onPointerLeave={clearSliderHoldInterval}
                    onPointerCancel={clearSliderHoldInterval}
                    className="h-5 w-5 text-xs font-semibold text-zinc-300 transition hover:text-white active:scale-95"
                  >
                    -
                  </button>
                  <Input
                    value={verticalOffsetInput}
                    onChange={(event) => updateOffsetInput("vertical", event.target.value)}
                    onFocus={() => setIsVerticalInputEditing(true)}
                    onBlur={(event) => {
                      updateOffsetInput("vertical", event.target.value, true);
                      setIsVerticalInputEditing(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        updateOffsetInput("vertical", verticalOffsetInput, true);
                        setIsVerticalInputEditing(false);
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setVerticalOffsetInput(formatOffsetValue(verticalStrength[0]));
                        setIsVerticalInputEditing(false);
                        event.currentTarget.blur();
                      }
                    }}
                    inputMode="decimal"
                    className="h-5 w-12 rounded-none border-0 bg-transparent px-1.5 py-0 text-center text-[11px] font-semibold text-zinc-200 shadow-none ring-0 focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label="Increase vertical offset"
                    onPointerDown={() => startOffsetHold("vertical", 0.1)}
                    onPointerUp={clearSliderHoldInterval}
                    onPointerLeave={clearSliderHoldInterval}
                    onPointerCancel={clearSliderHoldInterval}
                    className="h-5 w-5 text-xs font-semibold text-zinc-300 transition hover:text-white active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
              <Slider
                value={verticalStrength}
                onValueChange={(value) => setVerticalStrength(normalizeSliderValue(value))}
                min={1}
                max={100}
                step={0.1}
                className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-linear-to-r [&_[data-slot=slider-track]]:from-white/20 [&_[data-slot=slider-track]]:via-white/35 [&_[data-slot=slider-track]]:to-white/20 [&_[data-slot=slider-range]]:bg-linear-to-r [&_[data-slot=slider-range]]:from-white [&_[data-slot=slider-range]]:via-zinc-200 [&_[data-slot=slider-range]]:to-zinc-500 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-white/90 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-none"
              />
            </div>

            <div className="p-3.5">
              <div className="mb-2.5 flex items-end justify-between">
                <p className="text-base font-semibold text-zinc-100">
                  Horizontal Control
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Decrease horizontal offset"
                    onPointerDown={() => startOffsetHold("horizontal", -0.1)}
                    onPointerUp={clearSliderHoldInterval}
                    onPointerLeave={clearSliderHoldInterval}
                    onPointerCancel={clearSliderHoldInterval}
                    className="h-5 w-5 text-xs font-semibold text-zinc-300 transition hover:text-white active:scale-95"
                  >
                    -
                  </button>
                  <Input
                    value={horizontalOffsetInput}
                    onChange={(event) => updateOffsetInput("horizontal", event.target.value)}
                    onFocus={() => setIsHorizontalInputEditing(true)}
                    onBlur={(event) => {
                      updateOffsetInput("horizontal", event.target.value, true);
                      setIsHorizontalInputEditing(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        updateOffsetInput("horizontal", horizontalOffsetInput, true);
                        setIsHorizontalInputEditing(false);
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setHorizontalOffsetInput(formatOffsetValue(horizontalStrength[0]));
                        setIsHorizontalInputEditing(false);
                        event.currentTarget.blur();
                      }
                    }}
                    inputMode="decimal"
                    className="h-5 w-12 rounded-none border-0 bg-transparent px-1.5 py-0 text-center text-[11px] font-semibold text-zinc-200 shadow-none ring-0 focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label="Increase horizontal offset"
                    onPointerDown={() => startOffsetHold("horizontal", 0.1)}
                    onPointerUp={clearSliderHoldInterval}
                    onPointerLeave={clearSliderHoldInterval}
                    onPointerCancel={clearSliderHoldInterval}
                    className="h-5 w-5 text-xs font-semibold text-zinc-300 transition hover:text-white active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
              <Slider
                value={horizontalStrength}
                onValueChange={(value) => setHorizontalStrength(normalizeSliderValue(value))}
                min={1}
                max={100}
                step={0.1}
                className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-linear-to-r [&_[data-slot=slider-track]]:from-white/20 [&_[data-slot=slider-track]]:via-white/35 [&_[data-slot=slider-track]]:to-white/20 [&_[data-slot=slider-range]]:bg-linear-to-r [&_[data-slot=slider-range]]:from-white [&_[data-slot=slider-range]]:via-zinc-200 [&_[data-slot=slider-range]]:to-zinc-500 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-white/90 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-none"
              />
            </div>
          </div>

          <div className="absolute bottom-6 right-6 flex items-center gap-3">
            <Button
              onClick={saveCurrentConfig}
              className="h-10 min-w-22 rounded-md border-0 bg-linear-to-b from-zinc-900/95 via-zinc-900/75 to-zinc-950/95 px-6 text-sm font-semibold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-md transition duration-200 hover:from-zinc-800/95 hover:via-zinc-800/75 hover:to-zinc-900/95 active:scale-[0.98]"
            >
              Save
            </Button>
            <Button
              onClick={() => setIsLoadModalOpen(true)}
              className="h-10 min-w-22 rounded-md border-0 bg-gradient-to-b from-zinc-100 to-zinc-300 px-6 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition duration-200 hover:from-white hover:to-zinc-200 active:scale-[0.98]"
            >
              LOAD
            </Button>
          </div>
        </section>

        <section
          ref={hotkeySectionRef}
          className="panel-fade-up relative z-10 min-w-0 overflow-hidden p-5 [animation-delay:140ms]"
        >
          <div className="border-b border-white/10 pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Hotkey
            </h2>
          </div>
          <ul className="mt-2 divide-y divide-white/6 rounded-none bg-black/20 px-1.5 py-1">
            {hotkeyItems.map((item) => (
              <li
                key={item}
                className={`group relative overflow-visible transition duration-200 ${
                  bindingTarget === item
                    ? "bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "bg-transparent hover:bg-white/[0.06] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setBindingTarget(item);
                  }}
                  className="w-full px-1 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="whitespace-nowrap text-[12px] font-semibold tracking-wide text-zinc-100">
                        {item}
                      </p>
                    </div>
                    <span
                      className={`mt-0.5 min-w-9 shrink-0 rounded-none px-1.5 py-1 text-center text-[11px] font-bold tracking-wide ${
                        bindingTarget === item
                          ? "bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                          : "bg-black/45 text-zinc-300 ring-1 ring-white/10"
                      }`}
                    >
                      {hotkeys[item]}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {hotkeyNotice ? (
            <p className="mt-2 text-[11px] text-red-300/90">{hotkeyNotice}</p>
          ) : null}

          <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            <span className="status-pulse-green inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-green-300">
              UNDETECTED
            </p>
          </div>

          <div className="absolute bottom-23 left-1/2 h-[72px] w-[146px] -translate-x-1/2 overflow-hidden rounded-md bg-black/30 shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_26px_rgba(0,0,0,0.48)]">
            {!loadedDiscordSlides[discordSlideIndex] ? (
              <div className="absolute inset-0 animate-pulse bg-linear-to-r from-zinc-900/80 via-zinc-800/60 to-zinc-900/80" />
            ) : null}
            {discordPreviewSlides.map((slide, index) => (
              <img
                key={slide}
                src={encodeURI(slide)}
                alt=""
                aria-hidden="true"
                onLoad={() =>
                  setLoadedDiscordSlides((prev) => ({
                    ...prev,
                    [index]: true,
                  }))
                }
                className={`absolute inset-0 h-full w-full object-cover brightness-50 blur-[0.9px] saturate-90 transition-opacity duration-700 ${
                  discordSlideIndex === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/20" />
          </div>

          <div className="absolute bottom-11.5 left-1/2 flex -translate-x-1/2 items-center justify-center">
            <a
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void openDiscordInviteViaRpc();
              }}
              className="group rounded-none p-0.5 transition-transform duration-200 hover:scale-105 active:scale-95"
              aria-label="Join Discord server"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6.5 w-6.5 text-zinc-300 transition duration-200"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.369A19.791 19.791 0 0 0 15.885 3c-.191.34-.404.8-.553 1.17a18.31 18.31 0 0 0-5.663 0A12.76 12.76 0 0 0 9.116 3a19.736 19.736 0 0 0-4.433 1.37C1.876 8.58 1.158 12.684 1.517 16.73a19.905 19.905 0 0 0 5.939 3.03c.47-.63.89-1.295 1.245-1.994a12.98 12.98 0 0 1-1.954-.94c.164-.12.324-.245.479-.373 3.77 1.77 7.865 1.77 11.59 0 .156.128.316.253.48.373-.623.364-1.277.68-1.956.94.355.698.775 1.364 1.245 1.993a19.864 19.864 0 0 0 5.94-3.029c.42-4.688-.718-8.754-3.208-12.361Zm-11.476 9.89c-1.17 0-2.13-1.08-2.13-2.408 0-1.33.94-2.409 2.13-2.409 1.2 0 2.15 1.09 2.13 2.409 0 1.328-.94 2.408-2.13 2.408Zm6.315 0c-1.17 0-2.13-1.08-2.13-2.408 0-1.33.94-2.409 2.13-2.409 1.2 0 2.15 1.09 2.13 2.409 0 1.328-.93 2.408-2.13 2.408Z" />
              </svg>
            </a>
          </div>
        </section>
      </main>

      {actionNotice ? (
        <div className="pointer-events-none absolute bottom-22 left-1/2 z-40 -translate-x-1/2">
          <p
            className={`text-[11px] font-medium tracking-wide ${
              actionNotice.tone === "success" ? "text-zinc-300" : "text-red-300"
            }`}
          >
            {actionNotice.text}
          </p>
        </div>
      ) : null}

      {isLoadModalOpen ? (
        <div
          data-lenis-prevent
          onClick={() => setIsLoadModalOpen(false)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 relative w-full max-w-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/8 via-zinc-950/55 to-black/65 shadow-[0_22px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.06),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
            <div className="pointer-events-none absolute -left-12 top-4 h-28 w-28 rounded-full bg-white/7 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-4 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-3.5 py-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Config Loader</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-300" />
                  Load Configuration
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoadModalOpen(false)}
                className="group flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-white"
                aria-label="Close load modal"
              >
                <X className="h-4 w-4 transition duration-200 group-hover:rotate-90 group-hover:scale-110" />
              </button>
            </div>

            <div className="relative z-10 grid max-h-[60vh] grid-cols-2 gap-4 px-3.5 pb-3.5 pt-3">
              <div className="min-h-0">
                <p className="mb-2 flex items-center gap-1.5 border-b border-white/8 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                  Saved Configs
                </p>
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    value={configSearch}
                    onChange={(event) => setConfigSearch(event.target.value)}
                    placeholder="Search config..."
                    className="h-7 rounded-none border-white/12 bg-black/25 px-2 text-xs text-zinc-200 placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setConfigSortMode((prev) => (prev === "latest" ? "name" : "latest"))
                    }
                    className="h-7 min-w-16 rounded-none border border-white/12 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300 transition hover:bg-white/[0.06]"
                  >
                    {configSortMode === "latest" ? "Latest" : "A-Z"}
                  </button>
                </div>
                <div className="scrollbar-dark max-h-[52vh] divide-y divide-white/8 overflow-y-auto pr-1">
                  {filteredSortedSavedConfigs.length ? (
                    filteredSortedSavedConfigs.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className="group flex items-start justify-between gap-2 px-2 py-2.5 transition hover:bg-white/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 text-left">
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                            <div>
                              <p className="text-sm font-semibold text-zinc-100">{preset.name}</p>
                              <p className="mt-0.5 text-[11px] text-zinc-400">
                                V {formatOffsetValue(preset.vertical)} / H{" "}
                                {formatOffsetValue(preset.horizontal)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Delete ${preset.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDeleteConfigId((prev) =>
                              prev === preset.id ? null : preset.id
                            );
                          }}
                          className="group mt-0.5 flex h-6 w-6 items-center justify-center text-zinc-500 transition hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5 transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="px-2 py-3 text-xs text-zinc-500">No saved configs.</p>
                  )}
                </div>
                {pendingDeleteConfigId ? (
                  <div className="mt-2 flex items-center justify-between rounded-none border border-red-300/20 bg-red-500/5 px-2 py-1.5">
                    <p className="text-[10px] text-red-200">Delete selected config?</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeSavedConfig(pendingDeleteConfigId)}
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-300"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteConfigId(null)}
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0">
                <p className="mb-2 flex items-center gap-1.5 border-b border-white/8 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                  System Presets
                </p>
                <div className="scrollbar-dark max-h-[52vh] divide-y divide-white/8 overflow-y-auto pr-1">
                  {systemPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="group w-full px-2 py-2.5 text-left transition hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{preset.name}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            V {formatOffsetValue(preset.vertical)} / H{" "}
                            {formatOffsetValue(preset.horizontal)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
 
      <div
        className={`absolute inset-0 z-50 transition-opacity duration-300 ${
          isPanelBooting ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-none border border-white/10 bg-gradient-to-b from-white/8 via-zinc-950/55 to-black/65 p-6 text-zinc-100 shadow-[0_22px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.11),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.07),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
          <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/6 blur-3xl" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-sm items-center">
            <div className="w-full text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">System Panel</p>
              <p className="mt-2 text-xl font-semibold text-white">Loading Panel</p>
              <p className="mt-1 text-xs text-zinc-400">Preparing controls and hotkeys...</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-4 w-4 animate-spin border-2 border-zinc-300/35 border-t-white" />
                <div className="h-px flex-1 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
