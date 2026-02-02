"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, Center } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { Compass } from "lucide-react";

interface Orientation3DProps {
  roll?: number;
  pitch?: number;
  yaw?: number;
}

// Wandelt Yaw (Radiant) in Himmelsrichtung um (Standard Mathe: 0=Ost, 90=Nord)
function getCardinalDirection(yawRad: number): string {
    // Normalisieren auf 0 bis 360 Grad
    let deg = (yawRad * 180) / Math.PI;
    deg = deg % 360;
    if (deg < 0) deg += 360;

    // Mapping für Standard Trigonometrie (0 = East, 90 = North)
    // Wenn ROS ENU nutzt:
    if (deg >= 337.5 || deg < 22.5) return "East (+X)";
    if (deg >= 22.5 && deg < 67.5) return "North-East";
    if (deg >= 67.5 && deg < 112.5) return "North (+Y)";
    if (deg >= 112.5 && deg < 157.5) return "North-West";
    if (deg >= 157.5 && deg < 202.5) return "West (-X)";
    if (deg >= 202.5 && deg < 247.5) return "South-West";
    if (deg >= 247.5 && deg < 292.5) return "South (-Y)";
    if (deg >= 292.5 && deg < 337.5) return "South-East";
    return "Unknown";
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = (target - current) % (2 * Math.PI);
  if (diff < -Math.PI) diff += 2 * Math.PI;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  return current + diff * lambda;
}

function AirtagArrow({ roll = 0, pitch = 0, yaw = 0 }: Orientation3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.5);
    s.lineTo(0.4, -0.2);
    s.lineTo(0.12, -0.1);
    s.lineTo(0, -0.15);
    s.lineTo(-0.12, -0.1);
    s.lineTo(-0.4, -0.2);
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = { 
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 12 
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Mapping für Visualisierung:
      // Wir wollen, dass der Pfeil sich so dreht wie die Drohne.
      // ThreeJS Y ist Up. 
      // Wir rotieren das Mesh, nicht die Kamera.
      // Pitch -> X Rotation
      // Yaw -> Y Rotation (Achtung: ThreeJS Y-Rotation ist CCW, genau wie ROS)
      // Roll -> Z Rotation
      
      const targetPitch = pitch || 0;
      const targetYaw = yaw || 0; 
      const targetRoll = roll || 0;

      // Wir addieren PI/2 (90 Grad) zum Yaw Offset für die Visualisierung,
      // damit der Pfeil bei 0 Grad (Osten) nach "Rechts" in der 3D Box zeigt 
      // oder wir lassen ihn bei 0 Grad nach "Hinten" in den Screen schauen (Standard ThreeJS -Z).
      // Hier: Wir lassen ihn einfach roh rotieren.
      
      groupRef.current.rotation.x = dampAngle(groupRef.current.rotation.x, targetPitch, 5 * delta, delta);
      // Negatives Yaw, weil ThreeJS und ROS manchmal spiegelverkehrt wirken je nach Kamera-Position
      // Teste: Wenn Drohne links dreht (Yaw+), soll Pfeil links drehen.
      groupRef.current.rotation.y = dampAngle(groupRef.current.rotation.y, targetYaw, 5 * delta, delta);
      groupRef.current.rotation.z = dampAngle(groupRef.current.rotation.z, targetRoll, 5 * delta, delta);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Center rotation={[-Math.PI / 2, 0, -Math.PI/2]}> 
          {/* 
             Initial Rotation: -PI/2 X damit er flach liegt.
             -PI/2 Z damit die Spitze bei 0 Yaw nach Rechts (Osten/X) zeigt, passend zur Map.
          */}
          <mesh castShadow receiveShadow>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial color="#22c55e" roughness={0.3} metalness={0.1} />
          </mesh>
        </Center>
      </Float>
    </group>
  );
}

export function Orientation3D({ roll = 0, pitch = 0, yaw = 0 }: Orientation3DProps) {
  const cardinal = getCardinalDirection(yaw || 0);
  const degrees = ((yaw || 0) * 180) / Math.PI;

  return (
    <Card className="h-full w-full border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
      <div className="p-4 flex justify-between items-start border-b border-slate-50">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compass</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900 leading-none">
                {degrees.toFixed(0)}°
            </p>
            <p className="text-sm font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {cardinal}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
             <div className="text-[9px] text-slate-400 uppercase font-bold">Attitude</div>
             <div className="flex gap-2">
                 <div className="bg-slate-100 px-1.5 py-1 rounded text-[10px] font-mono text-slate-600">
                    P: {((pitch || 0) * 180 / Math.PI).toFixed(1)}°
                 </div>
                 <div className="bg-slate-100 px-1.5 py-1 rounded text-[10px] font-mono text-slate-600">
                    R: {((roll || 0) * 180 / Math.PI).toFixed(1)}°
                 </div>
             </div>
        </div>
      </div>

      <div className="flex-1 w-full relative min-h-[160px] bg-slate-50/50">
        <Canvas shadows camera={{ position: [0, 2, 4], fov: 40 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[5, 5, 5]} intensity={1} castShadow />
          <spotLight position={[-5, 5, 5]} angle={0.3} intensity={0.5} />
          {/* Grid Helper für Orientierung im 3D Raum */}
          <gridHelper args={[10, 10, 0xe2e8f0, 0xe2e8f0]} position={[0, -1, 0]} />
          
          <AirtagArrow roll={roll} pitch={pitch} yaw={yaw} />
          
          <ContactShadows position={[0, -1, 0]} opacity={0.3} scale={5} blur={2.5} far={2} />
        </Canvas>
        
        {/* Kleiner Hinweis für 3D View */}
        <div className="absolute bottom-2 right-2 text-[9px] text-slate-300 pointer-events-none">
            3D PREVIEW
        </div>
      </div>
    </Card>
  );
}