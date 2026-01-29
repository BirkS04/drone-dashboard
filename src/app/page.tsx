"use client";

import { useState, useEffect, useCallback } from "react";
import { useDrone } from "@/hooks/use-drone";
import { useTelemetryHistory } from "@/hooks/use-telemetry-history";
import { MissionHeader, TelemetryPanel, ControlPad } from "@/components/drone";
import { MotionGraph } from "@/components/drone/MotionGraph";
import { AltitudeGraph } from "@/components/drone/AltitudeGraph";
import { FlightMap } from "@/components/drone/FlightMap";
import { AttitudeWidget } from "@/components/drone/AttitudeWidget";
import { SpeedControl } from "@/components/drone/SpeedControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  } = useDrone();

  const { history, current: currentTelem } = useTelemetryHistory(200);

  // Widget Visibility State
  const [showGraphs, setShowGraphs] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showAttitude, setShowAttitude] = useState(true);

  const handleRtl = async () => {
    await setMode("RTL");
  };

  // Keyboard Control (WASD + Arrows)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isArmed) return;

    // Prevent scrolling for control keys
    if (["ArrowUp", "ArrowDown", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
    }

    const speed = 1.0; // Base multiplier, handled by backend param mostly but we send unitary vectors here
    
    switch (e.key) {
        case "w": // Forward
            move(speed, 0, 0);
            break;
        case "s": // Backward
            move(-speed, 0, 0);
            break;
        case "a": // Left
            move(0, speed, 0);
            break;
        case "d": // Right
            move(0, -speed, 0);
            break;
        case "ArrowUp": // Up
            move(0, 0, speed);
            break;
        case "ArrowDown": // Down
            move(0, 0, -speed);
            break;
        case "ArrowLeft": // Yaw Left
            // Yaw not yet implemented in move() interface fully (requires angular z), assume move() does linear only currently
            // Updating move to support angular would be needed for full control.
            // For now, let's keep linear.
            break;
        case "ArrowRight": // Yaw Right
            break;
    }
  }, [isArmed, move]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">MISSION CONTROL</h1>
                <p className="text-muted-foreground text-sm">
                    ROS 2 Humble / MAVROS Bridge / Connection: {isConnected ? <span className="text-green-500 font-bold">ONLINE</span> : <span className="text-red-500 font-bold">OFFLINE</span>}
                </p>
            </div>
            
            {/* Widget Toolbar */}
            <div className="flex items-center gap-4 bg-muted/40 p-2 rounded-lg border">
                <div className="flex items-center space-x-2">
                    <Switch id="show-graphs" checked={showGraphs} onCheckedChange={setShowGraphs} />
                    <Label htmlFor="show-graphs">Graphs</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-map" checked={showMap} onCheckedChange={setShowMap} />
                    <Label htmlFor="show-map">Map</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-attitude" checked={showAttitude} onCheckedChange={setShowAttitude} />
                    <Label htmlFor="show-attitude">Attitude</Label>
                </div>
            </div>
        </div>

        <Separator />

        {/* Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
                <MissionHeader
                  isArmed={isArmed}
                  mode={mode}
                  isConnected={isConnected}
                  onArm={arm}
                  onDisarm={disarm}
                  onTakeoff={() => takeoff(5)}
                  onLand={land}
                  onRtl={handleRtl}
                />
            </div>
            <div className="md:col-span-4">
                 <SpeedControl />
            </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Left Column: Flight Instruments (4 cols) */}
            <div className="md:col-span-4 space-y-4">
                <TelemetryPanel
                    altitude={altitude}
                    verticalSpeed={verticalSpeed}
                    battery={battery}
                />
                <ControlPad onMove={move} disabled={!isArmed || !isConnected} />
                
                {showAttitude && (
                    <AttitudeWidget 
                        roll={currentTelem?.roll ?? 0} 
                        pitch={currentTelem?.pitch ?? 0} 
                    />
                )}
            </div>

            {/* Middle/Right Column: Visualization (8 cols) */}
            <div className="md:col-span-8 grid grid-cols-1 gap-4">
                
                {/* Upper Row: Map & Altitude */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                    {showMap && <FlightMap data={history} current={currentTelem} />}
                    {showGraphs && <AltitudeGraph data={history} />}
                </div>

                {/* Lower Row: Motion Graph */}
                {showGraphs && (
                    <div className="h-[250px]">
                        <MotionGraph data={history} />
                    </div>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}
