"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function Orb() {
  const mesh = useRef<Mesh>(null);
  useFrame((state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.09;
    mesh.current.rotation.y += delta * 0.13;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.035;
    mesh.current.scale.setScalar(pulse);
  });
  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.7, 5]} />
        <meshPhysicalMaterial color="#7557ff" wireframe transparent opacity={0.16} />
      </mesh>
    </Float>
  );
}

export default function AmbientOrb() {
  return (
    <div className="orb-canvas" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.8], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <pointLight position={[2, 2, 3]} color="#7c5cff" intensity={8} />
        <Orb />
      </Canvas>
    </div>
  );
}
