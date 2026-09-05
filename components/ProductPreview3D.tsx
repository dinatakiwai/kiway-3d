"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

const letters = ["R", "A", "H", "M", "A"];

const colors: Record<number, string> = {
  0: "#ef4444",
  1: "#18181b",
  2: "#f97316",
  3: "#ec4899",
  4: "#3b82f6",
};

function BaseModel() {
  const { scene } = useGLTF("/models/base-5.glb");

  const cloned = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      const material = Array.isArray(object.material)
        ? object.material[0].clone()
        : object.material.clone();

      if ("color" in material) {
        material.color.set("#18181b");
      }

      object.material = material;
    });

    return clone;
  }, [scene]);

  return <primitive object={cloned} scale={0.1} />;
}

function LetterModel({
  letter,
  index,
}: {
  letter: string;
  index: number;
}) {
  const { scene } = useGLTF(`/models/${letter}.glb`);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.castShadow = true;
      object.receiveShadow = true;

      const material = Array.isArray(object.material)
        ? object.material[0].clone()
        : object.material.clone();

      const name = object.name.toUpperCase();

      if (name.includes("CAPS") && "color" in material) {
        material.color.set(colors[index] ?? "#18181b");
      }

      if (name.includes("FONT") && "color" in material) {
        material.color.set("#ffffff");
      }

      object.material = material;
    });

    return clone;
  }, [scene, index]);

  const spacing = 2.05;
  const totalWidth = (letters.length - 1) * spacing;
  const startX = -totalWidth / 2 + 0.5;

  // Mengikuti posisi final Customizer.
  const keycapOffsetX = 0;
  const keycapOffsetY = -0.05;
  const keycapOffsetZ = 0;

  const x = startX + index * spacing + keycapOffsetX;
  const y = 1.3 + keycapOffsetY;
  const z = keycapOffsetZ;

  return <primitive object={cloned} scale={0.1} position={[x, y, z]} />;
}

function ProductModel() {
  return (
    <group>
      <BaseModel />

      {letters.map((letter, index) => (
        <LetterModel
          key={`${letter}-${index}`}
          letter={letter}
          index={index}
        />
      ))}
    </group>
  );
}

export default function ProductPreview3D() {
  return (
    <div className="h-[300px] w-full overflow-hidden rounded-3xl bg-zinc-100">
      <Canvas
        shadows
        camera={{
          // Kamera khusus Catalog supaya seluruh produk masuk frame.
          position: [0, 8, 21],
          fov: 42,
          near: 0.01,
          far: 1000,
        }}
      >
        <color attach="background" args={["#f4f4f5"]} />

        <ambientLight intensity={2} />
        <directionalLight
          position={[5, 10, 8]}
          intensity={3}
          castShadow
        />
        <directionalLight position={[-5, 6, -5]} intensity={1.5} />

        <Suspense
          fallback={
            <Html center>
              <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow">
                Memuat 3D...
              </div>
            </Html>
          }
        >
          <ProductModel />
        </Suspense>

        <OrbitControls
  makeDefault
  enablePan={false}
  enableZoom={true}
  enableDamping
  dampingFactor={0.08}
  minDistance={17}
  maxDistance={26}
  minPolarAngle={Math.PI / 4}
  maxPolarAngle={Math.PI / 2.05}
  target={[0, 0.6, 0]}
/>
      </Canvas>
    </div>
  );
}
