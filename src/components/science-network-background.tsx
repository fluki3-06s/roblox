"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BackgroundEffectStyle } from "@/lib/system-settings-storage";
import { EvilEye } from "@/components/evil-eye";
import { ParticlesBg } from "@/components/particles-bg";

type NetworkNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ScienceNetworkBackgroundProps = {
  className?: string;
  accentColor?: string;
  variant?: BackgroundEffectStyle;
};

function hexToRgb(color: string) {
  const match = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function ScienceNetworkBackground({
  className,
  accentColor = "#22D3EE",
  variant = "network",
}: ScienceNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlePalette = useMemo(() => [accentColor, "#ffffff", accentColor], [accentColor]);

  useEffect(() => {
    if (variant !== "network") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const ctx2d = ctx;
    const rgb = hexToRgb(accentColor) ?? { r: 34, g: 211, b: 238 };

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    let animationId = 0;
    const mouse = { x: 0, y: 0, active: false };
    let nodes: NetworkNode[] = [];

    function buildNodes() {
      const density = 18;
      nodes = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
      }));
    }

    function resizeCanvas() {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      width = window.innerWidth;
      height = window.innerHeight;
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function drawNetworkFrame() {
      ctx2d.clearRect(0, 0, width, height);
      const edgePadding = 6;

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x <= edgePadding || node.x >= width - edgePadding) node.vx *= -1;
        if (node.y <= edgePadding || node.y >= height - edgePadding) node.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const distSq = dx * dx + dy * dy;
          const influenceRadius = 170;
          if (distSq < influenceRadius * influenceRadius) {
            const dist = Math.max(1, Math.sqrt(distSq));
            const push = (influenceRadius - dist) / influenceRadius;
            node.x -= (dx / dist) * push * 0.7;
            node.y -= (dy / dist) * push * 0.7;
          }
        }

        // Clamp node position so mouse interaction cannot push it outside canvas forever.
        node.x = Math.max(edgePadding, Math.min(width - edgePadding, node.x));
        node.y = Math.max(edgePadding, Math.min(height - edgePadding, node.y));
      }

      const maxDist = 150;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) continue;

          const alpha = (1 - dist / maxDist) * 0.24;
          ctx2d.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
          ctx2d.lineWidth = 1.15;
          ctx2d.beginPath();
          ctx2d.moveTo(a.x, a.y);
          ctx2d.lineTo(b.x, b.y);
          ctx2d.stroke();
        }
      }

      for (const node of nodes) {
        ctx2d.fillStyle = "rgba(255,255,255,0.62)";
        ctx2d.beginPath();
        ctx2d.arc(node.x, node.y, 1.3, 0, Math.PI * 2);
        ctx2d.fill();
      }

      animationId = window.requestAnimationFrame(drawFrame);
    }

    function drawFrame() {
      drawNetworkFrame();
    }

    function onMouseMove(event: MouseEvent) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    }

    function onMouseLeave() {
      mouse.active = false;
    }

    resizeCanvas();
    animationId = window.requestAnimationFrame(drawFrame);

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [accentColor, variant]);

  return (
    <>
      {variant === "evil-eye" ? (
        <EvilEye
          className={`pointer-events-none absolute inset-0 opacity-75 ${className ?? ""}`}
          eyeColor={accentColor}
          intensity={0.42}
          pupilSize={0.5}
          irisWidth={0.24}
          glowIntensity={0.2}
          scale={0.28}
          noiseScale={1.0}
          pupilFollow={0.5}
          flameSpeed={0.9}
          eyeOffsetY={-0.08}
          interactive
          backgroundColor="#000000"
        />
      ) : variant === "particles" ? (
        <ParticlesBg
          className={`pointer-events-none absolute inset-0 opacity-75 ${className ?? ""}`}
          particleColors={particlePalette}
          particleCount={220}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={90}
          moveParticlesOnHover={false}
          alphaParticles
          disableRotation={false}
          sizeRandomness={0.9}
          cameraDistance={20}
          pixelRatio={1}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 opacity-75 ${className ?? ""}`}
          aria-hidden="true"
        />
      )}
    </>
  );
}
