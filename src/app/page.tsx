'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Star, Zap, Code, Workflow } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

// Deterministic pseudo-random function for SSR consistency
// Rounds to 4 decimal places to avoid hydration mismatches
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  const value = x - Math.floor(x);
  return Math.round(value * 10000) / 10000;
};

// Mock components - replace with your actual imports
const AuthHeader = () => (
  <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      {/* Logo and Brand */}
      <motion.div 
        className="flex items-center gap-3"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <img 
          src="/assets/images/icon.png" 
          alt="Nodify Logo" 
          className="w-8 h-8 object-contain"
        />
        <span 
          className="text-2xl font-bold text-[#d28b5c] tracking-tight"
        >
          Nodify
        </span>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 text-white hover:text-[#d28b5c] hover:bg-[#d28b5c]/10 transition-all duration-300 rounded-lg font-medium"
          onClick={() => window.location.href = '/login'}
        >
          Login
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-[#d28b5c] hover:bg-[#b8764d] text-white shadow-lg shadow-[#d28b5c]/30 border border-[#e0b070]/30 rounded-lg font-medium transition-all duration-300"
          onClick={() => window.location.href = '/register'}
        >
          Sign Up
        </motion.button>
      </div>
    </div>
  </header>
);

// Import your actual 3D component here
// import NodifyBoltScene from '@/components/landing/Hero';

// Enhanced version that combines your 3D logo with automation effects
const EnhancedNodifyScene = () => (
  <div className="absolute inset-0 w-full h-full">
    {/* Your original 3D scene - replace this div with: <NodifyBoltScene className="absolute inset-0" height="100vh" /> */}
    <div className="absolute inset-0">
      {/* Placeholder for your actual NodifyBoltScene component */}
      <div className="w-full h-full bg-black" />
    </div>
    
    {/* Automation Lightning Effects Layer */}
    <div className="absolute inset-0 pointer-events-none">
      {/* Main Lightning Bolts */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
        {/* Central automation hub rays */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * 360;
          const x1 = 50;
          const y1 = 50;
          const length = 25 + seededRandom(i * 100) * 15;
          const x2 = x1 + Math.cos(angle * Math.PI / 180) * length;
          const y2 = y1 + Math.sin(angle * Math.PI / 180) * length;

          return (
            <motion.line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="url(#lightningGradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0, 1, 0.3, 0],
                strokeWidth: [1, 3, 1]
              }}
              transition={{
                duration: 2 + seededRandom(i * 101),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            />
          );
        })}
        
        {/* Zigzag automation paths */}
        {Array.from({ length: 6 }).map((_, i) => {
          const startX = seededRandom(i * 200) * 100;
          const startY = seededRandom(i * 201) * 100;
          const pathData = `M${startX},${startY} L${startX + 10},${startY - 5} L${startX + 20},${startY + 3} L${startX + 30},${startY - 8} L${startX + 40},${startY + 2}`;

          return (
            <motion.path
              key={`zigzag-${i}`}
              d={pathData}
              stroke="#e0b070"
              strokeWidth="1.5"
              fill="none"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                opacity: [0, 0.8, 0.8, 0]
              }}
              transition={{
                duration: 3 + seededRandom(i * 202) * 2,
                repeat: Infinity,
                delay: seededRandom(i * 203) * 3,
                ease: "easeInOut"
              }}
            />
          );
        })}
        
        {/* Data flow particles along paths */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.circle
            key={`particle-${i}`}
            r="2"
            fill="#d28b5c"
            filter="url(#glow)"
            initial={{
              cx: "10%",
              cy: "10%",
              opacity: 0
            }}
            animate={{
              cx: ["10%", "90%", "10%"],
              cy: ["10%", "90%", "10%"],
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5]
            }}
            transition={{
              duration: 4 + seededRandom(i * 300) * 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Definitions for gradients and effects */}
        <defs>
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d28b5c" stopOpacity="1"/>
            <stop offset="50%" stopColor="#e0b070" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#d1bfa5" stopOpacity="0.6"/>
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      {/* Floating automation nodes */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute w-3 h-3 rounded-full border border-[#d28b5c] bg-[#d28b5c]/20 backdrop-blur-sm"
          style={{
            left: `${10 + seededRandom(i * 400) * 80}%`,
            top: `${10 + seededRandom(i * 401) * 80}%`,
          }}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 1, 0.3],
            boxShadow: [
              "0 0 5px #d28b5c",
              "0 0 20px #e0b070",
              "0 0 5px #d28b5c"
            ]
          }}
          transition={{
            duration: 2 + seededRandom(i * 402) * 3,
            repeat: Infinity,
            delay: seededRandom(i * 403) * 2,
          }}
        />
      ))}
      
      {/* Pulsing energy rings around the center */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-[#e0b070]/30 rounded-full"
          style={{
            width: `${(i + 1) * 200}px`,
            height: `${(i + 1) * 200}px`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.6, 0.2],
            borderColor: [
              "rgba(224, 176, 112, 0.3)",
              "rgba(210, 139, 92, 0.8)",
              "rgba(224, 176, 112, 0.3)"
            ]
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut"
          }}
        />
      ))}
      
      {/* Corner to center connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        {[
          { from: [0, 0], to: [50, 50] },
          { from: [100, 0], to: [50, 50] },
          { from: [0, 100], to: [50, 50] },
          { from: [100, 100], to: [50, 50] }
        ].map((line, i) => (
          <motion.line
            key={`connection-${i}`}
            x1={`${line.from[0]}%`}
            y1={`${line.from[1]}%`}
            x2={`${line.to[0]}%`}
            y2={`${line.to[1]}%`}
            stroke="#d1bfa5"
            strokeWidth="1"
            strokeDasharray="5,5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.6, 0],
              strokeDashoffset: [0, -10]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  </div>
);

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "200%"]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-black text-white overflow-x-hidden">
      <AuthHeader />

      <main className="flex-1">
        {/* === Enhanced Hero Section === */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          {/* Enhanced 3D Background with Automation Effects */}
          <motion.div 
            style={{ y: backgroundY }}
            className="absolute inset-0 z-0"
          >
            <EnhancedNodifyScene />
          </motion.div>
          
          {/* Enhanced Gradient Overlays for automation theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-10" />
          
          {/* Automation data streams overlay */}
          <div className="absolute inset-0 z-15 pointer-events-none">
            {/* Floating data packets */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`data-packet-${i}`}
                className="absolute text-[#e0b070] text-xs font-mono opacity-60"
                style={{
                  left: `${20 + seededRandom(i * 500) * 60}%`,
                  top: `${20 + seededRandom(i * 501) * 60}%`,
                }}
                animate={{
                  y: [-20, -60, -20],
                  opacity: [0, 0.8, 0],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 4 + seededRandom(i * 502) * 2,
                  repeat: Infinity,
                  delay: seededRandom(i * 503) * 3,
                }}
              >
                {['API', 'DATA', 'FLOW', 'AUTO', 'SYNC', 'EXEC'][Math.floor(seededRandom(i * 504) * 6)]}
              </motion.div>
            ))}
            
            {/* Binary rain effect */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={`binary-${i}`}
                className="absolute text-[#d28b5c] text-xs font-mono opacity-30"
                style={{
                  left: `${seededRandom(i * 600) * 100}%`,
                  top: `-10%`,
                }}
                animate={{
                  y: ["0vh", "110vh"],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: 8 + seededRandom(i * 601) * 4,
                  repeat: Infinity,
                  delay: seededRandom(i * 602) * 5,
                  ease: "linear"
                }}
              >
                {seededRandom(i * 603) > 0.5 ? '1' : '0'}
              </motion.div>
            ))}
          </div>
          
          {/* Hero Content */}
          <motion.div 
            style={{ y: textY }}
            className="relative z-20 text-center px-6 max-w-6xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <motion.h1 
                className="text-6xl md:text-8xl font-black mb-8 leading-tight relative"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #d28b5c 30%, #e0b070 70%, #ffffff 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  backgroundSize: "200% 200%"
                }}
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <motion.span
                  animate={{
                    textShadow: [
                      "0 0 20px rgba(210, 139, 92, 0.5)",
                      "0 0 40px rgba(224, 176, 112, 0.8)",
                      "0 0 20px rgba(210, 139, 92, 0.5)"
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  Automate. Connect.
                </motion.span>
                <br />
                <span className="relative">
                  <motion.span
                    className="text-[#d28b5c]"
                    animate={{
                      textShadow: [
                        "0 0 10px rgba(210, 139, 92, 0.8)",
                        "0 0 30px rgba(224, 176, 112, 1)",
                        "0 0 10px rgba(210, 139, 92, 0.8)"
                      ]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    Create
                  </motion.span>
                  {/* Your logo after "Create" */}
                  <motion.span
                    className="inline-block ml-4 align-middle"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0],
                      filter: [
                        "drop-shadow(0 0 5px #e0b070)",
                        "drop-shadow(0 0 15px #d28b5c)",
                        "drop-shadow(0 0 5px #e0b070)"
                      ]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <img
                      src="/assets/images/icon.png"
                      alt="Nodify Logo"
                      className="w-12 h-12 md:w-16 md:h-16 object-contain"
                    />
                  </motion.span>
                  <span className="text-white"> with Nodify.</span>
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <motion.span
                  animate={{
                    color: ["#d1d5db", "#e0b070", "#d1d5db"]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  Visual workflows powered by AI.
                </motion.span>
                {" "}Build automations that think, learn, and adapt — all from one intuitive canvas.
                
                {/* Floating automation keywords */}
                <motion.span
                  className="absolute -top-8 left-1/4 text-sm text-[#d28b5c] font-mono opacity-60"
                  animate={{
                    y: [-5, -15, -5],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: 1
                  }}
                >
                  {"{ AI_POWERED }"}
                </motion.span>
                
                <motion.span
                  className="absolute -bottom-8 right-1/4 text-sm text-[#e0b070] font-mono opacity-60"
                  animate={{
                    y: [5, 15, 5],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: 2
                  }}
                >
                  {"< AUTOMATED />"}
                </motion.span>
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    asChild 
                    size="lg"
                    className="relative bg-[#d28b5c] hover:bg-[#b8764d] text-white px-12 py-6 text-lg font-semibold rounded-xl shadow-2xl shadow-[#d28b5c]/30 border border-[#e0b070]/30 overflow-hidden group"
                  >
                    <Link href="/register">
                      {/* Lightning animation background */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-[#e0b070] via-[#d28b5c] to-[#e0b070]"
                        animate={{
                          x: ["-100%", "100%"],
                          opacity: [0, 0.3, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <span className="relative z-10 flex items-center">
                        ⚡ Start Building Free
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <ArrowRight className="ml-3 h-6 w-6" />
                        </motion.div>
                      </span>
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-2 border-white/30 text-white hover:bg-white/10 px-12 py-6 text-lg rounded-xl backdrop-blur-sm"
                  >
                    Watch Demo
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div 
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/70 rounded-full mt-2" />
            </div>
          </motion.div>
        </section>

        {/* === Features Section === */}
        <section className="relative py-32 bg-gradient-to-b from-black to-gray-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full bg-[radial-gradient(circle_at_center,#d28b5c_1px,transparent_1px)] bg-[length:50px_50px]" />
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">
                Why Choose <span className="text-[#d28b5c]">Nodify</span>?
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                The perfect blend of visual simplicity and unlimited power
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-12">
              {[
                {
                  icon: <Workflow className="h-12 w-12" />,
                  title: "Visual Workflow Builder",
                  description: "Drag, drop, and connect. Build complex automations with our intuitive visual canvas that makes sense to everyone.",
                  gradient: "from-blue-500 to-cyan-400"
                },
                {
                  icon: <Zap className="h-12 w-12" />,
                  title: "AI-Powered Intelligence",
                  description: "Smart suggestions, automatic optimizations, and adaptive workflows that learn from your patterns and improve over time.",
                  gradient: "from-[#d28b5c] to-[#e0b070]"
                },
                {
                  icon: <Code className="h-12 w-12" />,
                  title: "Code When You Need It",
                  description: "Switch to code blocks seamlessly. Full JavaScript support, custom APIs, and unlimited extensibility for power users.",
                  gradient: "from-purple-500 to-pink-400"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group"
                >
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-xl h-full hover:border-[#d28b5c]/50 transition-all duration-500">
                    <CardContent className="p-8 text-center">
                      <motion.div 
                        className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}
                      >
                        {feature.icon}
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === Interactive Demo Section === */}
        <section className="relative py-32 bg-gradient-to-b from-gray-900 to-black overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div 
              className="grid lg:grid-cols-2 gap-16 items-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <div>
                <motion.h2 
                  className="text-5xl font-bold text-white mb-6"
                  initial={{ x: -50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  See It In <span className="text-[#d28b5c]">Action</span>
                </motion.h2>
                <motion.p 
                  className="text-xl text-gray-400 mb-8 leading-relaxed"
                  initial={{ x: -50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Watch how Nodify transforms complex automation challenges into simple, visual workflows that anyone can build and understand.
                </motion.p>
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button 
                    size="lg"
                    className="bg-[#d28b5c] hover:bg-[#b8764d] text-white px-8 py-4 text-lg rounded-xl"
                  >
                    Try Interactive Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
              
              <motion.div 
                className="relative"
                initial={{ x: 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="relative bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 backdrop-blur-xl">
                  {/* Simulated workflow preview */}
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30"
                        whileHover={{ scale: 1.02 }}
                        animate={{ 
                          borderColor: i === 2 ? "#d28b5c" : "rgba(75, 85, 99, 0.3)" 
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
                      >
                        <div className="w-3 h-3 bg-[#d28b5c] rounded-full animate-pulse" />
                        <div className="flex-1">
                          <div className="h-2 bg-gray-600 rounded w-3/4 mb-2" />
                          <div className="h-2 bg-gray-700 rounded w-1/2" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-[#d28b5c]" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* === Testimonials === */}
        <section className="py-32 bg-black relative">
          <div className="container mx-auto px-6">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Trusted by <span className="text-[#d28b5c]">10,000+</span> Creators
              </h2>
              <p className="text-gray-400 text-lg">See what our community is building</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "Nodify cut our automation development time by 80%. What used to take weeks now takes hours.",
                  author: "Sarah Chen",
                  role: "CTO, TechFlow",
                  rating: 5
                },
                {
                  quote: "The visual interface is incredible. Finally, our entire team can build and understand our workflows.",
                  author: "Marcus Rodriguez",
                  role: "Operations Director",
                  rating: 5
                },
                {
                  quote: "The AI suggestions have saved us countless hours. It's like having a senior developer on the team.",
                  author: "Emily Watson",
                  role: "Lead Developer",
                  rating: 5
                }
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-xl h-full hover:border-[#d28b5c]/30 transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-gray-300 mb-6 italic leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#d28b5c] to-[#e0b070] rounded-full flex items-center justify-center text-white font-bold">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{testimonial.author}</p>
                          <p className="text-sm text-gray-400">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* === Enhanced Final CTA === */}
        <section className="relative py-32 bg-gradient-to-t from-black to-gray-900 text-center overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-[#d28b5c] rounded-full"
                style={{
                  left: `${seededRandom(i * 700) * 100}%`,
                  top: `${seededRandom(i * 701) * 100}%`,
                }}
                animate={{
                  y: [-20, -100],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + seededRandom(i * 702) * 2,
                  repeat: Infinity,
                  delay: seededRandom(i * 703) * 3,
                }}
              />
            ))}
          </div>

          <motion.div 
            className="container mx-auto px-6 relative z-10"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              Ready to Transform Your
              <br />
              <span className="text-[#d28b5c]">Workflow?</span>
            </motion.h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              Join thousands of creators who are already building the future with Nodify. 
              Start free, scale unlimited.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              whileHover={{ scale: 1.02 }}
            >
              <Button 
                asChild
                size="lg"
                className="bg-[#d28b5c] hover:bg-[#b8764d] text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl shadow-[#d28b5c]/40 border-2 border-[#e0b070]/30"
              >
                <Link href="/register">
                  Start Building Today
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </Button>
              
              <p className="text-gray-500 text-sm">
                Free forever • No credit card required • 30-day pro trial
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* === Footer === */}
      <footer className="py-12 bg-black border-t border-gray-800 text-center">
        <div className="container mx-auto px-6">
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} Nodify. Empowering creators worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}