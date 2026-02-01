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
import { Card } from "@/components/ui/card";

export default function Home() {
  const {
    isConnected,
    isArmed,
    mode,
    battery,
    altitude,
    verticalSpeed,
    arm,
    disarm,
    takeoff,
    land,
    move,
    setMode,
    setMoveSpeed,
    cameraImage,
  } = useDrone();

  const { history, current: currentTelem } = useTelemetryHistory(150);

  // Widget Visibility State
  // Graphs are now individually toggleable, but we track their "active" state
  const [showMotion, setShowMotion] = useState(true);
  const [showAltitude, setShowAltitude] = useState(true);
  
  // These are general toggles from the top bar (which we might simplify now)
  const [showMap, setShowMap] = useState(true); // Toggles the whole spatial column? Or just map?
  const [show3D, setShow3D] = useState(true);

  // Speed State for UI - Ensure we initialize effectively
  const [speedVal, setSpeedVal] = useState(1.0);

  const handleRtl = async () => {
    await setMode("RTL");
  };

  const handleSpeedChange = (val: number) => {
      // Immediate UI update
      setSpeedVal(val);
      // Debounced or direct backend call
      setMoveSpeed(val);
  };
    
  // ... KeyDown logic remains same ...
  // Keyboard Control (WASD + Arrows + QE)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isArmed) return;
    if (["ArrowUp", "ArrowDown", "w", "a", "s", "d", "q", "e", " "].includes(e.key)) e.preventDefault();

    const s = speedVal; 
    
    // NOTE: Keyboard needs continuous press handling for smooth flight. 
    // Currently, this triggers once per key repeat.
    // Ideally we track keysPressed set. But for now, simple mapping:
    
    switch (e.key) {
        case "w": move(s, 0, 0, 0); break; // Fwd
        case "s": move(-s, 0, 0, 0); break; // Back
        case "a": move(0, s, 0, 0); break; // Left
        case "d": move(0, -s, 0, 0); break; // Right
        case "q": move(0, 0, 0, 0.5); break; // Yaw Left (pos)
        case "e": move(0, 0, 0, -0.5); break; // Yaw Right (neg)
        case "ArrowUp": move(0, 0, s, 0); break; // Up
        case "ArrowDown": move(0, 0, -s, 0); break; // Down
        case " ": move(0, 0, 0, 0); break; // STOP
    }
  }, [isArmed, move, speedVal]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <main className="min-h-screen bg-background p-4 h-screen flex flex-col overflow-hidden">
        <div className="flex-1 grid grid-cols-6 grid-rows-5 gap-4 min-h-0">
            
            {/* 1: Header & Telemetry (Col 1-4, Row 1) */}
            <div className="col-span-4 row-span-1 flex gap-4 min-h-0">
                 <div className="w-2/3 h-full">
                    <CommandCenter 
                        isArmed={isArmed}
                        isConnected={isConnected}
                        mode={mode}
                        moveSpeed={speedVal}
                        onArm={arm}
                        onDisarm={disarm}
                        onLand={land}
                        onTakeoff={() => takeoff(5)}
                        onRtl={handleRtl}
                        onSpeedChange={handleSpeedChange}
                        showGraphs={showMotion || showAltitude} 
                        setShowGraphs={(v) => { setShowMotion(v); setShowAltitude(v); }}
                        showMap={showMap}
                        setShowMap={setShowMap}
                        showAttitude={false} 
                        setShowAttitude={() => {}}
                        show3D={show3D}
                        setShow3D={setShow3D}
                    />
                 </div>
                 <div className="w-1/3 h-full">
                    <TelemetryPanel 
                        altitude={altitude}
                        verticalSpeed={verticalSpeed}
                        battery={battery}
                    />
                 </div>
            </div>

            {/* 2: Flight Map (Col 1-2, Row 2-3) */}
            <div className="col-span-2 row-span-2 col-start-1 row-start-2 min-h-0">
                <FlightMap data={history} current={currentTelem} />
            </div>

            {/* 3: 3D Orientation (Col 1-2, Row 4-5) */}
            <div className="col-span-2 row-span-2 col-start-1 row-start-4 min-h-0">
                <Orientation3D 
                    roll={currentTelem?.roll ?? 0}
                    pitch={currentTelem?.pitch ?? 0}
                    yaw={currentTelem?.yaw ?? 0}
                />
            </div>

            {/* 4: Graphs (Col 3-4, Row 2-5) */}
            <div className="col-span-2 row-span-4 col-start-3 row-start-2 min-h-0 flex flex-col gap-4">
                 <div className="flex-1 min-h-0">
                    <MotionGraph 
                        data={history} 
                        active={showMotion} 
                        onToggle={setShowMotion}
                    />
                 </div>
                 <div className="flex-1 min-h-0">
                    <AltitudeGraph 
                        data={history} 
                        active={showAltitude}
                        onToggle={setShowAltitude}
                    />
                 </div>
            </div>

            {/* 5: Controls (Col 5-6, Row 1-5 [Full Height]) */}
            <div className="col-span-2 row-span-5 col-start-5 row-start-1 min-h-0 flex flex-col gap-4">
                 {/* Top Half: Placeholder for Video/Future */}
                <div className="flex-1 min-h-0 relative">
                     {cameraImage ? (
                       <img 
                         src={cameraImage} 
                         alt="Drone Live Feed" 
                         className="w-full h-full object-cover rounded-lg"
                       />
                     ) : (
                       <Card className="h-full bg-slate-950/50 flex flex-col items-center justify-center border-dashed">
                           <span className="text-muted-foreground text-sm">
                             {isConnected ? "Warte auf Kamera..." : "ROS nicht verbunden"}
                           </span>
                       </Card>
                     )}
                 </div>
                 
                 {/* Bottom Half: Control Pad */}
                 <div className="h-[400px] shrink-0">
                     <ControlPad onMove={move} disabled={!isArmed} />
                 </div>
            </div>

        </div>
    </main>
  );
}
