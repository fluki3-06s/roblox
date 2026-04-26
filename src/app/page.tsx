"use client";

import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SoundToggleButton } from "@/components/sound-toggle-button";
import { isSoundEnabled } from "@/lib/sound-settings";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

type SoundTone = "guitar" | "piano" | "soft";
type PianoSample = { freq: number; file: string };

const pianoSamples: PianoSample[] = [
  { freq: 196.0, file: "/sfx/piano-real/G3.mp3" },
  { freq: 246.94, file: "/sfx/piano-real/B3.mp3" },
  { freq: 261.63, file: "/sfx/piano-real/C4.mp3" },
  { freq: 293.66, file: "/sfx/piano-real/D4.mp3" },
  { freq: 329.63, file: "/sfx/piano-real/E4.mp3" },
  { freq: 349.23, file: "/sfx/piano-real/F4.mp3" },
  { freq: 369.99, file: "/sfx/piano-real/Gb4.mp3" },
  { freq: 392.0, file: "/sfx/piano-real/G4.mp3" },
  { freq: 440.0, file: "/sfx/piano-real/A4.mp3" },
  { freq: 493.88, file: "/sfx/piano-real/B4.mp3" },
  { freq: 523.25, file: "/sfx/piano-real/C5.mp3" },
];

async function handleCloseWindow() {
  try {
    await getCurrentWindow().close();
  } catch {
    // Ignore when not running inside Tauri.
  }
}

function playLoginSuccessBeep(soundTone: SoundTone) {
  if (!isSoundEnabled()) return;

  if (soundTone === "piano") {
    playPianoSample(196, 0, 0.64); // G3
    playPianoSample(247, 0.055, 0.6); // B3
    playPianoSample(294, 0.105, 0.56); // D4
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  playToneSynth(context, soundTone, 196, 0.18, 0); // G3
  playToneSynth(context, soundTone, 247, 0.15, 0.055); // B3
  playToneSynth(context, soundTone, 294, 0.12, 0.105); // D4

  window.setTimeout(() => {
    void context.close();
  }, 320);
}

function nearestPianoSample(freq: number) {
  let nearest = pianoSamples[0];
  for (const sample of pianoSamples) {
    if (Math.abs(sample.freq - freq) < Math.abs((nearest?.freq ?? 0) - freq)) {
      nearest = sample;
    }
  }
  return nearest;
}

function playPianoSample(freq: number, offsetSec: number, volume: number) {
  window.setTimeout(() => {
    const sample = nearestPianoSample(freq);
    const audio = new Audio(sample.file);
    audio.volume = volume;
    void audio.play().catch(() => {
      // Ignore autoplay-style failures for transient UI sound.
    });
  }, offsetSec * 1000);
}

function playToneSynth(
  context: AudioContext,
  soundTone: SoundTone,
  freq: number,
  duration: number,
  offsetSec: number
) {
  if (soundTone === "soft") {
    playSoftTone(context, freq, duration, offsetSec);
    return;
  }
  playGuitarPluck(context, freq, duration, offsetSec);
}

function playGuitarPluck(context: AudioContext, freq: number, duration: number, offsetSec: number) {
  const t0 = context.currentTime + offsetSec;
  const osc = context.createOscillator();
  const body = context.createBiquadFilter();
  const pick = context.createBiquadFilter();
  const amp = context.createGain();
  const pickAmp = context.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.995), t0 + duration);

  body.type = "lowpass";
  body.frequency.setValueAtTime(2800, t0);
  body.Q.value = 0.8;

  pick.type = "highpass";
  pick.frequency.setValueAtTime(1900, t0);
  pick.Q.value = 0.7;

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(0.24, t0 + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  pickAmp.gain.setValueAtTime(0.16, t0);
  pickAmp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);

  osc.connect(body);
  body.connect(amp);
  amp.connect(context.destination);

  osc.connect(pick);
  pick.connect(pickAmp);
  pickAmp.connect(context.destination);

  osc.start(t0);
  osc.stop(t0 + duration + 0.01);
}

function playSoftTone(context: AudioContext, freq: number, duration: number, offsetSec: number) {
  const t0 = context.currentTime + offsetSec;
  const osc = context.createOscillator();
  const body = context.createBiquadFilter();
  const amp = context.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(50, freq * 0.99), t0 + duration);

  body.type = "lowpass";
  body.frequency.setValueAtTime(1700, t0);
  body.Q.value = 0.4;

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(0.14, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(body);
  body.connect(amp);
  amp.connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.01);
}

