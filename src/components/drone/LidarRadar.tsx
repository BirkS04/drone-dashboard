"use client";

import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface LidarRadarProps {
  ranges: number[]; // Das Array von der Drohne
}

export function LidarRadar({ ranges }: LidarRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ranges.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRange = 10; // 10 Meter Sichtweite im Radar
    const scale = width / (maxRange * 2);

    // Hintergrund löschen
    ctx.clearRect(0, 0, width, height);

    // 1. Radar-Ringe zeichnen
    ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
    ctx.lineWidth = 1;
    [2, 5, 8].forEach(dist => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, dist * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 2. Lidar-Punkte zeichnen
    ctx.fillStyle = "#22c55e"; // Apple-Grün
    
    // Die 720 Punkte sind über 360 Grad verteilt
    // Also ist jeder Index = 0.5 Grad
    const angleStep = (Math.PI * 2) / ranges.length;

    ranges.forEach((range, i) => {
      // Ignoriere ungültige Werte (0 oder zu weit weg)
      if (range < 0.1 || range > maxRange) return;

      // Winkel berechnen (Start bei -PI/2 damit 'vorne' oben ist)
      const angle = -Math.PI / 2 + (i * angleStep);

      // In XY umrechnen
      const x = centerX + range * Math.cos(angle) * scale;
      const y = centerY + range * Math.sin(angle) * scale;

      // Punkt zeichnen
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Drohnen-Zentrum (kleines Dreieck)
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 5);
    ctx.lineTo(centerX - 4, centerY + 4);
    ctx.lineTo(centerX + 4, centerY + 4);
    ctx.closePath();
    ctx.fill();

  }, [ranges]);

  return (
    <Card className="bg-slate-950 border-slate-800 p-4 flex flex-col items-center">
      <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-2">Lidar Radar</p>
      <canvas 
        ref={canvasRef} 
        width={250} 
        height={250} 
        className="bg-black/50 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
      />
      <div className="flex justify-between w-full mt-2 text-[8px] text-slate-500 font-mono">
        <span>MAX: 10M</span>
        <span>STEP: 0.5°</span>
      </div>
    </Card>
  );
}