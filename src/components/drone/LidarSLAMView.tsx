"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LidarSLAMViewProps {
  ranges: number[];
  pose: {
    x: number;
    y: number;
    z: number;
    orientation: { x: number; y: number; z: number; w: number };
  };
}

function PointCloud({ points }: { points: Float32Array }) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute("position", new THREE.BufferAttribute(points, 3));
      geometryRef.current.computeBoundingSphere();
    }
  }, [points]);

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial 
        size={0.07} 
        color="#16a34a" 
        sizeAttenuation={true} 
        transparent 
        opacity={0.7} 
      />
    </points>
  );
}

export function LidarSLAMView({ ranges, pose }: LidarSLAMViewProps) {
  const [points, setPoints] = useState<number[]>([]);
  const MAX_POINTS = 60000;

  // WICHTIG: Wir halten die Pose in einem Ref fest, um Latenz zu vermeiden
  const lastPoseRef = useRef(pose);
  useEffect(() => {
    lastPoseRef.current = pose;
  }, [pose]);

  useEffect(() => {
    if (!ranges || ranges.length === 0) return;

    // Aktuellste Pose aus dem Ref holen (bessere Synchronisation)
    const currentPose = lastPoseRef.current;
    const newWorldPoints: number[] = [];
    
    const angleStep = (Math.PI * 2) / ranges.length;
    
    // In ROS startet ein 360° Scan meist bei -180° (-PI)
    // Wenn die Objekte immer noch versetzt sind, kann dieser Wert auf 0 angepasst werden
    const angleMin = -Math.PI; 

    const droneQuat = new THREE.Quaternion(
      currentPose.orientation.x,
      currentPose.orientation.y,
      currentPose.orientation.z,
      currentPose.orientation.w
    );

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      
      // Gazebo Noise & Range Filter
      if (r < 0.2 || r > 15 || r === Infinity || isNaN(r)) continue;

      // Korrekter Winkel: Start bei angleMin
      const angle = angleMin + (i * angleStep);

      // 1. Lokale Koordinate (Im Koordinatensystem der Drohne)
      // ROS: X = Forward, Y = Left
      const localPoint = new THREE.Vector3(
        r * Math.cos(angle),
        r * Math.sin(angle),
        0
      );

      // 2. Transformation in Welt-Koordinaten
      // Zuerst: Rotation der Drohne anwenden (Pitch, Roll, Yaw)
      localPoint.applyQuaternion(droneQuat);

      // Danach: Position der Drohne addieren
      const worldX = localPoint.x + currentPose.x;
      const worldY = localPoint.y + currentPose.y;
      const worldZ = localPoint.z + currentPose.z;

      newWorldPoints.push(worldX, worldY, worldZ);
    }

    setPoints(prev => {
      const combined = [...prev, ...newWorldPoints];
      // Wenn das Limit erreicht ist, löschen wir die ältesten Punkte (FIFO)
      if (combined.length > MAX_POINTS * 3) {
        return combined.slice(newWorldPoints.length);
      }
      return combined;
    });
  }, [ranges]); // NUR bei neuen Lidar-Daten triggern, Pose kommt via Ref

  const floatArray = useMemo(() => new Float32Array(points), [points]);

  return (
    <Card className="w-full h-full relative bg-slate-100 border-slate-400 overflow-hidden flex flex-col shadow-inner">
      {/* UI Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md border border-slate-300 p-2 rounded-lg shadow-sm">
          <p className="text-[10px] font-bold text-slate-800 uppercase">3D SLAM Mapping</p>
          <p className="text-[9px] text-slate-500 font-mono">{(points.length / 3).toLocaleString()} Points</p>
        </div>
        <Button 
            size="icon" 
            variant="outline" 
            className="h-8 w-8 bg-white/90 border-slate-300 hover:bg-red-50 text-red-500"
            onClick={() => setPoints([])}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Canvas className="flex-1">
        {/* ROS Koordination: Z ist oben */}
        <PerspectiveCamera makeDefault position={[12, 12, 12]} up={[0, 0, 1]} />
        <OrbitControls makeDefault />
        
        <Grid 
            infiniteGrid 
            rotation={[Math.PI / 2, 0, 0]} 
            sectionColor="#94a3b8" 
            cellColor="#cbd5e1" 
            sectionSize={5} 
            cellSize={1}
        />
        
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} />
        
        <PointCloud points={floatArray} />

        {/* Drohnen Marker */}
        <mesh 
          position={[pose.x, pose.y, pose.z]} 
          quaternion={[pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w]}
        >
          <boxGeometry args={[0.5, 0.5, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
          {/* Vorne-Markierung (Rote Nase) */}
          <mesh position={[0.3, 0, 0]}>
            <sphereGeometry args={[0.05]} />
            <meshStandardMaterial color="red" />
          </mesh>
        </mesh>
      </Canvas>
    </Card>
  );
}