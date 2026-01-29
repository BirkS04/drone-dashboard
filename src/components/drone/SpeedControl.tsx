"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useDrone } from "@/hooks/use-drone";
import { Badge } from "@/components/ui/badge";
import { Rabbit, Turtle } from "lucide-react";

export function SpeedControl() {
  const { setMoveSpeed } = useDrone(); // We need to add this to useDrone
  const [speed, setSpeed] = useState([1.0]);

  const handleValueChange = (val: number[]) => {
    setSpeed(val);
  };

  const handleCommit = (val: number[]) => {
      setMoveSpeed(val[0]);
  };

  return (
    <Card className="shadow-[var(--shadow-0)] bg-transparent border-0">
      <CardContent className="p-0 flex items-center gap-4">
        <Turtle className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
            <Slider 
                defaultValue={[1.0]} 
                max={5.0} 
                step={0.1}
                value={speed}
                onValueChange={handleValueChange}
                onValueCommit={handleCommit}
                className="w-full"
            />
        </div>
        <Rabbit className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="w-16 justify-center font-mono">
           {speed[0].toFixed(1)}x
        </Badge>
      </CardContent>
    </Card>
  );
}
