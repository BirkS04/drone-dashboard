"use client";

import { Plane, Shield, ShieldOff, Rocket, Home, Activity, Map as MapIcon, Compass, Gauge, Rabbit, Turtle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import type { DroneMode } from "@/types/drone";

interface CommandCenterProps {
  isArmed: boolean;
  mode: DroneMode;
  isConnected: boolean;
  moveSpeed: number; // current speed param
  onArm: () => void;
  onDisarm: () => void;
  onTakeoff: () => void;
  onLand: () => void;
  onRtl: () => void;
  onSpeedChange: (val: number) => void;
  // Toggles
  showGraphs: boolean;
  setShowGraphs: (v: boolean) => void;
  showMap: boolean;
  setShowMap: (v: boolean) => void;
  showAttitude: boolean;
  setShowAttitude: (v: boolean) => void;
  show3D: boolean;
  setShow3D: (v: boolean) => void;
}

export function CommandCenter({
  isArmed,
  mode,
  isConnected,
  moveSpeed,
  onArm,
  onDisarm,
  onTakeoff,
  onLand,
  onRtl,
  onSpeedChange,
  showGraphs,
  setShowGraphs,
  showMap,
  setShowMap,
  showAttitude,
  setShowAttitude,
  show3D, 
  setShow3D
}: CommandCenterProps) {
  return (
    <Card className="shadow-[var(--shadow-2)] h-full flex flex-col justify-center">
      <CardContent className="p-4 space-y-4">
        {/* Top Row: Status & Main Actions */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            {/* Left: Status */}
            <div className="flex items-center gap-3">
                 <Badge variant={isConnected ? "default" : "destructive"} className="px-2 py-1">
                    {isConnected ? "ONLINE" : "OFFLINE"}
                 </Badge>
                 <Badge variant="outline" className="px-3 py-1 font-mono text-sm border-2">
                    {mode}
                 </Badge>
                 <Badge 
                    className={`px-3 py-1 font-bold ${isArmed ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-slate-500"}`}
                 >
                    {isArmed ? "ARMED" : "DISARMED"}
                 </Badge>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                 {isArmed ? (
                    <Button size="sm" variant="destructive" onClick={onDisarm} disabled={!isConnected}>
                        <ShieldOff className="h-4 w-4 mr-1" /> KILL
                    </Button>
                 ) : (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onArm} disabled={!isConnected}>
                        <Shield className="h-4 w-4 mr-1" /> ARM
                    </Button>
                 )}
                 <Separator orientation="vertical" className="h-6 mx-1" />
                 <Button size="sm" variant="outline" onClick={onTakeoff} disabled={!isArmed}>
                    <Rocket className="h-4 w-4 mr-1" /> T.O.
                 </Button>
                 <Button size="sm" variant="outline" onClick={onLand} disabled={!isArmed}>
                    <Plane className="h-4 w-4 mr-1 rotate-90" /> LAND
                 </Button>
                 <Button size="sm" variant="ghost" onClick={onRtl}>
                    <Home className="h-4 w-4" />
                 </Button>
            </div>
        </div>

        <Separator />

        {/* Bottom Row: Speed & View Toggles */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            {/* Speed Slider */}
            <div className="flex items-center gap-3 flex-1 w-full xl:w-auto">
                <Turtle className="h-4 w-4 text-muted-foreground" />
                <Slider 
                    value={[moveSpeed]} 
                    max={5.0} 
                    step={0.5} 
                    className="w-full xl:w-[200px]" 
                    onValueCommit={(v) => onSpeedChange(v[0])} 
                />
                <Rabbit className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs w-8 text-right">{moveSpeed}x</span>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-1">
                <Toggle pressed={showGraphs} onPressedChange={setShowGraphs} size="sm" aria-label="Toggle Graphs">
                    <Activity className="h-4 w-4" />
                </Toggle>
                <Toggle pressed={showMap} onPressedChange={setShowMap} size="sm" aria-label="Toggle Map">
                    <MapIcon className="h-4 w-4" />
                </Toggle>
                <Toggle pressed={showAttitude} onPressedChange={setShowAttitude} size="sm" aria-label="Toggle Attitude">
                    <Gauge className="h-4 w-4" />
                </Toggle>
                <Toggle pressed={show3D} onPressedChange={setShow3D} size="sm" aria-label="Toggle 3D">
                    <Compass className="h-4 w-4" />
                </Toggle>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
