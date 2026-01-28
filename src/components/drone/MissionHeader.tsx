"use client";

import { Plane, Shield, ShieldOff, Rocket, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DroneMode } from "@/types/drone";

interface MissionHeaderProps {
  isArmed: boolean;
  mode: DroneMode;
  isConnected: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onTakeoff: () => void;
  onLand: () => void;
  onRtl: () => void;
}

export function MissionHeader({
  isArmed,
  mode,
  isConnected,
  onArm,
  onDisarm,
  onTakeoff,
  onLand,
  onRtl,
}: MissionHeaderProps) {
  return (
    <Card className="shadow-[var(--shadow-2)]">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Badges */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? "bg-chart-2" : "bg-destructive"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isConnected ? "bg-chart-2" : "bg-destructive"
                  }`}
                />
              </span>
              <span className="text-sm text-muted-foreground">
                {isConnected ? "Verbunden" : "Getrennt"}
              </span>
            </div>

            {/* Armed Status */}
            <Badge
              variant={isArmed ? "default" : "secondary"}
              className={`text-base px-4 py-1 ${
                isArmed
                  ? "bg-chart-5 text-primary-foreground hover:bg-chart-5/90"
                  : ""
              }`}
            >
              {isArmed ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  ARMED
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  DISARMED
                </>
              )}
            </Badge>

            {/* Mode */}
            <Badge variant="outline" className="text-base px-4 py-1 font-mono">
              <Plane className="h-4 w-4 mr-2" />
              {mode}
            </Badge>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* ARM / DISARM */}
            {isArmed ? (
              <Button
                variant="destructive"
                onClick={onDisarm}
                disabled={!isConnected}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                DISARM
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={onArm}
                disabled={!isConnected}
              >
                <Shield className="h-4 w-4 mr-2" />
                ARM
              </Button>
            )}

            {/* TAKEOFF */}
            <Button
              variant="default"
              onClick={onTakeoff}
              disabled={!isConnected || !isArmed}
            >
              <Rocket className="h-4 w-4 mr-2" />
              TAKEOFF 5m
            </Button>

            {/* LAND */}
            <Button
              variant="secondary"
              onClick={onLand}
              disabled={!isConnected || !isArmed}
            >
              <Plane className="h-4 w-4 mr-2 rotate-90" />
              LAND
            </Button>

            {/* RTL */}
            <Button
              variant="outline"
              onClick={onRtl}
              disabled={!isConnected}
            >
              <Home className="h-4 w-4 mr-2" />
              RTL
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
