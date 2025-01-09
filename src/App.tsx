import { useRef, useEffect, useState } from 'react'
import { sdk } from "@farcaster/frame-sdk";
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import axios from 'axios'
import * as THREE from 'three'
import "./index.css"

// Import textures
import earthMapTexture from './assets/00_earthmap1k.jpg'
import earthBumpTexture from './assets/01_earthbump1k.jpg'
import earthSpecTexture from './assets/02_earthspec1k.jpg'
import earthLightsTexture from './assets/03_earthlights1k.jpg'
import cloudsMapTexture from './assets/04_earthcloudmap.jpg'
import cloudsAlphaTexture from './assets/05_earthcloudmaptrans.jpg'

function Earth() {
  // Load textures
  const [
    earthMap,
    bumpMap,
    specMap,
    lightsMap,
    cloudsMap,
    cloudsAlpha
  ] = useLoader(THREE.TextureLoader, [
    earthMapTexture,
    earthBumpTexture,
    earthSpecTexture,
    earthLightsTexture,
    cloudsMapTexture,
    cloudsAlphaTexture
  ])

  earthMap.colorSpace = THREE.SRGBColorSpace

  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const lightsRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    // Get current UTC time
    const now = new Date()

    // Calculate rotation based on current time
    // Earth makes one complete rotation (360 degrees or 2π radians) in 24 hours
    // Convert current hours/minutes/seconds to rotation angle
    const hoursRotation = now.getUTCHours() * (2 * Math.PI / 24)
    const minutesRotation = now.getUTCMinutes() * (2 * Math.PI / (24 * 60))
    const secondsRotation = now.getUTCSeconds() * (2 * Math.PI / (24 * 60 * 60))

    // Combined rotation angle
    const totalRotation = hoursRotation + minutesRotation + secondsRotation

    // Apply rotation
    if (earthRef.current) {
      earthRef.current.rotation.y = totalRotation
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = totalRotation * 1.15 // Clouds move slightly faster
    }
    if (lightsRef.current) {
      lightsRef.current.rotation.y = totalRotation
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = totalRotation
    }
  })

  // Initial position adjustment to align with Greenwich meridian
  const initialRotation = Math.PI // Rotate 180 degrees to show correct side

  return (
    <group rotation={[0, initialRotation, -23.4 * Math.PI / 180]}>
      {/* Earth Base */}
      <mesh ref={earthRef}>
        <icosahedronGeometry args={[1, 12]} />
        <meshPhongMaterial
          map={earthMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          specularMap={specMap}
        />
      </mesh>

      {/* Night Lights */}
      <mesh ref={lightsRef}>
        <icosahedronGeometry args={[1, 12]} />
        <meshBasicMaterial
          map={lightsMap}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Clouds Layer */}
      <mesh ref={cloudsRef} scale={1.003}>
        <icosahedronGeometry args={[1, 12]} />
        <meshStandardMaterial
          map={cloudsMap}
          alphaMap={cloudsAlpha}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Atmosphere Glow */}
      <mesh ref={glowRef} scale={1.01}>
        <icosahedronGeometry args={[1, 12]} />
        <shaderMaterial
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
          `}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent={true}
        />
      </mesh>
    </group>
  )
}

function ISS({ position, pfpUrl }: { position: [number, number, number], pfpUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, pfpUrl)

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshPhongMaterial
        map={texture}
        emissive={new THREE.Color(0xffffff)}
        emissiveIntensity={0.01}
      />
    </mesh>
  )
}

function Scene({ pfpUrl }: { pfpUrl: string }) {
  const [issPosition, setIssPosition] = useState<[number, number, number]>([2, 0, 0]);

  useEffect(() => {
    const fetchISSPosition = async () => {
      try {
        const response = await axios.get('http://api.open-notify.org/iss-now.json');
        const { latitude, longitude } = response.data.iss_position;

        const phi = (90 - latitude) * (Math.PI / 180);
        const theta = (longitude + 180) * (Math.PI / 180);
        const x = -(Math.sin(phi) * Math.cos(theta)) * 2;
        const z = (Math.sin(phi) * Math.sin(theta)) * 2;
        const y = (Math.cos(phi)) * 2;

        setIssPosition([x, y, z]);
      } catch (error) {
        console.error('Error fetching ISS position:', error);
      }
    };

    fetchISSPosition();
    const interval = setInterval(fetchISSPosition, 5000);

    return () => clearInterval(interval);
  }, []);

  // Calculate sun position based on time
  const now = new Date()
  const hourAngle = (now.getUTCHours() / 24) * Math.PI * 2
  const sunPosition: [number, number, number] = [
    Math.cos(hourAngle) * 50,
    Math.sin(hourAngle) * 50,
    30
  ]


  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={sunPosition} intensity={2.0} />
      <Earth />
      <ISS position={issPosition} pfpUrl={pfpUrl} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        zoomSpeed={0.6}
        panSpeed={0.5}
        rotateSpeed={0.4}
      />
    </>
  );
}

function App() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<any>();

  useEffect(() => {
    const load = async () => {
      setContext(await sdk.context);
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-black">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <Scene pfpUrl={context?.pfpUrl || 'https://orbiter.host/og.png'} />
      </Canvas>
    </div>
  )
}

export default App
