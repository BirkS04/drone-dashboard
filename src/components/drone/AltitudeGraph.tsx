"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { Switch } from "@/components/ui/switch";

interface AltitudeGraphProps {
  data: TelemetryDataPoint[];
  active?: boolean;
  onToggle?: (v: boolean) => void;
}

export function AltitudeGraph({ data, active = true, onToggle }: AltitudeGraphProps) {
  return (
    <Card className={`shadow-[var(--shadow-1)] h-full transition-all duration-300 ${!active && 'opacity-50 grayscale'}`}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Altitude (m)
        </CardTitle>
        {onToggle && (
            <Switch 
                checked={active} 
                onCheckedChange={onToggle} 
                className="scale-75"
            />
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} fontSize={10} tickFormatter={(val) => val.toFixed(1)} />
            <Tooltip 
                labelFormatter={() => ''}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <Area type="monotone" dataKey="ax" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAlt)" isAnimationActive={false} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
