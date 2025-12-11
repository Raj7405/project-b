'use client'

import { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Environment } from '@react-three/drei'
import * as THREE from 'three'


function BNBLogo({ position, rotation, scale = 1 }: { position: [number, number, number], rotation?: [number, number, number], scale?: number }) {
    return (
      <group position={position} rotation={rotation || [0, 0, 0]} scale={scale}>
        {/* BNB Logo - Authentic Diamond Pattern (rotated 45°) */}
        
        {/* Center diamond (rotated square) */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.3, 0.3, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Top diamond */}
        <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Bottom diamond */}
        <mesh position={[0, -0.55, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Left diamond */}
        <mesh position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.22, 0.22, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Right diamond */}
        <mesh position={[0.55, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.22, 0.22, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Top-left small diamond */}
        <mesh position={[-0.28, 0.28, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.38, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Top-right small diamond */}
        <mesh position={[0.28, 0.28, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.38, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Bottom-left small diamond */}
        <mesh position={[-0.28, -0.28, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.38, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Bottom-right small diamond */}
        <mesh position={[0.28, -0.28, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.42, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
  
        {/* Connecting bars */}
        {/* Connect Top diamond to Top-left diamond */}
        <mesh position={[-0.14, 0.415, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Connect Top diamond to Top-right diamond */}
        <mesh position={[0.14, 0.415, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.15, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Connect Bottom diamond to Bottom-left diamond */}
        <mesh position={[-0.14, -0.415, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.28, 0.15, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
        
        {/* Connect Bottom diamond to Bottom-right diamond */}
        <mesh position={[0.14, -0.415, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.28, 0.08]} />
          <meshStandardMaterial color="#f3ba2f" metalness={0.3} roughness={0.4} />
        </mesh>
      </group>
    )
  }

function BNBCoin() {
  const coinRef = useRef<THREE.Group | null>(null)
  const time = useRef(0)
  const { viewport } = useThree()
  
  // Calculate scale based on viewport width
  // Mobile: scale down to 0.5-0.6, Desktop: normal size (1)
  const scale = viewport.width < 6 ? 0.5 : viewport.width < 8 ? 0.7 : 1

  useFrame((state, delta) => {
    if (coinRef.current) {
      time.current += delta
      // Smooth rotation on Y axis (vertical spin)
      coinRef.current.rotation.y += delta * 0.5
      // Subtle tilt animation
      coinRef.current.rotation.x = Math.sin(time.current * 0.3) * 0.1
      // Floating animation
      coinRef.current.position.y = Math.sin(time.current * 1.2) * 0.3
    }
  })

  return (
    <group ref={coinRef} scale={scale}>
      {/* Main coin body - ROTATED TO STAND UPRIGHT */}
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 0.25, 80]} />
        <meshStandardMaterial
          color="#c9a846"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Front face */}
      <mesh position={[0, 0, 0.13]} castShadow>
        <circleGeometry args={[2.45, 64]} />
        <meshStandardMaterial
          color="#f3ba2f"
          metalness={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Back face */}
      <mesh position={[0, 0, -0.13]} rotation={[0, Math.PI, 0]} castShadow>
        <circleGeometry args={[2.45, 64]} />
        <meshStandardMaterial
          color="#f3ba2f"
          metalness={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Ridged edge ring - ROTATED */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[2.5, 0.125, 16, 80]} />
        <meshStandardMaterial
          color="#b8941f"
          metalness={1}
          roughness={0.3}
        />
      </mesh>

      {/* Inner decorative ring on front */}
      <mesh position={[0, 0, 0.14]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.1, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#d4a11d"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Inner decorative ring on back */}
      <mesh position={[0, 0, -0.14]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.1, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#d4a11d"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* BNB Logo on front */}
      <BNBLogo position={[0, 0, 0.16]} scale={1.2} />
      
      {/* BNB Logo on back */}
      <BNBLogo position={[0, 0, -0.16]} rotation={[0, Math.PI, 0]} scale={1.2} />

      {/* Orbiting particles - golden sparkles (fewer on mobile) */}
      {[...Array(viewport.width < 6 ? 15 : 30)].map((_, i) => {
        const totalParticles = viewport.width < 6 ? 15 : 30
        const angle = (i / totalParticles) * Math.PI * 2
        const radius = 3.5 + Math.sin(i * 0.5) * 0.4
        const orbitSpeed = time.current * 0.6
        const verticalOffset = Math.sin(time.current * 2 + i * 0.2) * 0.4
        
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle + orbitSpeed) * radius,
              verticalOffset,
              Math.sin(angle + orbitSpeed) * radius
            ]}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              color="#f3ba2f"
              emissive="#f3ba2f"
              emissiveIntensity={1}
            />
          </mesh>
        )
      })}

      {/* Outer edge ring - moved to coin border */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[2.5, 0.08, 16, 80]} />
        <meshStandardMaterial
          color="#d4a11d"
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      
      {/* Glow ring effect - subtle outer glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#f3ba2f" transparent opacity={0.4} />
      </mesh>

      {/* Additional sparkle particles closer to coin (fewer on mobile) */}
      {[...Array(viewport.width < 6 ? 8 : 15)].map((_, i) => {
        const totalInnerParticles = viewport.width < 6 ? 8 : 15
        const angle = (i / totalInnerParticles) * Math.PI * 2
        const radius = 2.8
        const orbitSpeed = time.current * -0.4
        
        return (
          <mesh
            key={`inner-${i}`}
            position={[
              Math.cos(angle + orbitSpeed) * radius,
              Math.sin(time.current * 3 + i) * 0.2,
              Math.sin(angle + orbitSpeed) * radius
            ]}
          >
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

function ResponsiveCamera() {
  const { viewport, camera } = useThree()
  
  useEffect(() => {
    // Adjust camera position based on viewport
    if (viewport.width < 6) {
      // Mobile: zoom out more
      camera.position.set(0, 0, 12)
    } else if (viewport.width < 8) {
      // Tablet: zoom out slightly
      camera.position.set(0, 0, 11)
    } else {
      // Desktop: normal view
      camera.position.set(0, 0, 10)
    }
    camera.updateProjectionMatrix()
  }, [viewport.width, camera])

  return null
}

export default function ThreeCoin3D() {
  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <ResponsiveCamera />
        
        {/* Lighting setup */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          castShadow
          color="#ffffff"
        />
        <spotLight
          position={[0, 10, 0]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          color="#f3ba2f"
        />
        <pointLight position={[-5, 0, 5]} intensity={0.8} color="#ffd700" />
        <pointLight position={[5, 0, -5]} intensity={0.6} color="#f3ba2f" />
        
        <Suspense fallback={null}>
          <BNBCoin />
          {/* <Environment preset="sunset" /> */}
          {/* <Environment files="https://rawcdn.githack.com/mrdoob/three.js/master/examples/textures/equirectangular/venice_sunset_1k.hdr" /> */}

          
          
        </Suspense>
      </Canvas>
    </div>
  )
}