import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { Maximize2, Target, Navigation2, Home, Activity, Play, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDrone } from "@/hooks/use-drone";

interface FlightMapProps {
  data: TelemetryDataPoint[];
  current?: TelemetryDataPoint | null;
}

interface Waypoint {
  x: number;
  y: number;
  z: number;
}

export function FlightMap({ data, current }: FlightMapProps) {
  const { executeMission } = useDrone();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(30); // Pixel pro Meter
  
  // Mission Planning State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [targetAltitude, setTargetAltitude] = useState<string>("5");
  const [isPlanning, setIsPlanning] = useState(false);

  // Helper: Convert Screen Utils to World Coords
  const toWorld = useCallback((screenX: number, screenY: number, width: number, height: number): {x: number, y: number} => {
     const centerX = width / 2;
     const centerY = height / 2;
     
     // Inverse of: x_screen = centerX + y_world * zoom
     // y_world = (x_screen - centerX) / zoom
     const y_world = (screenX - centerX) / zoom;
     
     // Inverse of: y_screen = centerY - x_world * zoom
     // x_world = (centerY - y_screen) / zoom
     const x_world = (centerY - screenY) / zoom;
     
     return { x: x_world, y: y_world };
  }, [zoom]);

  const handleMapClick = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const worldPos = toWorld(clickX, clickY, rect.width, rect.height);
      const alt = parseFloat(targetAltitude) || 5;
      
      setWaypoints(prev => [...prev, { x: worldPos.x, y: worldPos.y, z: alt }]);
      setIsPlanning(true);
  };

  const handleStartMission = async () => {
      if (waypoints.length === 0) return;
      const success = await executeMission(waypoints);
      if (success) {
          // Optional: Clear or keep waypoints? Let's keep for reference for now.
          // setWaypoints([]); 
      }
  };

  const handleClear = () => {
      setWaypoints([]);
      setIsPlanning(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return; // Allow render even if no current telem

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

    // 3. Flugpfad mit Glow-Effekt (Historie)
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

    // --- NEU: Geplanter Pfad (Orange) ---
    if (waypoints.length > 0) {
        ctx.strokeStyle = "rgba(249, 115, 22, 0.8)"; // Orange
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        
        // Start von aktueller Drohnen-Pos oder Home (0,0) wenn noch nicht gestartet
        const startPos = current ? toCanvas(current.x, current.y) : toCanvas(0, 0);
        ctx.moveTo(startPos.x, startPos.y);

        waypoints.forEach((wp, idx) => {
            const p = toCanvas(wp.x, wp.y);
            ctx.lineTo(p.x, p.y);
            
            // Punkt zeichnen wird separat gemacht, hier nur Linie
        });
        
        ctx.stroke();
        ctx.setLineDash([]);

        // Waypoints zeichnen
        waypoints.forEach((wp, idx) => {
            const p = toCanvas(wp.x, wp.y);
            
            ctx.fillStyle = "rgba(249, 115, 22, 0.2)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            ctx.fill();
            
            // Nummer/Höhe text
            ctx.fillStyle = "#f97316";
            ctx.font = "10px monospace";
            ctx.fillText(`${idx+1} (${wp.z}m)`, p.x + 10, p.y + 4);
        });
    }

    // 4. Aktuelle Position & Drohne
    if (current) {
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
    }

  }, [data, current, zoom, waypoints]); // Waypoints als Dependency hinzugefügt

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
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
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

      {/* Mission Planner Control Panel (Bottom Left Overlay) */}
      <div className="absolute bottom-16 left-4 z-20 flex flex-col gap-2 pointer-events-auto w-48">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mission Planner</span>
              </div>
              
              <div className="flex gap-2 items-center">
                  <span className="text-xs text-slate-500">Alt (m):</span>
                  <Input 
                    type="number" 
                    value={targetAltitude} 
                    onChange={(e) => setTargetAltitude(e.target.value)}
                    className="h-7 text-xs px-2 w-full" 
                  />
              </div>

              <div className="flex gap-2 mt-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 h-7 text-[10px]"
                    onClick={handleClear}
                    disabled={waypoints.length === 0}
                  >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 h-7 text-[10px] bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleStartMission}
                    disabled={waypoints.length === 0}
                  >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                  </Button>
              </div>
              
              {waypoints.length > 0 && (
                  <div className="mt-1 text-[9px] text-slate-400 text-center">
                      {waypoints.length} points • Tap map to add
                  </div>
              )}
          </div>
      </div>


      {/* Map Content Area */}
      <div className="flex-1 relative w-full h-full bg-slate-50/30 dark:bg-slate-950/50 cursor-crosshair" ref={containerRef} onClick={handleMapClick}>
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