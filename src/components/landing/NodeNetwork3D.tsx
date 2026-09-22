// src/components/landing/NodeNetwork3D.tsx
'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function NodeNetwork3D() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene / Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 45;

    // Renderer transparente
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // <-- transparente
    container.appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0x9ab3ff, 0.8);
    const pointLight = new THREE.PointLight(0x88aaff, 1.2);
    pointLight.position.set(10, 20, 20);
    scene.add(ambientLight, pointLight);

    // Nodos
    const nodeGeom = new THREE.SphereGeometry(0.32, 16, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x7c3aed,     // toma tu primario violeta para más punch
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.25,
    });

    const nodes: THREE.Mesh[] = [];
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(nodeGeom, nodeMat);
      m.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 36
      );
      scene.add(m);
      nodes.push(m);
    }

    // Líneas (estáticas: suficiente para el “wow” inicial)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7aa2ff, transparent: true, opacity: 0.45 });
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].position;
        const b = nodes[j].position;
        if (a.distanceTo(b) < 14) {
          const geom = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
          scene.add(new THREE.Line(geom, lineMat));
        }
      }
    }

    // GSAP: movimiento suave de nodos + respiración de cámara
    nodes.forEach((n) => {
      gsap.to(n.position, {
        x: n.position.x + (Math.random() - 0.5) * 4,
        y: n.position.y + (Math.random() - 0.5) * 4,
        z: n.position.z + (Math.random() - 0.5) * 4,
        duration: 5 + Math.random() * 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    gsap.to(camera.position, {
      z: 55,
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Loop
    const animate = () => {
      scene.rotation.y += 0.0016;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 w-full h-full pointer-events-none"
    />
  );
}
