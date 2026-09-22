'use client';

import React, { Suspense, useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export default function NodifyLogoScene({
  className,
  height = 560,
  modelUrl = '/assets/nodify-logo.obj',
  interactive = true,
}) {
  const [loading, setLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Manejo del mouse para interactividad
  useEffect(() => {
    if (!interactive) return;
    
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const Model = () => {
    const obj = useLoader(OBJLoader, modelUrl);
    const ref = useRef();
    const { viewport } = useThree();
    
    useEffect(() => {
      setLoading(false);
    }, []);

    useEffect(() => {
      if (!obj) return;

      // Centrar y ajustar escala del logo
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      obj.position.set(0, -0.2, 0);
      obj.scale.set(1.8, 1.8, 1.8);

      // Rotación optimizada
      obj.rotation.x = -Math.PI / 2;
      obj.rotation.y = Math.PI;
      obj.rotation.z = 0;

      // Material mejorado con más profundidad
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#d28b5c',
            metalness: 0.9,
            roughness: 0.15,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            emissive: '#e0b070',
            emissiveIntensity: 0.3,
            envMapIntensity: 1.5,
            transmission: 0.1,
            thickness: 0.5,
          });
          
          // Optimización: usar menos subdivisiones si es necesario
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [obj]);

    useFrame(({ clock }) => {
      if (!ref.current) return;
      
      const t = clock.elapsedTime;
      
      // Pulsación energética más suave
      const scale = 1 + Math.sin(t * 1.5) * 0.03;
      ref.current.scale.set(scale, scale, scale);
      
      // Rotación sutil basada en el mouse
      if (interactive) {
        ref.current.rotation.y = Math.PI + mousePosition.x * 0.1;
        ref.current.rotation.x = -Math.PI / 2 + mousePosition.y * 0.05;
      }
      
      // Oscilación vertical sutil
      ref.current.position.y = -0.2 + Math.sin(t * 0.8) * 0.02;
    });

    return <primitive ref={ref} object={obj} />;
  };

  // Partículas optimizadas con mejor distribución
  const EnhancedParticles = () => {
    const ref = useRef();
    const count = 300; // Reducido para mejor performance
    
    const { positions, colors, sizes } = useMemo(() => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        // Distribución más orgánica
        const radius = Math.random() * 4 + 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Colores variados
        const warmth = Math.random() * 0.5 + 0.5;
        colors[i * 3] = 0.8 + warmth * 0.2;     // R
        colors[i * 3 + 1] = 0.6 + warmth * 0.2; // G
        colors[i * 3 + 2] = 0.3 + warmth * 0.1; // B
        
        sizes[i] = Math.random() * 0.08 + 0.02;
      }
      
      return { positions, colors, sizes };
    }, [count]);

    useFrame(({ clock }) => {
      if (!ref.current) return;
      
      const t = clock.elapsedTime;
      ref.current.rotation.y = t * 0.015;
      
      // Animación de partículas individuales
      const pos = ref.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3 + 1] += Math.sin(t + i * 0.1) * 0.001;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={count}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>
    );
  };

  // Anillos energéticos mejorados
  const EnergyRings = () => {
    const rings = useMemo(() => {
      return Array.from({ length: 3 }, (_, i) => ({
        radius: 1.5 + i * 0.3,
        speed: 0.5 + i * 0.2,
        offset: i * Math.PI * 0.7,
      }));
    }, []);

    return (
      <>
        {rings.map((ring, index) => (
          <EnergyRing key={index} {...ring} />
        ))}
      </>
    );
  };

  const EnergyRing = ({ radius, speed, offset }) => {
    const ref = useRef();
    
    const points = useMemo(() => {
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle * 3) * 0.1,
          Math.sin(angle) * radius
        ));
      }
      return pts;
    }, [radius]);

    useFrame(({ clock }) => {
      if (!ref.current) return;
      
      const t = clock.elapsedTime * speed + offset;
      ref.current.rotation.y = t;
      
      // Efecto de breathing
      const scale = 1 + Math.sin(t * 2) * 0.05;
      ref.current.scale.setScalar(scale);
    });

    return (
      <line ref={ref}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#d1bfa5"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </line>
    );
  };

  // Luces dinámicas
  const DynamicLights = () => {
    const light1 = useRef();
    const light2 = useRef();

    useFrame(({ clock }) => {
      const t = clock.elapsedTime;
      
      if (light1.current) {
        light1.current.position.x = Math.cos(t * 0.7) * 3;
        light1.current.position.z = Math.sin(t * 0.7) * 3;
        light1.current.intensity = 1.2 + Math.sin(t * 2) * 0.3;
      }
      
      if (light2.current) {
        light2.current.position.x = Math.cos(t * 0.5 + Math.PI) * 2;
        light2.current.position.z = Math.sin(t * 0.5 + Math.PI) * 2;
        light2.current.intensity = 0.8 + Math.cos(t * 1.5) * 0.2;
      }
    });

    return (
      <>
        <pointLight 
          ref={light1}
          position={[2, 3, 5]} 
          intensity={1.5} 
          color="#e0b070"
          distance={8}
          decay={2}
        />
        <pointLight 
          ref={light2}
          position={[-3, -2, 2]} 
          intensity={0.8} 
          color="#b6c68a"
          distance={6}
          decay={2}
        />
        <spotLight
          position={[0, 5, 0]}
          angle={0.3}
          penumbra={0.5}
          intensity={0.5}
          color="#f0d080"
          target-position={[0, 0, 0]}
        />
      </>
    );
  };

  // Loading fallback mejorado
  const LoadingFallback = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[#d28b5c] border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-[#e0b070] rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && <LoadingFallback />}
      
      <Canvas
        camera={{ 
          position: [0, 0, 4], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: "high-performance"
        }}
        shadows
        dpr={[1, 2]} // Responsive pixel ratio
      >
        <color attach="background" args={['#000']} />
        
        {/* Fog para profundidad */}
        <fog attach="fog" args={['#000', 8, 15]} />
        
        {/* Luces base */}
        <ambientLight intensity={0.2} color="#1a1a2e" />
        
        <Suspense fallback={null}>
          <EnhancedParticles />
          <EnergyRings />
          <Model />
          <DynamicLights />
          
          <EffectComposer>
            <Bloom 
              intensity={1.2} 
              luminanceThreshold={0.15} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.001, 0.001)}
            />
            <Vignette
              offset={0.3}
              darkness={0.5}
              blendFunction={BlendFunction.MULTIPLY}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
      
      {/* Overlay gradient para mejor integración */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}