import logo from "@/assets/huxzain-logo.png";
import { motion } from "framer-motion";
import { useMemo } from "react";

export default function HeroLogo() {
  // Generate random stable properties for the particles to avoid re-generating on each render
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1.5, // 1.5px to 4.5px
      startX: Math.random() * 80 - 40, // -40% to 40% from center
      startY: Math.random() * 60 - 20, // -20% to 40% from center
      driftX: Math.random() * 30 - 15, // -15% to 15% drift
      duration: Math.random() * 8 + 8, // 8s to 16s
      delay: Math.random() * 6,
    }));
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full select-none">
      
      {/* STATE 3 - Ambient Glow: Soft golden glow behind the logo */}
      <motion.div
        className="absolute w-[85%] h-[85%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.04) 45%, rgba(0, 0, 0, 0) 70%)",
          filter: "blur(24px)",
          zIndex: 1,
        }}
        animate={{
          scale: [0.95, 1.05, 0.95],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* OPTIONAL PARTICLE EFFECT: Small gold particles floating slowly */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-b from-gold to-amber-500/80"
            style={{
              width: p.size,
              height: p.size,
              left: `${50 + p.startX}%`,
              top: `${60 + p.startY}%`,
              filter: "blur(0.3px)",
            }}
            animate={{
              y: [0, -140],
              x: [0, p.driftX],
              opacity: [0, 0.4, 0.2, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* STATE 1 - Idle: Breathing scale animation */}
      <motion.div
        className="relative z-10 flex items-center justify-center max-w-full"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Main Logo Image */}
        <img
          src={logo}
          alt="HUXZAIN"
          className="max-h-[350px] w-auto object-contain pointer-events-none drop-shadow-[0_6px_30px_rgba(0,0,0,0.65)]"
        />

        {/* STATE 2 - Gold Shine Sweep: Translating gold light bar masked by the logo */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            WebkitMaskImage: `url(${logo})`,
            maskImage: `url(${logo})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        >
          <motion.div
            className="absolute"
            style={{
              width: "200%",
              height: "80px",
              background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(212,175,55,0.2) 30%, rgba(255,235,170,0.7) 50%, rgba(212,175,55,0.2) 70%, rgba(255,255,255,0) 100%)",
              transform: "rotate(-35deg) translateY(-50%)",
              left: "-50%",
              top: "20%",
              mixBlendMode: "color-dodge",
            }}
            animate={{
              x: ["-80%", "80%"],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 4.5,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* STATE 3 - Subtle reflection */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
          }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
