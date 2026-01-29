"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface MotionGraphProps {
  data: TelemetryDataPoint[];
}

export function MotionGraph({ data }: MotionGraphProps) {
  return (
    <Card className="shadow-[var(--shadow-1)] h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Motion Vectors (Velocity m/s)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} fontSize={10} tickFormatter={(val) => val.toFixed(1)} />
            <Tooltip 
                labelFormatter={() => ''}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <Legend iconType="line" />
            <Line type="monotone" dataKey="vx" stroke="#3b82f6" dot={false} strokeWidth={2} name="Vel X" isAnimationActive={false} />
            <Line type="monotone" dataKey="vy" stroke="#10b981" dot={false} strokeWidth={2} name="Vel Y" isAnimationActive={false} />
            <Line type="monotone" dataKey="vz" stroke="#f43f5e" dot={false} strokeWidth={2} name="Vel Z" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
