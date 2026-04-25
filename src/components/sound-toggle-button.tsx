"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { isSoundEnabled, setSoundEnabled } from "@/lib/sound-settings";

export function SoundToggleButton() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        setSoundEnabled(next);
      }}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      className="flex h-8 w-8 items-center justify-center text-zinc-300 transition hover:text-white active:scale-95"
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
    </button>
  );
}
