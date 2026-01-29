"use client";

import { Card } from "@/components/ui/card";
import { TelemetryDataPoint } from "@/hooks/use-telemetry-history";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { Switch } from "@/components/ui/switch";

interface MotionGraphProps {
  data: TelemetryDataPoint[];
  active?: boolean;
  onToggle?: (v: boolean) => void;
}

// Custom Tooltip für den "Apple" Look
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 shadow-xl rounded-xl">
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {entry.value.toFixed(2)} m/s
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function MotionGraph({ data, active = true, onToggle }: MotionGraphProps) {
  // Letzte Werte für die Legende extrahieren
  const lastPoint = data[data.length - 1] || { vx: 0, vy: 0, vz: 0 };

  return (
    <Card className={`group relative shadow-[var(--shadow-1)] border-slate-200 dark:border-slate-800 h-full transition-all duration-500 overflow-hidden ${!active ? 'opacity-40 grayscale' : 'opacity-100'}`}>
      
      {/* Header Bereich */}
      <div className="p-4 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Motion Vectors</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">{lastPoint.vx?.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">{lastPoint.vy?.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">{lastPoint.vz?.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        {onToggle && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] font-bold text-slate-400 uppercase px-1">{active ? 'Live' : 'Off'}</span>
                <Switch 
                    checked={active} 
                    onCheckedChange={onToggle} 
                    className="scale-75 data-[state=checked]:bg-blue-500"
                />
            </div>
        )}
      </div>

      {/* Graph Bereich */}
      <div className="h-[180px] w-full pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorVz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" dark-stroke="#1e293b" opacity={0.5} />
            
            <XAxis dataKey="time" hide />
            <YAxis 
                axisLine={false}
                tickLine={false}
                fontSize={9} 
                tick={{fill: '#94a3b8'}}
                domain={['auto', 'auto']} 
                tickFormatter={(val) => val.toFixed(1)} 
            />
            
            <Tooltip content={<CustomTooltip />} />

            <Area 
                type="monotone" 
                dataKey="vx" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVx)" 
                name="Vel X"
                isAnimationActive={false} 
            />
            <Area 
                type="monotone" 
                dataKey="vy" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVy)" 
                name="Vel Y"
                isAnimationActive={false} 
            />
            <Area 
                type="monotone" 
                dataKey="vz" 
                stroke="#f43f5e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVz)" 
                name="Vel Z"
                isAnimationActive={false} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}