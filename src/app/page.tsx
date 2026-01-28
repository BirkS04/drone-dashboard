"use client";

import { useDrone } from "@/hooks/use-drone";
import { MissionHeader, TelemetryPanel, ControlPad } from "@/components/drone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

  const handleRtl = async () => {
    await setMode("RTL");
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Drohnen-Steuerung
          </h1>
          <p className="text-muted-foreground">
            Echtzeit-Kontrolle und Telemetrie für MAVROS-kompatible Drohnen
          </p>
        </div>

        <Separator />

        {/* Mission Header / Status Bar */}
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

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Telemetry Panel */}
          <TelemetryPanel
            altitude={altitude}
            verticalSpeed={verticalSpeed}
            battery={battery}
          />

          {/* Control Pad */}
          <ControlPad onMove={move} disabled={!isArmed || !isConnected} />

          {/* System Info Card */}
          <Card className="shadow-[var(--shadow-1)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System-Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ROS Bridge</span>
                <span className="text-sm font-mono">ws://localhost:9090</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Commander Node</span>
                <span className="text-sm font-mono">/commander</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">MAVROS</span>
                <span className="text-sm font-mono">/mavros</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Drohnen-Steuerung v0.1 • ROS 2 Humble • MAVROS
          </p>
        </div>
      </div>
    </main>
  );
}
