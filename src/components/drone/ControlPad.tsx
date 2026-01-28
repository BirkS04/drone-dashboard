"use client";

import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ControlPadProps {
  onMove: (x: number, y: number, z: number) => void;
  disabled?: boolean;
}

/** Bewegungsschrittweite in Metern */
const MOVE_STEP = 1.0;

export function ControlPad({ onMove, disabled = false }: ControlPadProps) {
  return (
    <Card className="shadow-[var(--shadow-1)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Steuerung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 items-start justify-center">
          {/* Horizontale Steuerung (XY) */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground mb-2">Position</p>
            
            {/* Forward */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMove(MOVE_STEP, 0, 0)}
              disabled={disabled}
              className="h-12 w-12"
            >
              <ArrowUp className="h-6 w-6" />
            </Button>

            {/* Left - Right */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMove(0, MOVE_STEP, 0)}
                disabled={disabled}
                className="h-12 w-12"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div className="h-12 w-12 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-muted" />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMove(0, -MOVE_STEP, 0)}
                disabled={disabled}
                className="h-12 w-12"
              >
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Backward */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMove(-MOVE_STEP, 0, 0)}
              disabled={disabled}
              className="h-12 w-12"
            >
              <ArrowDown className="h-6 w-6" />
            </Button>
          </div>

          {/* Vertikale Steuerung (Z) */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground mb-2">Höhe</p>
            
            {/* Up */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMove(0, 0, MOVE_STEP)}
              disabled={disabled}
              className="h-12 w-12"
            >
              <ChevronUp className="h-6 w-6" />
            </Button>

            {/* Spacer */}
            <div className="h-12 w-12 flex items-center justify-center">
              <div className="h-8 w-0.5 bg-muted rounded-full" />
            </div>

            {/* Down */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMove(0, 0, -MOVE_STEP)}
              disabled={disabled}
              className="h-12 w-12"
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Schrittweite: {MOVE_STEP}m
        </p>
      </CardContent>
    </Card>
  );
}
