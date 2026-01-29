"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightMapProps {
  data: TelemetryDataPoint[];
  current?: TelemetryDataPoint | null;
}

export function FlightMap({ data, current }: FlightMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit logic vars
  const scaleRef = useRef(20); // pixels per meter
  const offsetRef = useRef({ x: 150, y: 150 }); // center offset

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas
    if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        offsetRef.current = { x: canvas.width / 2, y: canvas.height / 2 };
    }

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    const gridSize = 50;
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw Origin
    ctx.fillStyle = "#666";
    ctx.beginPath();
    const originX = offsetRef.current.x;
    const originY = offsetRef.current.y;
    ctx.arc(originX, originY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Coord Helper
    const toCanvas = (dx: number, dy: number) => ({
      x: offsetRef.current.x + dx * scaleRef.current,
      y: offsetRef.current.y - dy * scaleRef.current // Invert Y (ROS y+ is left usually in local NED vs ENU, assuming ENU here from MAVROS)
      // MAVROS local_position/pose is ENU (East North Up).
      // Canvas Y is down. So y+ (North) should go UP on canvas (subtract Y).
    });

    // Draw Path
    if (data.length > 1) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Start from oldest available point
      const start = toCanvas(data[0].x, data[0].y);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < data.length; i++) {
        const p = toCanvas(data[i].x, data[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Draw Drone Arrow
    const pos = toCanvas(current.x, current.y);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    // ROS Yaw is counter-clockwise from East (0). Canvas is clockwise.
    // We need to rotate context. -Yaw usually works for ENU -> Screen.
    ctx.rotate(-current.yaw); // standard text book rotation correction might be needed

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(10, 0); // Nose
    ctx.lineTo(-5, 5);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw current coord text
    ctx.fillStyle = "#aaa";
    ctx.font = "10px monospace";
    ctx.fillText(`X: ${current.x.toFixed(1)} m`, 10, 20);
    ctx.fillText(`Y: ${current.y.toFixed(1)} m`, 10, 35);

  }, [data, current]);

  const handleResetView = () => {
    // optional reset logic
  };

  return (
    <Card className="shadow-[var(--shadow-1)] h-full flex flex-col">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Flight Path (Top Down)
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleResetView}>
             <Maximize2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative min-h-[250px]" ref={containerRef}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </CardContent>
    </Card>
  );
}
