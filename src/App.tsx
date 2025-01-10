import { useRef, useEffect, useState } from 'react'
import { sdk } from "@farcaster/frame-sdk";
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import axios from 'axios'
import * as THREE from 'three'
import "./index.css"

function ScrollingBanner({ name }: { name?: string }) {
  const [position, setPosition] = useState(window.innerWidth);

  const username = name?.trim() || "EXPLORER";

  useEffect(() => {
    const animate = () => {
      setPosition(prev => {
        if (prev < -1000) return window.innerWidth;
        return prev - 2;
      });
    };
    const interval = setInterval(animate, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 w-full bg-black h-8 border-t-2 border-b-2 border-cyan-500 overflow-hidden">
      <div
        className="text-cyan-500 font-['VT323'] text-xl whitespace-nowrap"
        style={{ transform: `translateX(${position}px)` }}
      >
        * * * WELCOME {username.toUpperCase()} TO THE INTERNATIONAL SPACE STATION TRACKER * * * REAL-TIME SATELLITE POSITIONING SYSTEM * * * CYBERDECK STATUS: ONLINE * * *
      </div>
    </div>
  );
}


function Earth() {

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
      {/* Earth Base - now with wireframe */}
      <mesh ref={earthRef}>
        <icosahedronGeometry args={[1, 6]} /> {/* Reduced geometry complexity */}
        <meshBasicMaterial
          wireframe={true}
          wireframeLinewidth={1}
          color={0x00ff00}
        />
      </mesh>

      {/* Simplified night lights */}
      <mesh ref={lightsRef}>
        <icosahedronGeometry args={[1, 6]} />
        <meshBasicMaterial
          color={0x00ffff}
          wireframe={true}
          opacity={0.3}
          transparent={true}
        />
      </mesh>

      {/* Retro-style atmosphere */}
      <mesh ref={glowRef} scale={1.02}>
        <icosahedronGeometry args={[1, 6]} />
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
              float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.0);
              gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0) * intensity;
            }
          `}
          blending={THREE.AdditiveBlending}
          wireframe={true}
          transparent={true}
        />
      </mesh>
    </group>
  )
}

function ISS({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.2, 0.2, 0.2]} /> {/* Changed to box for more retro feel */}
      <meshBasicMaterial
        color={0xffffff}
        wireframe={true}
      />
    </mesh>
  );
}

function Scene() {
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
      <ISS position={issPosition} />
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
      try {
        const ctx = await sdk.context;
        setContext(ctx);
        await sdk.actions.ready();
      } catch (err) {
        console.error("Error loading SDK context:", err);
      }
    };

    if (sdk && !isSDKLoaded) {
      console.log("SDK available, starting load...");
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  return (
    <div className="min-h-screen w-full bg-black relative">
      <a
        href="https://orbiter.host"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 z-50 border-2 border-cyan-500 bg-black p-3 rounded-lg transition-transform duration-300"
      >
        <div className="animate-pulse text-cyan-500 font-['VT323'] text-sm">
          HOSTED ON
        </div>
        <div className="animate-[pulse_1.5s_ease-in-out_infinite] text-yellow-400 font-['VT323'] text-lg font-bold">
          ORBITER.HOST
        </div>
        <div className="text-[8px] text-cyan-500 mt-1 text-center animate-[pulse_2s_ease-in-out_infinite]">
          ★★★ LAUNCH YOUR SITE ★★★
        </div>
      </a>

      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 5, 15]} />
        <Scene />
      </Canvas>
      {context?.user?.username && (
        <ScrollingBanner name={context?.user.username} />
      )}

    </div>
  )
}

export default App
