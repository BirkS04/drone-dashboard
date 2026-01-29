"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { 
  PerspectiveCamera, 
  Float, 
  ContactShadows, 
  Center,
  Environment
} from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Card } from "@/components/ui/card";

interface Orientation3DProps {
  roll?: number;
  pitch?: number;
  yaw?: number;
}

function AirtagArrow({ roll = 0, pitch = 0, yaw = 0 }: Orientation3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Die typische Apple-Pfeilform (Chevron)
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
    depth: 0.1, 
    bevelEnabled: true, 
    bevelThickness: 0.03, 
    bevelSize: 0.03, 
    bevelSegments: 12 
  };

  useFrame(() => {
    if (groupRef.current) {
      // Wir nutzen lerp für butterweiche Bewegungen
      const targetX = pitch || 0;
      const targetY = -(yaw || 0);
      const targetZ = roll || 0;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.1);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.1);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.4}>
        <Center rotation={[-Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            {/* Farbe auf Apple-Grün geändert für maximale Sichtbarkeit */}
            <meshStandardMaterial 
              color="#22c55e" 
              roughness={0.1} 
              metalness={0.2}
              emissive="#16a34a"
              emissiveIntensity={0.2}
            />
          </mesh>
        </Center>
      </Float>
    </group>
  );
}

export function Orientation3D({ roll = 0, pitch = 0, yaw = 0 }: Orientation3DProps) {
  return (
    <Card className="h-full w-full border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
      {/* Header Bereich innerhalb der Card */}
      <div className="p-4 flex justify-between items-start pb-0">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Heading</p>
          <p className="text-2xl font-semibold text-slate-900 leading-none mt-1">
            {((yaw * 180) / Math.PI).toFixed(0)}°
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      </div>

      {/* 3D Bereich - bekommt den restlichen Platz */}
      <div className="flex-1 w-full relative min-h-[180px]">
        <Canvas shadows antialias="true" camera={{ position: [0, 2, 3], fov: 35 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
          
          <AirtagArrow roll={roll} pitch={pitch} yaw={yaw} />

          {/* Weicher Schatten auf dem Boden */}
          <ContactShadows 
            position={[0, -0.5, 0]} 
            opacity={0.15} 
            scale={4} 
            blur={2} 
            far={1.5} 
          />
        </Canvas>
      </div>

      {/* Footer / Metriken dezent am Boden */}
      <div className="px-4 py-3 border-t border-slate-50 flex gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-400 uppercase font-bold">Pitch</span>
            <span className="text-[11px] font-medium text-slate-600">{((pitch * 180) / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-400 uppercase font-bold">Roll</span>
            <span className="text-[11px] font-medium text-slate-600">{((roll * 180) / Math.PI).toFixed(1)}°</span>
          </div>
      </div>
    </Card>
  );
}