"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

type Clicker3DProps = {
  letters: string[];
  baseColor: string;
  letterColors: Record<number, string>;
  selectedLetter: number | null;
  onSelectLetter: (index: number) => void;
};

function BaseModel({
  count,
  color,
  position = [0, 0, 0],
}: {
  count: number;
  color: string;
  position?: [number, number, number];
}) {
  const safeCount = Math.min(Math.max(count, 1), 10);
  const { scene } = useGLTF(`/models/base-${safeCount}.glb`);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => {
          const mat = material.clone();
          if ("color" in mat) mat.color.set(color);
          return mat;
        });
      } else if (object.material) {
        const mat = object.material.clone();
        if ("color" in mat) mat.color.set(color);
        object.material = mat;
      }
    });
    return clone;
  }, [scene, color]);

  return (
    <primitive
      object={clonedScene}
      scale={0.1}
      position={position}
    />
  );
}

function LetterModel({
  letter, index, position, color, selected, onClick,
}: {
  letter: string;
  index: number;
  position: [number, number, number];
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { scene } = useGLTF(`/models/${letter.toUpperCase()}.glb`);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      if (!object.material) return;

      const material = Array.isArray(object.material)
        ? object.material[0].clone()
        : object.material.clone();

      const name = object.name.toUpperCase();

      if (name.includes("CAPS") && "color" in material) {
        material.color.set(color);
      }

      if (name.includes("FONT") && "color" in material) {
        material.color.set("#ffffff");
      }

      object.material = material;
    });

    return clone;
  }, [scene, color]);

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <primitive object={clonedScene} scale={0.1} />

      {selected && (
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.28, 0.035, 1.28]} />
          <meshBasicMaterial color="#f97316" wireframe />
        </mesh>
      )}
    </group>
  );
}

function ClickerModel({
  letters, baseColor, letterColors, selectedLetter, onSelectLetter,
}: Clicker3DProps) {
  const visibleLetters = letters.slice(0, 10).map((letter) => letter.toUpperCase());
  const count = visibleLetters.length;

  if (count === 0) return null;

  const spacing = 2.05;
  const totalWidth = (count - 1) * spacing;
  const startX = -totalWidth / 2 + 0.50;

  // =====================================================
  // POSISI KEYCAP - UBAH 3 ANGKA INI
  // X positif = kanan, negatif = kiri
  // Y positif = naik, negatif = turun
  // Z positif = maju, negatif = mundur
  // =====================================================
  const keycapOffsetX = 0;
  const keycapOffsetY = -0.05;
  const keycapOffsetZ = 0.0;

  // =====================================================
  // POSISI BASE - UBAH 3 ANGKA INI
  // X positif = kanan, negatif = kiri
  // Y positif = naik, negatif = turun
  // Z positif = maju, negatif = mundur
  // =====================================================
  const baseOffsetX = 0;
  const baseOffsetY = 0;
  const baseOffsetZ = -0.0
;

  return (
    <group>
      <BaseModel
        count={count}
        color={baseColor}
        position={[
          baseOffsetX,
          baseOffsetY,
          baseOffsetZ,
        ]}
      />

      {visibleLetters.map((letter, index) => {
        const x = startX + index * spacing + keycapOffsetX;
        const y = 1.30 + keycapOffsetY;
        const z = keycapOffsetZ;

        return (
          <LetterModel
            key={`${letter}-${index}`}
            letter={letter}
            index={index}
            position={[x, y, z]}
            color={letterColors[index] ?? "#18181b"}
            selected={selectedLetter === index}
            onClick={() => onSelectLetter(index)}
          />
        );
      })}
    </group>
  );
}

export default function Clicker3D({
  letters, baseColor, letterColors, selectedLetter, onSelectLetter,
}: Clicker3DProps) {
  return (
    <div className="h-[480px] w-full">
      <Canvas
        shadows
        camera={{
          position: [0, 10, 16],
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

        <directionalLight
          position={[-5, 6, -5]}
          intensity={1.5}
        />

        <Suspense
          fallback={
            <Html center>
              <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow">
                Memuat 3D...
              </div>
            </Html>
          }
        >
          <ClickerModel
            letters={letters}
            baseColor={baseColor}
            letterColors={letterColors}
            selectedLetter={selectedLetter}
            onSelectLetter={onSelectLetter}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={7}
          maxDistance={25}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
