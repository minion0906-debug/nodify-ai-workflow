import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  // Pre-generate particle positions to avoid hydration mismatch
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: (i * 37.5) % 100, // Deterministic positioning
      top: (i * 23.7) % 100,
      duration: 2 + (i % 3),
      delay: (i % 5) * 0.4,
    }));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-[#d28b5c] rounded-full opacity-60"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      {/* Central loading animation */}
      <div className="relative flex items-center justify-center z-10">
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute h-32 w-32 rounded-full border-2 border-[#d28b5c]/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
            borderColor: [
              "rgba(210, 139, 92, 0.2)",
              "rgba(224, 176, 112, 0.6)",
              "rgba(210, 139, 92, 0.2)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Middle spinning ring */}
        <motion.div
          className="absolute h-24 w-24 rounded-full border-2 border-transparent border-t-[#e0b070] border-r-[#d28b5c]"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Inner background circle */}
        <motion.div
          className="absolute h-20 w-20 rounded-full bg-[#d28b5c]/10 backdrop-blur-sm"
          animate={{
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Logo container */}
        <motion.div
          className="relative z-10 flex items-center justify-center"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        >
          <img 
            src="/assets/images/icon.png" 
            alt="Nodify Logo" 
            className="h-12 w-12 object-contain"
          />
        </motion.div>
      </div>

      {/* Loading text with typewriter effect */}
      <motion.div
        className="mt-8 flex flex-col items-center space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <motion.p 
          className="text-lg font-medium text-[#e0b070]"
          animate={{
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Loading application...
        </motion.p>
        
        {/* Loading dots */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-[#d28b5c] rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Subtle automation-themed elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner connection lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          {[
            { from: [10, 10], to: [50, 50] },
            { from: [90, 10], to: [50, 50] },
            { from: [10, 90], to: [50, 50] },
            { from: [90, 90], to: [50, 50] }
          ].map((line, i) => (
            <motion.line
              key={i}
              x1={`${line.from[0]}%`}
              y1={`${line.from[1]}%`}
              x2={`${line.to[0]}%`}
              y2={`${line.to[1]}%`}
              stroke="#d28b5c"
              strokeWidth="1"
              strokeDasharray="3,3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 0],
                opacity: [0, 0.4, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </svg>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
};

export default LoadingScreen;