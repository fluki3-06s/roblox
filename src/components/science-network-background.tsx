"use client";

import { useEffect, useRef } from "react";

type NetworkNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ScienceNetworkBackgroundProps = {
  className?: string;
};

export function ScienceNetworkBackground({ className }: ScienceNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const ctx2d = ctx;

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

    function drawFrame() {
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

          const alpha = (1 - dist / maxDist) * 0.14;
          ctx2d.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx2d.lineWidth = 1;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 opacity-75 ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
