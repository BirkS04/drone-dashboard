"use client";

import React, { useEffect, useRef, useState } from "react";

interface JoystickProps {
  size?: number;
  stickSize?: number;
  baseColor?: string;
  stickColor?: string;
  onMove?: (x: number, y: number) => void;
  onStop?: () => void;
  className?: string;
  label?: string;
}

export function Joystick({
  size = 100,
  stickSize = 50,
  baseColor = "bg-slate-200 dark:bg-slate-800",
  stickColor = "bg-blue-500",
  onMove,
  onStop,
  className = "",
  label,
}: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxDist = size / 2 - stickSize / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (dist > maxDist) {
      const angle = Math.atan2(deltaY, deltaX);
      deltaX = Math.cos(angle) * maxDist;
      deltaY = Math.sin(angle) * maxDist;
    }

    setPosition({ x: deltaX, y: deltaY });

    // Normalize output (-1 to 1) 
    // Y is inverted for screen coords (Up is negative), but for Joystick Usually Up is 1.
    // Let's standard: Up (Y < 0) -> +1 Output. Right (X > 0) -> +1 Output.
    const normX = deltaX / maxDist;
    const normY = -(deltaY / maxDist);

    if (onMove) onMove(normX, normY);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    if (onStop) onStop();
    if (onMove) onMove(0, 0);
  };

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  
  // Mouse Handlers
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
        if (active) handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
        if (active) handleEnd();
    };
    if (active) {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    }
    return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
    };
  }, [active]);

  return (
    <div className={`flex flex-col items-center gap-2 select-none touch-none ${className}`}>
        {label && <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>}
        <div 
            ref={containerRef}
            className={`rounded-full relative flex items-center justify-center ${baseColor} shadow-inner border border-slate-300 dark:border-slate-700`}
            style={{ width: size, height: size }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleEnd}
            onMouseDown={onMouseDown}
        >
            <div 
                className={`rounded-full absolute shadow-lg cursor-pointer transition-transform duration-75 ${active ? 'scale-95' : ''} ${stickColor}`}
                style={{ 
                    width: stickSize, 
                    height: stickSize,
                    transform: `translate(${position.x}px, ${position.y}px)` 
                }}
            />
        </div>
    </div>
  );
}
