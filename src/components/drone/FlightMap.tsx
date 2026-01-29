"use client";

import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { Maximize2, Target, Navigation2, Home, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightMapProps {
  data: TelemetryDataPoint[];
  current?: TelemetryDataPoint | null;
}

export function FlightMap({ data, current }: FlightMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(30); // Pixel pro Meter

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI Support (Retina)
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // MAPPER: X (Fwd) -> Canvas Y (Up), Y (Right) -> Canvas X (Right)
    const toCanvas = (x: number, y: number) => ({
      x: centerX + y * zoom,
      y: centerY - x * zoom
    });

    // 1. Hintergrund & Grid Zeichnen
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Subtiles Punkt-Raster (Dot-Grid)
    const dotSpacing = 40;
    ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
    for (let x = (centerX % dotSpacing); x < rect.width; x += dotSpacing) {
      for (let y = (centerY % dotSpacing); y < rect.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Startpunkt (Home)
    const homePos = toCanvas(0, 0);
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(homePos.x, homePos.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Flugpfad mit Glow-Effekt
    if (data.length > 1) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(59, 130, 246, 0.6)";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      const start = toCanvas(data[0].x, data[0].y);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < data.length; i++) {
        const p = toCanvas(data[i].x, data[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 4. Aktuelle Position & Drohne
    const dronePos = toCanvas(current.x, current.y);
    
    // Sichtkegel (Scanner)
    ctx.save();
    ctx.translate(dronePos.x, dronePos.y);
    // Korrektur: -yaw + 90 Grad, da X jetzt nach oben zeigt
    ctx.rotate(-current.yaw + Math.PI / 2);
    
    const coneGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
    coneGradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
    coneGradient.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = coneGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 60, -Math.PI/8, Math.PI/8);
    ctx.closePath();
    ctx.fill();

    // Drohnen Icon (Modernes Chevron)
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

  }, [data, current, zoom]);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-950 min-h-[300px] relative">
      {/* Top HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
          <Navigation2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Navigation Unit</span>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-slate-900/5 dark:bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/10 flex flex-col">
                <span className="text-[8px] uppercase text-slate-400 font-bold">Forward</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{current?.x.toFixed(2)}m</span>
            </div>
            <div className="bg-slate-900/5 dark:bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/10 flex flex-col">
                <span className="text-[8px] uppercase text-slate-400 font-bold">Right</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{current?.y.toFixed(2)}m</span>
            </div>
        </div>
      </div>

      {/* Side Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button 
            variant="secondary" 
            size="icon" 
            className="h-9 w-9 rounded-xl bg-white/90 dark:bg-slate-900/90 shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-white transition-colors"
            onClick={() => setZoom(prev => Math.min(prev + 10, 150))}
        >
          <Maximize2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Button>
        <Button 
            variant="secondary" 
            size="icon" 
            className="h-9 w-9 rounded-xl bg-white/90 dark:bg-slate-900/90 shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-white transition-colors"
            onClick={() => setZoom(30)}
        >
          <Target className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </Button>
      </div>

      {/* Map Content Area */}
      <div className="flex-1 relative w-full h-full bg-slate-50/30 dark:bg-slate-950/50" ref={containerRef}>
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        
        {/* Subtle Edge Glow */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
                <Home className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Origin Set</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-900 pl-4">
                <Activity className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Telemetry</span>
            </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400">
            SCALE: {zoom}PX/M
        </div>
      </div>
    </Card>
  );
}