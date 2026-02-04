"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LidarSLAMViewProps {
  ranges?: number[];
  slamPoints?: Float32Array | null;
  pose: {
    x: number; y: number; z: number;
    orientation: { x: number; y: number; z: number; w: number };
  };
}

export function LidarSLAMView({ ranges, slamPoints, pose }: LidarSLAMViewProps) {
  const [pointBuffer, setPointBuffer] = useState<number[]>([]);
  const MAX_POINTS = 60000; // Etwas reduziert für flüssige 60 FPS im Web

  // 1. FAST LIO 3D Punkte verarbeiten
  useEffect(() => {
    if (!slamPoints || slamPoints.length === 0) return;
    
    setPointBuffer(prev => {
      const newPoints = Array.from(slamPoints);
      const combined = [...prev, ...newPoints];
      // FIFO: Wenn das Limit erreicht ist, alte Punkte entfernen
      if (combined.length > MAX_POINTS * 3) {
        return combined.slice(newPoints.length);
      }
      return combined;
    });
  }, [slamPoints]);

  // 2. ALTES 2D Lidar verarbeiten (Abwärtskompatibilität)
  useEffect(() => {
    if (!ranges || ranges.length === 0 || slamPoints) return;

    const newWorldPoints: number[] = [];
    const angleStep = (Math.PI * 2) / ranges.length;
    const droneQuat = new THREE.Quaternion(pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w);

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (r < 0.2 || r > 15 || isNaN(r)) continue;
      const angle = -Math.PI + (i * angleStep);
      const lp = new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0).applyQuaternion(droneQuat);
      newWorldPoints.push(lp.x + pose.x, lp.y + pose.y, lp.z + pose.z);
    }

    setPointBuffer(prev => {
      const combined = [...prev, ...newWorldPoints];
      if (combined.length > MAX_POINTS * 3) return combined.slice(newWorldPoints.length);
      return combined;
    });
  }, [ranges, pose, slamPoints]);

  // Memoize das Float32Array für Three.js
  const floatArray = useMemo(() => new Float32Array(pointBuffer), [pointBuffer]);

  return (
    <Card className="w-full h-full relative bg-slate-900 border-slate-800 overflow-hidden flex flex-col shadow-2xl">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg">
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
            {slamPoints ? "Fast LIO 3D Mapping" : "2D Lidar Mode"}
          </p>
          <p className="text-[9px] text-slate-300 font-mono">{(pointBuffer.length / 3).toLocaleString()} Pts</p>
        </div>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60 border-white/10 text-red-400 hover:bg-red-500/20" onClick={() => setPointBuffer([])}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[12, 12, 12]} up={[0, 0, 1]} />
        <OrbitControls makeDefault />
        
        <Grid 
          infiniteGrid 
          rotation={[Math.PI / 2, 0, 0]} 
          sectionColor="#1e293b" 
          cellColor="#0f172a" 
          sectionSize={5} 
          cellSize={1}
        />
        
        <points>
          <bufferGeometry>
            {/* FIX: Hier nutzen wir 'args', um den TS-Error zu beheben */}
            <bufferAttribute 
              attach="attributes-position" 
              args={[floatArray, 3]} 
              count={floatArray.length / 3} 
              array={floatArray}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial 
            size={0.06} 
            color={slamPoints ? "#4ade80" : "#3b82f6"} 
            sizeAttenuation={true} 
            transparent 
            opacity={0.6} 
          />
        </points>

        {/* Drohnen Modell (Marker) */}
        <group position={[pose.x, pose.y, pose.z]}>
          <mesh quaternion={[pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w]}>
            <boxGeometry args={[0.4, 0.4, 0.1]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.2} />
            <mesh position={[0.25, 0, 0]}>
              <sphereGeometry args={[0.06]} />
              <meshStandardMaterial color="red" />
            </mesh>
          </mesh>
        </group>

        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
      </Canvas>
    </Card>
  );
}