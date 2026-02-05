import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { Target, Navigation2, Activity, Play, Trash2, MapPin, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDrone, Obstacle } from "@/hooks/use-drone";

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
  const { executeMission, setMissionStrategy, setInspectROI, setOrbitRadius, obstacles } = useDrone();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(30); // Pixel pro Meter
  
  // Mission Planning State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [targetAltitude, setTargetAltitude] = useState<string>("5");
  const [missionStrategy, setMissionStrategyState] = useState<"CASUAL" | "FACE_TARGET" | "INSPECT" | "ORBIT">("FACE_TARGET");
  const [roi, setRoi] = useState({ x: 0, y: 0, z: 0 });
  const [orbitRadius, setOrbitRadiusState] = useState<string>("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isPickingROI, setIsPickingROI] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<{ obs: Obstacle, x: number, y: number } | null>(null);

  // Helper: Screen (Pixel) -> World (Meter)
  // Standard ENU: X nach Rechts, Y nach Oben
  const toWorld = useCallback((screenX: number, screenY: number, width: number, height: number): {x: number, y: number} => {
     const centerX = width / 2;
     const centerY = height / 2;
     
     // x_world = (screen_x - center_x) / zoom
     const x_world = (screenX - centerX) / zoom;
     
     // y_world = (center_y - screen_y) / zoom  (Weil Screen Y nach unten positiv ist)
     const y_world = (centerY - screenY) / zoom;
     
     return { x: x_world, y: y_world };
  }, [zoom]);

  const handleMapClick = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const worldPos = toWorld(clickX, clickY, rect.width, rect.height);
      
      if (isPickingROI) {
          setRoi(prev => ({ ...prev, x: worldPos.x, y: worldPos.y }));
          setIsPickingROI(false);
          return;
      }

      const alt = parseFloat(targetAltitude) || 5;
      
      setWaypoints(prev => [...prev, { x: worldPos.x, y: worldPos.y, z: alt }]);
      setIsPlanning(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const world = toWorld(x, y, rect.width, rect.height);


    const found = obstacles.find(obs => {
        if (obs.type === 'box') {
            const halfW = (obs.width || 0) / 2;
            const halfH = (obs.height || 0) / 2;
            return world.x >= obs.x - halfW && world.x <= obs.x + halfW &&
                   world.y >= obs.y - halfH && world.y <= obs.y + halfH;
        } else if (obs.type === 'cylinder') {
            const r = obs.radius || 0;
            const dx = world.x - obs.x;
            const dy = world.y - obs.y;
            return (dx*dx + dy*dy) <= r*r;
        }
        return false;
    });

    if (found) {
        // Calculate screen position for tooltip (Replicating toCanvas logic)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const screenX = centerX + found.x * zoom;
        const screenY = centerY - found.y * zoom;
        setHoveredInfo({ obs: found, x: screenX, y: screenY });
    } else {
        setHoveredInfo(null);
    }
  };

  const handleStartMission = async () => {
      if (waypoints.length === 0) return;
      
      if (missionStrategy === "INSPECT") {
          await setInspectROI(roi.x, roi.y, roi.z);
      }
      
      if (missionStrategy === "ORBIT") {
          const r = parseFloat(orbitRadius);
          // Wenn Input leer oder ungültig -> -1 (Auto), sonst Wert senden
          await setOrbitRadius((!isNaN(r) && r > 0) ? r : -1);
      }

      await setMissionStrategy(missionStrategy);
      await executeMission(waypoints);
  };

  const handleClear = () => {
      setWaypoints([]);
      setIsPlanning(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // MAPPER: World X -> Canvas X (Right), World Y -> Canvas Y (Up is negative)
    const toCanvas = (x: number, y: number) => ({
      x: centerX + x * zoom,
      y: centerY - y * zoom
    });

    // 1. Clear & Background
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Grid Setup
    ctx.strokeStyle = "rgba(203, 213, 225, 0.5)";
    ctx.lineWidth = 1;
    
    // Achsen (Ursprung)
    ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(rect.width, centerY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, rect.height); ctx.stroke();

    // Achsen Beschriftung
    ctx.font = "10px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("+X (East)", rect.width - 60, centerY - 6);
    ctx.fillText("+Y (North)", centerX + 6, 15);

    // Rasterpunkte (1 Meter Raster)
    const dotSpacing = zoom; 
    ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
    const startX = centerX % dotSpacing;
    const startY = centerY % dotSpacing;

    for (let x = startX; x < rect.width; x += dotSpacing) {
      for (let y = startY; y < rect.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 1.5 Render Obstacles
    obstacles.forEach(obs => {
        const center = toCanvas(obs.x, obs.y);
        ctx.fillStyle = "rgba(100, 116, 139, 0.5)"; // Slate-500 with opacity
        ctx.strokeStyle = "rgba(71, 85, 105, 0.8)"; // Slate-600
        ctx.lineWidth = 1;

        if (obs.type === 'box') {
            const w = (obs.width || 0) * zoom;
            const h = (obs.height || 0) * zoom;
            ctx.fillRect(center.x - w/2, center.y - h/2, w, h);
            ctx.strokeRect(center.x - w/2, center.y - h/2, w, h);
        } else if (obs.type === 'cylinder') {
            const r = (obs.radius || 0) * zoom;
            ctx.beginPath();
            ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });

    // 2. Home Position
    const homePos = toCanvas(0, 0);
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(homePos.x - 5, homePos.y); ctx.lineTo(homePos.x + 5, homePos.y);
    ctx.moveTo(homePos.x, homePos.y - 5); ctx.lineTo(homePos.x, homePos.y + 5);
    ctx.stroke();

    // 3. Flugpfad (History)
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

    // 4. Geplanter Pfad
    if (waypoints.length > 0) {
        ctx.strokeStyle = "rgba(249, 115, 22, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        const startPos = current ? toCanvas(current.x, current.y) : toCanvas(0, 0);
        ctx.moveTo(startPos.x, startPos.y);

        waypoints.forEach((wp) => {
            const p = toCanvas(wp.x, wp.y);
            ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Wegpunkte zeichnen
        waypoints.forEach((wp, idx) => {
            const p = toCanvas(wp.x, wp.y);
            ctx.fillStyle = "rgba(249, 115, 22, 0.2)";
            ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.font = "10px monospace";
            ctx.fillText(`${idx+1}`, p.x + 10, p.y + 4);
        });
    }

    // 5. ROI Visualisierung
    if (missionStrategy === "INSPECT" || isPickingROI) {
        const p = toCanvas(roi.x, roi.y);
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x + 6, p.y);
        ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y + 6);
        ctx.stroke();
        ctx.fillText("ROI", p.x + 8, p.y - 4);
    }

    // 6. Drohne
    if (current) {
        const dronePos = toCanvas(current.x, current.y);
        
        ctx.save();
        ctx.translate(dronePos.x, dronePos.y);
        // Canvas Y ist invertiert, daher -rotation
        ctx.rotate(-current.yaw); 
        
        // FOV Cone
        const coneGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
        coneGradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
        coneGradient.addColorStop(1, "rgba(59, 130, 246, 0)");
        ctx.fillStyle = coneGradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 60, -Math.PI/8, Math.PI/8); // Cone nach Rechts (+X)
        ctx.closePath();
        ctx.fill();

        // Drohnen Icon (Pfeil nach Rechts)
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(10, 0); 
        ctx.lineTo(-6, -6);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

  }, [data, current, zoom, waypoints, missionStrategy, roi, isPickingROI, hoveredInfo, obstacles]);

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-950 min-h-[300px] relative select-none">
      {/* HUD Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
          <Navigation2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Global Map (ENU)</span>
        </div>
        <div className="flex gap-2">
            <div className="bg-slate-900/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/50 flex flex-col">
                <span className="text-[8px] uppercase text-slate-400 font-bold">X (East)</span>
                <span className="text-xs font-mono font-bold text-slate-700">{current?.x.toFixed(2)}m</span>
            </div>
            <div className="bg-slate-900/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/50 flex flex-col">
                <span className="text-[8px] uppercase text-slate-400 font-bold">Y (North)</span>
                <span className="text-xs font-mono font-bold text-slate-700">{current?.y.toFixed(2)}m</span>
            </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 pointer-events-auto bg-white/90 rounded-xl p-1 shadow-sm border border-slate-200">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(prev + 10, 150))}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(prev - 10, 5))}>
          <Minus className="h-4 w-4" />
        </Button>
        <div className="h-px w-full bg-slate-200 my-0.5" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(30)}>
          <Target className="h-4 w-4" />
        </Button>
      </div>

      {/* Mission Planner UI */}
      {isPlanning && (
          <div className="absolute bottom-16 left-4 z-20 flex flex-col gap-2 pointer-events-auto w-52 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Mission Planner</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                     <div className="col-span-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Mode</span>
                        <select 
                            className="h-7 text-xs px-1 w-full rounded-md border border-slate-200 bg-slate-50"
                            value={missionStrategy}
                            onChange={(e) => setMissionStrategyState(e.target.value as any)}
                        >
                            <option value="FACE_TARGET">Face</option>
                            <option value="CASUAL">Casual</option>
                            <option value="INSPECT">Inspect</option>
                            <option value="ORBIT">Orbit</option>
                        </select>
                     </div>
                     <div className="col-span-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Alt (m)</span>
                        <Input type="number" value={targetAltitude} onChange={(e) => setTargetAltitude(e.target.value)} className="h-7 text-xs px-2" />
                     </div>
                  </div>

                  {/* INSPECT MODE UI */}
                  {missionStrategy === "INSPECT" && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 mt-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Target (ROI)</span>
                            <Button size="sm" variant={isPickingROI ? "destructive" : "secondary"} className="h-5 px-1.5 text-[9px]" onClick={() => setIsPickingROI(!isPickingROI)}>
                                <Target className="w-3 h-3 mr-1" /> Pick
                            </Button>
                        </div>
                        <div className="flex gap-1">
                            <Input placeholder="X" type="number" value={roi.x} onChange={e => setRoi({...roi, x: parseFloat(e.target.value)||0})} className="h-6 text-[10px] px-1" />
                            <Input placeholder="Y" type="number" value={roi.y} onChange={e => setRoi({...roi, y: parseFloat(e.target.value)||0})} className="h-6 text-[10px] px-1" />
                            <Input placeholder="Z" type="number" value={roi.z} onChange={e => setRoi({...roi, z: parseFloat(e.target.value)||0})} className="h-6 text-[10px] px-1" />
                        </div>
                    </div>
                  )}

                  {/* ORBIT MODE UI - WIEDER HINZUGEFÜGT */}
                  {missionStrategy === "ORBIT" && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 mt-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Orbit Config</span>
                        <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">Radius (m)</span>
                            <Input 
                                placeholder="Auto" 
                                type="number" 
                                value={orbitRadius}
                                onChange={(e) => setOrbitRadiusState(e.target.value)}
                                className="h-6 text-[10px] px-1" 
                            />
                        </div>
                        <div className="text-[8px] text-blue-500 mt-1 leading-tight">
                            Empty = Use distance to waypoint
                        </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={handleClear} disabled={waypoints.length === 0}>Clear</Button>
                      <Button size="sm" className="flex-1 h-7 text-[10px] bg-orange-500 hover:bg-orange-600" onClick={handleStartMission} disabled={waypoints.length === 0}>
                          <Play className="w-3 h-3 mr-1" /> Go
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Map Area */}
      <div className="flex-1 relative w-full h-full bg-slate-50/50 cursor-crosshair group" ref={containerRef} onClick={handleMapClick} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredInfo(null)}>
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        
        {/* Hover Hint */}
        {/* Hover Hint */}
        {hoveredInfo && (
            <div 
                className="absolute z-30 pointer-events-none bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded shadow-lg backdrop-blur-sm"
                style={{ 
                    left: `${hoveredInfo.x}px`, 
                    top: `${hoveredInfo.y - 20}px`,
                    transform: 'translate(-50%, -100%)'
                }}
            >
                <div className="font-bold">{hoveredInfo.obs.id}</div>
                <div>Height: {hoveredInfo.obs.z}m</div>
            </div>
        )}
        {!isPlanning && (
            <div className="absolute bottom-4 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-slate-900/70 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] text-white font-medium shadow-md">
                    Click map to start planning
                </div>
            </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-100 flex justify-between items-center bg-white text-[10px] text-slate-400 font-mono">
         <span>SCALE: {zoom}PX / 1M</span>
         <span>FRAME: ENU (X=East, Y=North)</span>
      </div>
    </Card>
  );
}