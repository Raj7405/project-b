'use client'

import { useRef, Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Environment, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Preload the model for better performance
// useGLTF.preload('/model/Coin_FBX.glb')
useGLTF.preload('/model/Coin.glb')

// Electron particle with trail effect
function ElectronOrbit({ 
  orbitRadiusX, 
  orbitRadiusY, 
  speed, 
  tiltX, 
  tiltY, 
  tiltZ, 
  phase,
  timeRef 
}: { 
  orbitRadiusX: number
  orbitRadiusY: number
  speed: number
  tiltX: number
  tiltY: number
  tiltZ: number
  phase: number
  timeRef: React.MutableRefObject<number>
}) {
  const electronRef = useRef<THREE.Mesh>(null)
  const trailRefs = useRef<(THREE.Mesh | null)[]>([])
  const trailPositions = useRef<THREE.Vector3[]>([])
  const trailLineRef = useRef<THREE.Line<THREE.BufferGeometry>>(null)
  
  // Initialize trail positions array - more particles for smoother trail
  const trailLength = 40
  
  useFrame((state, delta) => {
    if (electronRef.current) {
      // Calculate elliptical orbit position
      const angle = timeRef.current * speed + phase
      const x = Math.cos(angle) * orbitRadiusX
      const y = Math.sin(angle) * orbitRadiusY
      
      // Update electron position
      electronRef.current.position.set(x, y, 0)
      
      // Update trail positions (store last N positions)
      trailPositions.current.unshift(new THREE.Vector3(x, y, 0))
      if (trailPositions.current.length > trailLength) {
        trailPositions.current.pop()
      }
      
      // Update trail line geometry
      if (trailLineRef.current && trailPositions.current.length > 1) {
        const positions = trailPositions.current.map(pos => [pos.x, pos.y, pos.z]).flat()
        const geometry = trailLineRef.current.geometry
        
        // Update or create position attribute
        const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
        if (positionAttribute && positionAttribute.array.length >= positions.length) {
          const array = positionAttribute.array as Float32Array
          for (let i = 0; i < positions.length; i++) {
            array[i] = positions[i]
          }
          positionAttribute.needsUpdate = true
        } else {
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        }
        
        // Update line colors for fading effect
        const colors: number[] = []
        trailPositions.current.forEach((_, index) => {
          const opacity = Math.pow(1 - index / trailLength, 1.2) * 0.5
          const color = new THREE.Color('#f3ba2f')
          color.multiplyScalar(opacity)
          colors.push(color.r, color.g, color.b)
        })
        
        const colorAttribute = geometry.attributes.color as THREE.BufferAttribute
        if (colorAttribute && colorAttribute.array.length >= colors.length) {
          const array = colorAttribute.array as Float32Array
          for (let i = 0; i < colors.length; i++) {
            array[i] = colors[i]
          }
          colorAttribute.needsUpdate = true
        } else {
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        }
        
        geometry.setDrawRange(0, trailPositions.current.length)
      }
      
      // Update trail particles
      trailRefs.current.forEach((trail, index) => {
        if (trail && trailPositions.current[index]) {
          trail.position.copy(trailPositions.current[index])
          // Fade trail based on distance from electron with smoother gradient
          const fadeProgress = index / trailLength
          const opacity = Math.pow(1 - fadeProgress, 1.5) * 0.8 // Smoother fade curve
          const size = 0.02 + (1 - fadeProgress) * 0.04 // Particles get smaller as they fade
          
          const material = trail.material as THREE.MeshBasicMaterial
          if (material) {
            material.opacity = opacity
          }
          // Update particle size
          if (trail.geometry instanceof THREE.SphereGeometry) {
            trail.scale.set(size / 0.03, size / 0.03, size / 0.03)
          }
        }
      })
    }
  })
  
  return (
    <group rotation={[tiltX, tiltY, tiltZ]}>
      {/* Electron particle */}
      <mesh ref={electronRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#f3ba2f"
          emissive="#f3ba2f"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Trail line - glowing path */}
      <line ref={trailLineRef as any}>
        <bufferGeometry />
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.4}
        />
      </line>
      
      {/* Trail particles - more particles for smoother trail */}
      {[...Array(trailLength)].map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el
          }}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial
            color="#f3ba2f"
            transparent
            opacity={0}
            emissive="#f3ba2f"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

// Load the GLB model
function CoinModel() {
  const { scene } = useGLTF('/model/Coin.glb')
  const coinRef = useRef<THREE.Group | null>(null)
  const time = useRef(0)
  const { viewport } = useThree()
  
  // Load only the BaseColor texture for the logo
  const logoBaseColorTexture = useTexture('/textures/lx/Coin_FBX_LX_BaseColor.1001.png')
  logoBaseColorTexture.flipY = false // GLB textures are typically not flipped
  
  // Calculate scale based on viewport width
  // Mobile: scale down more aggressively to prevent overflow
  const viewportScale = viewport.width < 6 ? 0.3 : viewport.width < 8 ? 0.5 : 1
  // Base model scale to make it bigger (adjust this value to match old size)
  // Increased for Coin.glb which appears to be exported at a smaller scale
  // Try values like 200, 500, or even 1000 if the model is extremely small
  const modelScale = 250

  // Clone the scene and apply golden materials
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    
    // Scale the entire scene directly (more effective than group scaling)
    cloned.scale.set(modelScale, modelScale, modelScale)
    
    // Traverse the cloned scene and apply golden materials to all meshes
    let meshCount = 0
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++
        
        // Check material name/texture slot (Blender uses material names for texture slots)
        const material = child.material
        let materialName = ''
        let isLogo = false
        
        // Handle both single material and material arrays
        if (Array.isArray(material)) {
          // If mesh has multiple materials, check the first one
          materialName = material[0]?.name?.toLowerCase() || ''
        } else if (material) {
          materialName = material.name?.toLowerCase() || ''
        }
        
        // Debug: Log material names to console (remove after identifying logo)
        if (meshCount <= 15) {
          console.log(`Mesh ${meshCount}: "${child.name}" | Material: "${materialName || 'unnamed'}"`)
        }
        
        // Check if material name contains logo-related keywords
        // Common Blender material names for logo texture slots
        isLogo = materialName.includes('lx') || 
                 materialName.includes('logo') || 
                 materialName.includes('text') || 
                 materialName.includes('letter') ||
                 materialName.includes('mark') ||
                 materialName.includes('symbol') ||
                 materialName.includes('emblem') ||
                 materialName === 'l' ||
                 materialName === 'x' ||
                 materialName === 'lx'
        
        if (isLogo) {
          // Apply BaseColor texture to logo while keeping surface shine properties
          child.material = new THREE.MeshPhysicalMaterial({
            map: logoBaseColorTexture, // BaseColor texture from Blender
            metalness: 0.95,
            roughness: 0.05,
            // Iridescence creates gradient color-shifting effect
            iridescence: 1.0, // Maximum iridescence for gradient effect
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [100, 400], // Creates cyan to purple transition
            emissive: '#9d4edd', // Purple emissive glow
            emissiveIntensity: 0.6,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
          })
          console.log(`Applied BaseColor texture to logo: "${child.name}" with material "${materialName}"`)
        } else {
          // Apply golden material with metallic properties to coin body (default)
          child.material = new THREE.MeshStandardMaterial({
            color: '#f3ba2f', // Golden yellow
            metalness: 0.9,
            roughness: 0.15,
            emissive: '#d4a11d',
            emissiveIntensity: 0.2,
          })
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return cloned
  }, [scene, modelScale])

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

  // Electron orbit configurations - different speeds, tilts, and elliptical paths
  // First three orbits (front set)
  const electronOrbits = [
    {
      orbitRadiusX: 3.5,
      orbitRadiusY: 2.8,
      speed: 0.8,
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0,
      phase: 0,
    },
    {
      orbitRadiusX: 4.2,
      orbitRadiusY: 3.0,
      speed: -0.6,
      tiltX: Math.PI / 6,
      tiltY: Math.PI / 4,
      tiltZ: 0,
      phase: Math.PI / 2,
    },
    {
      orbitRadiusX: 3.8,
      orbitRadiusY: 3.5,
      speed: 1.0,
      tiltX: -Math.PI / 8,
      tiltY: -Math.PI / 6,
      tiltZ: Math.PI / 3,
      phase: Math.PI,
    },
    // Second three orbits (back set) - phases offset by π (180°) to be opposite
    {
      orbitRadiusX: 3.5,
      orbitRadiusY: 2.8,
      speed: 0.8,
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0,
      phase: Math.PI, // Offset by π from first orbit
    },
    {
      orbitRadiusX: 4.2,
      orbitRadiusY: 3.0,
      speed: -0.6,
      tiltX: Math.PI / 6,
      tiltY: Math.PI / 4,
      tiltZ: 0,
      phase: -Math.PI / 2, // Offset by π from second orbit (3π/2 or -π/2)
    },
    {
      orbitRadiusX: 3.8,
      orbitRadiusY: 3.5,
      speed: 1.0,
      tiltX: -Math.PI / 8,
      tiltY: -Math.PI / 6,
      tiltZ: Math.PI / 3,
      phase: 0, // Offset by π from third orbit (2π or 0)
    },
  ]

  return (
    <group ref={coinRef} scale={viewportScale}>
      {/* Coin model - already scaled in clonedScene */}
      <primitive object={clonedScene} castShadow receiveShadow />
      
      {/* Atomic orbital effect - electron orbits */}
      <group>
        {electronOrbits.map((orbit, index) => (
          <ElectronOrbit
            key={index}
            orbitRadiusX={orbit.orbitRadiusX}
            orbitRadiusY={orbit.orbitRadiusY}
            speed={orbit.speed}
            tiltX={orbit.tiltX}
            tiltY={orbit.tiltY}
            tiltZ={orbit.tiltZ}
            phase={orbit.phase}
            timeRef={time}
          />
        ))}
      </group>
    </group>
  )
}

function ResponsiveCamera() {
  const { viewport, camera } = useThree()
  
  useEffect(() => {
    // Adjust camera position based on viewport
    if (viewport.width < 6) {
      // Mobile: zoom out more to prevent overflow
      camera.position.set(0, 0, 15)
    } else if (viewport.width < 8) {
      // Tablet: zoom out slightly
      camera.position.set(0, 0, 12)
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
    <div className="w-full h-full overflow-hidden">
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
          <CoinModel />
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  )
}