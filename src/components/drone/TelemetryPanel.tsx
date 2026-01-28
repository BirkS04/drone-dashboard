"use client";

import { Gauge, ArrowUpDown, Battery } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { DroneTelemetry } from "@/types/drone";

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
    battery < 20 ? "text-destructive" : battery < 50 ? "text-chart-5" : "text-chart-2";
  const batteryBg = battery < 20 ? "bg-destructive" : "";

  return (
    <Card className="shadow-[var(--shadow-1)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Telemetrie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Altitude */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Höhe</p>
            <p className="text-2xl font-bold font-mono">{altitude.toFixed(2)} m</p>
          </div>
          <Badge variant="outline" className="font-mono">
            ALT
          </Badge>
        </div>

        {/* Vertical Speed */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Vertikalgeschwindigkeit
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <p className="text-xl font-bold font-mono">
                {verticalSpeed > 0 ? "+" : ""}
                {verticalSpeed.toFixed(2)} m/s
              </p>
            </div>
          </div>
          <Badge
            variant={verticalSpeed > 0 ? "default" : verticalSpeed < 0 ? "secondary" : "outline"}
          >
            {verticalSpeed > 0 ? "↑" : verticalSpeed < 0 ? "↓" : "—"}
          </Badge>
        </div>

        {/* Battery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`h-4 w-4 ${batteryColor}`} />
              <p className="text-sm font-medium text-muted-foreground">Batterie</p>
            </div>
            <p className={`text-lg font-bold font-mono ${batteryColor}`}>
              {battery}%
            </p>
          </div>
          <Progress value={battery} className={`h-2 ${batteryBg}`} />
        </div>
      </CardContent>
    </Card>
  );
}
