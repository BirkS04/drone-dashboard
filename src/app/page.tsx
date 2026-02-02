"use client";

import { useState, useEffect, useCallback } from "react";
import { useDrone } from "@/hooks/use-drone";
import { useTelemetryHistory } from "@/hooks/use-telemetry-history";
import { TelemetryPanel } from "@/components/drone";
import { CommandCenter } from "@/components/drone/CommandCenter";
import { Orientation3D } from "@/components/drone/Orientation3D";
import { MotionGraph } from "@/components/drone/MotionGraph";
import { AltitudeGraph } from "@/components/drone/AltitudeGraph";
import { FlightMap } from "@/components/drone/FlightMap";
import { ControlPad } from "@/components/drone/ControlPad";
import { LidarSLAMView } from "@/components/drone/LidarSLAMView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, LayoutDashboard } from "lucide-react";

export default function Home() {
  const {
    isConnected, isArmed, mode, battery, altitude, verticalSpeed,
    arm, disarm, takeoff, land, move, setMode, setMoveSpeed,
    cameraImage, lidarData, pose
  } = useDrone();

  const { history, current: currentTelem } = useTelemetryHistory(150);
  const [speedVal, setSpeedVal] = useState(1.0);
  
  // State für den aktiven Graph (Motion vs Altitude)
  const [activeGraph, setActiveGraph] = useState<"MOTION" | "ALTITUDE">("MOTION");

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isArmed) return;
    const s = speedVal; 
    switch (e.key) {
        case "w": move(s, 0, 0, 0); break;
        case "s": move(-s, 0, 0, 0); break;
        case "a": move(0, s, 0, 0); break;
        case "d": move(0, -s, 0, 0); break;
        case "q": move(0, 0, 0, 0.5); break;
        case "e": move(0, 0, 0, -0.5); break;
        case "ArrowUp": move(0, 0, s, 0); break;
        case "ArrowDown": move(0, 0, -s, 0); break;
        case " ": move(0, 0, 0, 0); break;
    }
  }, [isArmed, move, speedVal]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="min-h-screen bg-background p-4 h-screen flex flex-col overflow-hidden">
        <div className="flex-1 grid grid-cols-6 grid-rows-5 gap-4 min-h-0">
            
            {/* 1: HEADER & TELEMETRY (Oben links/mitte) */}
            <div className="col-span-4 row-span-1 flex gap-4 min-h-0">
                 <div className="w-2/3 h-full">
                    <CommandCenter 
                        isArmed={isArmed} isConnected={isConnected} mode={mode} moveSpeed={speedVal}
                        onArm={arm} onDisarm={disarm} onLand={land} onTakeoff={() => takeoff(5)}
                        onRtl={() => setMode("RTL")} onSpeedChange={(v) => { setSpeedVal(v); setMoveSpeed(v); }}
                        showGraphs={true} setShowGraphs={() => {}} showMap={true} setShowMap={() => {}} 
                        showAttitude={false} setShowAttitude={() => {}} show3D={true} setShow3D={() => {}}
                    />
                 </div>
                 <div className="w-1/3 h-full">
                    <TelemetryPanel altitude={altitude} verticalSpeed={verticalSpeed} battery={battery} />
                 </div>
            </div>

            {/* 2: FLIGHT MAP (Mitte links) */}
            <div className="col-span-2 row-span-2 col-start-1 row-start-2 min-h-0">
                <FlightMap data={history} current={currentTelem} />
            </div>

            {/* 3: CONTROL PAD (Mitte zentrum) - NEUER PLATZ */}
            <div className="col-span-2 row-span-2 col-start-3 row-start-2 min-h-0">
                <ControlPad onMove={move} disabled={!isArmed} />
            </div>

            {/* 4: 3D ORIENTATION / HUD (Unten links) */}
            <div className="col-span-2 row-span-2 col-start-1 row-start-4 min-h-0">
                <Orientation3D roll={currentTelem?.roll ?? 0} pitch={currentTelem?.pitch ?? 0} yaw={currentTelem?.yaw ?? 0} />
            </div>

            {/* 5: MERGED GRAPHS MIT HOVER-SWITCH (Unten zentrum) - NEUER PLATZ */}
            <div className="col-span-2 row-span-2 col-start-3 row-start-4 min-h-0 relative group">
                 
                 {/* Floating Switcher (Erscheint nur bei Hover) */}
                 <div className="absolute top-2 right-4 z-30 flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Button 
                        size="sm" 
                        variant={activeGraph === "MOTION" ? "default" : "ghost"} 
                        className="h-6 text-[9px] px-2" 
                        onClick={() => setActiveGraph("MOTION")}
                    >
                        <Activity className="w-3 h-3 mr-1" /> MOTION
                    </Button>
                    <Button 
                        size="sm" 
                        variant={activeGraph === "ALTITUDE" ? "default" : "ghost"} 
                        className="h-6 text-[9px] px-2" 
                        onClick={() => setActiveGraph("ALTITUDE")}
                    >
                        <LayoutDashboard className="w-3 h-3 mr-1" /> ALTITUDE
                    </Button>
                 </div>

                 {/* Graph Rendering */}
                 <div className="w-full h-full">
                    {activeGraph === "MOTION" ? (
                        <MotionGraph data={history} active={true} onToggle={() => {}} />
                    ) : (
                        <AltitudeGraph data={history} active={true} onToggle={() => {}} />
                    )}
                 </div>
            </div>

            {/* 6: VISUAL FEEDS (Komplette rechte Spalte) */}
            <div className="col-span-2 row-span-5 col-start-5 row-start-1 min-h-0 flex flex-col gap-4">
                
                {/* KAMERA (Oben - 40% Höhe) */}
                <div className="h-[40%] min-h-0 relative">
                    <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider shadow-sm">
                        Live Vision
                    </div>
                    {cameraImage ? (
                        <img 
                          src={cameraImage} 
                          alt="Drone Camera" 
                          className="w-full h-full object-cover rounded-xl border border-slate-800 shadow-xl bg-black" 
                        />
                    ) : (
                        <Card className="h-full bg-slate-900/40 flex items-center justify-center border-dashed border-slate-800 text-slate-500 text-xs italic">
                            Vision Proxy Offline...
                        </Card>
                    )}
                </div>
                 
                {/* LIDAR SLAM (Unten - 60% Höhe) */}
                <div className="h-[60%] min-h-0">
                     <LidarSLAMView ranges={lidarData} pose={pose} />
                </div>
            </div>

        </div>
    </main>
  );
}