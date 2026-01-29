"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";

interface AttitudeWidgetProps {
  roll: number; // radians
  pitch: number; // radians
}

export function AttitudeWidget({ roll, pitch }: AttitudeWidgetProps) {
  // Convert to degrees for CSS rotation
  const rollDeg = (roll * 180) / Math.PI;
  const pitchDeg = (pitch * 180) / Math.PI;

  return (
    <Card className="shadow-[var(--shadow-1)] h-full overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Attitude (Artificial Horizon)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex items-center justify-center relative h-[200px]">
        {/* Outer Ring */}
        <div className="w-32 h-32 rounded-full border-4 border-muted overflow-hidden relative shadow-inner bg-sky-900">
            {/* Horizon Line / Ground */}
            <div 
                className="absolute w-[200%] h-[200%] bg-emerald-800 transition-transform duration-100 ease-linear origin-center"
                style={{
                    top: '50%',
                    left: '-50%',
                    transform: `rotate(${-rollDeg}deg) translateY(${pitchDeg * 2}px)`
                }}
            >
                <div className="w-full h-[50%] bg-sky-500 border-b-2 border-white/50"></div>
                <div className="w-full h-[50%] bg-amber-900/80"></div>
            </div>

            {/* Crosshair (Fixed) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-[2px] bg-yellow-400/80"></div>
                <div className="h-10 w-[2px] bg-yellow-400/80 absolute"></div>
            </div>
        </div>

        {/* Text Stats */}
        <div className="absolute bottom-2 left-4 text-xs font-mono space-y-1">
            <div className="text-blue-400">R: {rollDeg.toFixed(1)}°</div>
            <div className="text-emerald-400">P: {pitchDeg.toFixed(1)}°</div>
        </div>
      </CardContent>
    </Card>
  );
}
