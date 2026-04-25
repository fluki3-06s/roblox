"use client";

import { useEffect } from "react";

function shouldBlockShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const isCtrlOrMeta = event.ctrlKey || event.metaKey;

  if (event.key === "F5" || event.key === "F12") return true;
  if (isCtrlOrMeta && (key === "r" || key === "u" || key === "s" || key === "p")) return true;
  if (isCtrlOrMeta && event.shiftKey && (key === "i" || key === "j" || key === "c" || key === "k")) {
    return true;
  }

  return false;
}

export function AppShortcutGuard() {
  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    function blockShortcut(event: KeyboardEvent) {
      if (!shouldBlockShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("keydown", blockShortcut, true);
    document.addEventListener("keyup", blockShortcut, true);
    window.addEventListener("keydown", blockShortcut, true);
    window.addEventListener("keyup", blockShortcut, true);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("keydown", blockShortcut, true);
      document.removeEventListener("keyup", blockShortcut, true);
      window.removeEventListener("keydown", blockShortcut, true);
      window.removeEventListener("keyup", blockShortcut, true);
    };
  }, []);

  return null;
}