function resolveBgmSource() {
  const tauriMusicPath = "D:/PUBG/desktop-ui/src/music.mp3";
  if (typeof convertFileSrc === "function") {
    try {
      return convertFileSrc(tauriMusicPath);
    } catch {
      return null;
    }
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const soundTone: SoundTone = "guitar";
  const [isWindowReady, setIsWindowReady] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function setupLoginWindow() {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.hide();
        await appWindow.setResizable(false);
        await appWindow.setMaximizable(false);
        await appWindow.setMinimizable(false);
        await appWindow.setSize(new LogicalSize(460, 340));
        await appWindow.center();
        await appWindow.show();
        setIsWindowReady(true);
      } catch {
        // Ignore on non-Tauri environments.
        setIsWindowReady(true);
      }
    }

    void setupLoginWindow();
    const bootTimer = window.setTimeout(() => {
      setIsBooting(false);
      window.requestAnimationFrame(() => setShowLogin(true));
    }, 1100);

    return () => window.clearTimeout(bootTimer);
  }, []);

  useEffect(() => {
    if (!showLogin || isNavigating) return;

    const source = resolveBgmSource();
    if (!source) return;
    const audio = new Audio(source);
    audio.loop = true;
    audio.volume = 0.18;
    audioRef.current = audio;

    const tryPlay = async () => {
      try {
        await audio.play();
      } catch {
        // Wait for the first user interaction if autoplay is blocked.
      }
    };

    void tryPlay();

    const resumeOnInteraction = () => {
      if (!audio.paused) return;
      void tryPlay();
    };

    window.addEventListener("pointerdown", resumeOnInteraction);
    window.addEventListener("keydown", resumeOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", resumeOnInteraction);
      window.removeEventListener("keydown", resumeOnInteraction);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [showLogin, isNavigating]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    playLoginSuccessBeep(soundTone);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 220));

    try {
      const appWindow = getCurrentWindow();
      await appWindow.setResizable(false);
      await appWindow.setMaximizable(false);
      await appWindow.setMinimizable(true);
      await appWindow.setMinSize(new LogicalSize(720, 460));
      await appWindow.setMaxSize(new LogicalSize(800, 520));
      await appWindow.setSize(new LogicalSize(800, 520));
      await appWindow.center();
      await appWindow.hide();
    } catch {
      // Ignore on non-Tauri environments.
    }
    router.push("/system");
  }

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-zinc-100 ${
        isWindowReady ? "opacity-100" : "opacity-0"
      }`}
    >
      {isBooting ? null : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.016),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
          <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/[0.01] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/[0.005] blur-3xl" />
        </>
      )}

      <Card
        className={`relative h-screen w-screen overflow-hidden rounded-none border border-white/10 bg-gradient-to-b from-white/8 via-zinc-950/55 to-black/65 py-0 text-zinc-100 shadow-[0_22px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-all duration-500 ${
          showLogin ? "opacity-100 blur-0" : "opacity-0 blur-[2px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.016),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
        <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/[0.01] blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/[0.005] blur-3xl" />

        {isNavigating ? (
          <div className="pointer-events-none absolute inset-0 z-50 bg-black/70" />
        ) : null}

        <div className="absolute right-3 top-3 z-30 flex items-center gap-0.5">
          <SoundToggleButton />
          <button
            type="button"
            onClick={handleCloseWindow}
            aria-label="Close window"
            className="flex h-8 w-8 items-center justify-center text-zinc-300 transition hover:text-white active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CardHeader className="relative z-10 px-4 pt-6 sm:px-6 sm:pt-7">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            Universal Control
          </p>
          <CardTitle className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            Enter access key
          </CardTitle>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            Use your key to unlock this control panel.
          </p>
        </CardHeader>

        <CardContent className="relative z-10 px-4 pb-4 sm:px-6">
          <form
            className={`space-y-4 ${isNavigating ? "login-exit" : ""}`}
            onSubmit={handleLogin}
          >
            <div className="space-y-2">
              <Label htmlFor="license-key" className="text-zinc-200">
                Access Key
              </Label>
              <Input
                id="license-key"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="h-10 border-white/14 bg-black/32 px-3 text-sm uppercase tracking-wide text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md focus-visible:border-white/40 focus-visible:ring-white/20 sm:h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={isNavigating}
              className="h-10 w-full border border-white/20 bg-zinc-100/95 text-sm font-semibold text-black backdrop-blur-md transition hover:bg-white sm:h-11"
            >
              {isNavigating ? "Opening panel..." : "Login"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="relative z-10 mt-auto border-zinc-800 bg-transparent px-4 py-3 text-[11px] text-zinc-400 sm:px-6 sm:py-4 sm:text-xs">
          Version 0.1.0 - Universal Control build
        </CardFooter>
      </Card>

      <div
        className={`absolute inset-0 z-40 transition-opacity duration-500 ${
          isBooting ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Card className="relative h-full w-full overflow-hidden rounded-none border border-white/10 bg-gradient-to-b from-white/8 via-zinc-950/55 to-black/65 p-6 text-zinc-100 shadow-[0_22px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.016),transparent_36%),linear-gradient(140deg,#060607_0%,#0a0b0e_48%,#050507_100%)]" />
          <div className="pointer-events-none absolute -left-12 top-6 h-36 w-36 rounded-full bg-white/[0.01] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-white/[0.005] blur-3xl" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-sm items-center">
            <div className="w-full text-left">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
                Universal Control
              </p>
              <p className="mt-2 text-xl font-semibold text-white">Launching App</p>
              <p className="mt-1 text-xs text-zinc-400">
                Preparing secure desktop session...
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-4 w-4 animate-spin border-2 border-zinc-300/35 border-t-white" />
                <div className="h-px flex-1 bg-white/20" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
