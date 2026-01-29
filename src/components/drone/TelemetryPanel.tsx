"use client";

import { Gauge, ArrowUpDown, Battery, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TelemetryPanelProps {
  altitude: number;
  verticalSpeed: number;
  battery: number;
}

export function TelemetryPanel({
  altitude,
  verticalSpeed,
  battery,
}: TelemetryPanelProps) {
  const batteryColor =
    battery < 20 ? "text-destructive" : battery < 50 ? "text-chart-5" : "text-emerald-500";
    
  return (
    <Card className="shadow-[var(--shadow-2)] h-full">
      <CardContent className="p-4 h-full flex flex-col justify-center gap-3">
        
        {/* Row 1: Altitude & VSpeed */}
        <div className="grid grid-cols-2 gap-4">
            <div className=" p-2 rounded-md border flex flex-col items-center">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Altitude</span>
                <span className="text-2xl font-bold font-mono tracking-tighter">{altitude.toFixed(1)}<span className="text-xs text-muted-foreground ml-1">m</span></span>
            </div>
            <div className="p-2 rounded-md border flex flex-col items-center">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">V. Speed</span>
                <div className="flex items-center gap-1">
                    {verticalSpeed > 0.1 && <ArrowUpDown className="h-3 w-3 text-emerald-500" />}
                    <span className={`text-xl font-bold font-mono tracking-tighter ${Math.abs(verticalSpeed) > 0.5 ? 'text-blue-400' : ''}`}>
                        {verticalSpeed.toFixed(1)}
                    </span>
                </div>
            </div>
        </div>

        {/* Row 2: Battery */}
        <div className=" p-2 rounded-md border">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1">
                    <Battery className={`h-3 w-3 ${batteryColor}`} />
                    <span className="text-[10px] uppercase text-muted-foreground">Battery</span>
                </div>
                <span className={`text-sm font-bold font-mono ${batteryColor}`}>{battery}%</span>
            </div>
            <Progress value={battery} className="h-1.5" indicatorClassName={battery < 20 ? "bg-destructive" : "bg-emerald-500"} />
        </div>

      </CardContent>
    </Card>
  );
}
