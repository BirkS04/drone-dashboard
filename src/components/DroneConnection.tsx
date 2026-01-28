"use client";
import { useRos } from "@/hooks/useRos";

export default function DroneConnection() {
  const { isConnected } = useRos();

  return (
    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow">
      <h3 className="font-semibold leading-none tracking-tight">System Status</h3>
      <div className="mt-4 flex items-center gap-2">
        <span className={`relative flex h-3 w-3`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        </span>
        <p className="text-sm text-muted-foreground">
            {isConnected ? "Verbunden mit ROS 2 Bridge" : "Keine Verbindung zur Drohne"}
        </p>
      </div>
    </div>
  );
}