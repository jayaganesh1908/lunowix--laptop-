"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

interface MousePosition {
  x: number;
  y: number;
}

/** Tracks the pointer in viewport coordinates. */
function useMousePosition(): MousePosition {
  const [mousePosition, setMousePosition] = React.useState<MousePosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return mousePosition;
}

function hexToRgb(hex: string): number[] {
  let value = hex.replace("#", "");
  // Expand the #abc shorthand so both notations work.
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const hexInt = parseInt(value, 16);
  if (Number.isNaN(hexInt)) return [255, 255, 255];
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

export interface ParticlesProps {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
  /**
   * Min/max opacity a particle settles at. Raise the floor to make the field
   * read as bolder without simply adding more particles.
   */
  alphaRange?: [number, number];
}

export const Particles: React.FC<ParticlesProps> = ({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  alphaRange = [0.1, 0.7],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafId = useRef<number | null>(null);

  const mousePosition = useMousePosition();
  const prefersReducedMotion = usePrefersReducedMotion();
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const rgb = useMemo(() => hexToRgb(color), [color]);

  const clearContext = useCallback(() => {
    context.current?.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
  }, []);

  const resizeCanvas = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current || !context.current) {
      return;
    }
    circles.current.length = 0;
    canvasSize.current.w = canvasContainerRef.current.offsetWidth;
    canvasSize.current.h = canvasContainerRef.current.offsetHeight;
    canvasRef.current.width = canvasSize.current.w * dpr;
    canvasRef.current.height = canvasSize.current.h * dpr;
    canvasRef.current.style.width = `${canvasSize.current.w}px`;
    canvasRef.current.style.height = `${canvasSize.current.h}px`;
    context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [dpr]);

  const [minAlpha, maxAlpha] = alphaRange;

  const circleParams = useCallback((): Circle => {
    const targetAlpha = parseFloat(
      (Math.random() * (maxAlpha - minAlpha) + minAlpha).toFixed(2),
    );
    return {
      x: Math.floor(Math.random() * canvasSize.current.w),
      y: Math.floor(Math.random() * canvasSize.current.h),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + size,
      // Particles normally fade in from 0 inside the animation loop. With the
      // loop disabled there is no frame to fade them in, so seed them visible.
      alpha: prefersReducedMotion ? targetAlpha : 0,
      targetAlpha,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  }, [maxAlpha, minAlpha, prefersReducedMotion, size]);

  const drawCircle = useCallback(
    (circle: Circle, update = false) => {
      if (!context.current) return;
      const { x, y, translateX, translateY, size: radius, alpha } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, radius, 0, 2 * Math.PI);
      context.current.fillStyle = `rgba(${rgb.join(", ")}, ${alpha})`;
      context.current.fill();
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!update) circles.current.push(circle);
    },
    [dpr, rgb],
  );

  const drawParticles = useCallback(() => {
    clearContext();
    for (let i = 0; i < quantity; i++) {
      drawCircle(circleParams());
    }
  }, [circleParams, clearContext, drawCircle, quantity]);

  const initCanvas = useCallback(() => {
    resizeCanvas();
    drawParticles();
  }, [drawParticles, resizeCanvas]);

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number,
  ): number => {
    const remapped =
      ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  };

  /** Renders a single frame; the rAF loop lives in the effect below. */
  const drawFrame = useCallback(() => {
    clearContext();

    circles.current.forEach((circle, i) => {
      // Fade a particle out as it approaches any edge of the canvas.
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(
        remapValue(closestEdge, 0, 20, 0, 1).toFixed(2),
      );

      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }

      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) /
        ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) /
        ease;

      drawCircle(circle, true);

      // Respawn in place rather than splicing — mutating the array's length
      // mid-iteration shifts every later index and skips particles.
      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current[i] = circleParams();
      }
    });
  }, [circleParams, clearContext, drawCircle, ease, staticity, vx, vy]);

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    initCanvas();

    // Honour the OS "reduce motion" setting: the static field painted by
    // initCanvas is the final state, so no loop is started.
    if (!prefersReducedMotion) {
      const loop = () => {
        drawFrame();
        rafId.current = window.requestAnimationFrame(loop);
      };
      rafId.current = window.requestAnimationFrame(loop);
    }

    window.addEventListener("resize", initCanvas);

    return () => {
      // Without this every re-run stacks another rAF loop on top of the last.
      if (rafId.current !== null) window.cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", initCanvas);
    };
  }, [drawFrame, initCanvas, prefersReducedMotion]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { w, h } = canvasSize.current;
    const x = mousePosition.x - rect.left - w / 2;
    const y = mousePosition.y - rect.top - h / 2;
    const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
    if (inside) {
      mouse.current.x = x;
      mouse.current.y = y;
    }
  }, [mousePosition.x, mousePosition.y]);

  useEffect(() => {
    initCanvas();
  }, [refresh, initCanvas]);

  return (
    <div className={className} ref={canvasContainerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
