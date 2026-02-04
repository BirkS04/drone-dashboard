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
  const MAX_POINTS = 80000;

  // 1. FAST LIO (Punkte kommen bereits in Weltkoordinaten)
  useEffect(() => {
    if (!slamPoints || slamPoints.length === 0) return;
    setPointBuffer(prev => {
      const newPoints = Array.from(slamPoints);
      const combined = [...prev, ...newPoints];
      return combined.length > MAX_POINTS * 3 ? combined.slice(newPoints.length) : combined;
    });
  }, [slamPoints]);

  // 2. 2D LIDAR FALLBACK (Muss im Frontend gedreht werden)
  useEffect(() => {
    if (!ranges || ranges.length === 0 || slamPoints) return;
    const angleStep = (Math.PI * 2) / ranges.length;
    const droneQuat = new THREE.Quaternion(pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w);
    const newWorldPoints: number[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (r < 0.2 || r > 15 || isNaN(r)) continue;
      const angle = -Math.PI + (i * angleStep);
      const lp = new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0).applyQuaternion(droneQuat);
      newWorldPoints.push(lp.x + pose.x, lp.y + pose.y, lp.z + pose.z);
    }
    setPointBuffer(prev => [...prev, ...newWorldPoints].slice(-(MAX_POINTS * 3)));
  }, [ranges, pose, slamPoints]);

  const floatArray = useMemo(() => new Float32Array(pointBuffer), [pointBuffer]);

  return (
    <Card className="w-full h-full relative bg-slate-900 border-slate-800 overflow-hidden flex flex-col shadow-2xl">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg">
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{slamPoints ? "Fast LIO 3D Mapping" : "2D Mode"}</p>
          <p className="text-[9px] text-slate-300 font-mono">{(pointBuffer.length / 3).toLocaleString()} Pts</p>
        </div>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-black/60 border-white/10 text-red-400" onClick={() => setPointBuffer([])}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[12, 12, 12]} up={[0, 0, 1]} />
        <OrbitControls makeDefault />
        <Grid infiniteGrid rotation={[Math.PI / 2, 0, 0]} sectionColor="#1e293b" cellColor="#0f172a" />
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[floatArray, 3]} count={floatArray.length / 3} array={floatArray} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.06} color={slamPoints ? "#4ade80" : "#3b82f6"} sizeAttenuation={true} transparent opacity={0.6} />
        </points>
        <group position={[pose.x, pose.y, pose.z]}>
          <mesh quaternion={[pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w]}>
            <boxGeometry args={[0.4, 0.4, 0.1]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.2} />
          </mesh>
        </group>
        <ambientLight intensity={1.5} />
      </Canvas>
    </Card>
  );
}