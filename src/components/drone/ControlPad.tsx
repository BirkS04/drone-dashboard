"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Joystick } from "@/components/ui/joystick";
import { Gamepad2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ControlPadProps {
  onMove: (x: number, y: number, z: number, yaw: number) => void;
  disabled?: boolean;
}

export function ControlPad({ onMove, disabled = false }: ControlPadProps) {
  // Input State Refs (für Loop Zugriff)
  const inputRef = useRef({ 
    x: 0, // Strafe (Right stick X)
    y: 0, // Forward (Right stick Y)
    z: 0, // Up (Left stick Y)
    yaw: 0 // Rotate (Left stick X)
  });

  const activeRef = useRef(false);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  // Start Loop
  const startLoop = () => {
    if (loopRef.current) return;
    activeRef.current = true;
    
    // 20Hz Loop
    loopRef.current = setInterval(() => {
       const { x, y, z, yaw } = inputRef.current;
       
       // Deadzone Check (sehr einfach, Joystick macht das evtl auch schon)
       const threshold = 0.05;
       const vX = Math.abs(x) > threshold ? x : 0;
       const vY = Math.abs(y) > threshold ? y : 0;
       const vZ = Math.abs(z) > threshold ? z : 0;
       const vYaw = Math.abs(yaw) > threshold ? yaw : 0;

       // Send command only if active or inputs non-zero
       // Eigentlich besser: immer senden wenn gehalten wird?
       // Commander expects Twist.
       // Wir senden kontinuierlich während Joystick aktiv.
       
       // Scaling inputs for "Move Relative" per tick
       // Commander move_speed (z.B. 1.0) is multiplier.
       // We pass normalised inputs (-1 to 1).
       
       onMove(vY, vX, vZ, -vYaw); // Yaw invertieren für intuitives Steuern (Links = Links drehen)
       // Mapping:
       // Right Joystick Up (Y+) -> Forward (x+)
       // Right Joystick Right (X+) -> Right (y+)
       // Left Joystick Up (Y+) -> Up (z+)
       // Left Joystick Right (X+) -> Yaw Right (negativ? NED?)
       // ROS Yaw: CCW pos. Right = CW negative. So Yaw Right = -1? 
       // Wir prüfen das im Flug.
       
    }, 50); // 50ms = 20Hz
  };

  const stopLoop = () => {
      // Keep sending a few zeros to stop ? 
      // Or just stop loop and send one stop.
      if (loopRef.current) {
          clearInterval(loopRef.current);
          loopRef.current = null;
      }
      activeRef.current = false;
      // Safety Stop
      onMove(0,0,0,0); 
  };
  
  // Cleanup
  useEffect(() => {
      return () => stopLoop();
  }, []);

  const handleLeftStick = (x: number, y: number) => {
      inputRef.current.yaw = x;
      inputRef.current.z = y;
      
      if (x === 0 && y === 0) {
          checkStop();
      } else {
          if (!loopRef.current) startLoop();
      }
  };
  const handleLeftStop = () => {
      inputRef.current.yaw = 0;
      inputRef.current.z = 0;
       // Wenn beide null, stop?
       checkStop();
  };

  const handleRightStick = (x: number, y: number) => {
      inputRef.current.x = x;
      inputRef.current.y = y;
      
      if (x === 0 && y === 0) {
          checkStop();
      } else {
          if (!loopRef.current) startLoop();
      }
  };
  const handleRightStop = () => {
      inputRef.current.x = 0;
      inputRef.current.y = 0;
      checkStop();
  };

  const checkStop = () => {
      const { x, y, z, yaw } = inputRef.current;
      if (x === 0 && y === 0 && z === 0 && yaw === 0) {
          // Kurzer Delay oder direkt stop
          // Sende Sicherheitshalber Stop
          stopLoop();
      }
  };
  
  const handleEmergency = () => {
      inputRef.current = { x:0, y:0, z:0, yaw:0 };
      stopLoop();
  };

  return (
    <Card className="shadow-[var(--shadow-1)] h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
           <Gamepad2 className="h-4 w-4" /> Pro Control
        </CardTitle>
        <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${disabled ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {disabled ? 'DISABLED' : 'ACTIVE'}
            </span>
            <Button variant="destructive" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold" onClick={handleEmergency}>
                STOP
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex items-center justify-between gap-4 relative">
         {disabled && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
                 <div className="bg-background text-muted-foreground border px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-xs font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Arm to Enable
                 </div>
            </div>
         )}
      
         {/* Left Stick: Altitude (Y) + Yaw (X) */}
         <Joystick 
            label="Left (Alt/Yaw)" 
            onMove={handleLeftStick} 
            onStop={handleLeftStop}
            stickColor="bg-slate-400"
         />

         {/* Center Info / Separator */}
         <div className="flex flex-col items-center justify-center gap-1 opacity-20">
             <div className="w-[1px] h-20 bg-slate-400" />
         </div>

         {/* Right Stick: Pos (Y) + Strafe (X) */}
         <Joystick 
            label="Right (Pos)" 
            onMove={handleRightStick} 
            onStop={handleRightStop}
         />
         
      </CardContent>
    </Card>
  );
}
