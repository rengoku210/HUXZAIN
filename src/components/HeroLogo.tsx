import mark from "@/assets/huxzain-mark.png";

export default function HeroLogo() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full select-none min-h-[380px] sm:min-h-[420px]">
      <style>{`
        @keyframes float-logo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float-logo {
          animation: float-logo 6s ease-in-out infinite;
        }
      `}</style>

      {/* Background Vertical Light Bars / Studios reflections */}
      <div className="absolute inset-0 flex justify-around pointer-events-none opacity-20">
        <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-gold to-transparent blur-[3px]" />
        <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-gold/50 to-transparent blur-[2px]" />
      </div>

      {/* Ambient glow behind the logo */}
      <div 
        className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.02) 50%, rgba(0, 0, 0, 0) 70%)",
          filter: "blur(35px)",
          transform: "translateY(-40px)"
        }}
      />

      {/* Main Mark (Symbol) Container */}
      <div className="relative z-10 flex flex-col items-center justify-center transform hover:scale-[1.02] transition-transform duration-500 animate-float-logo">
        {/* Floating Logo Mark */}
        <img
          src={mark}
          alt="HUXZAIN"
          className="max-h-[220px] sm:max-h-[260px] w-auto object-contain pointer-events-none drop-shadow-[0_15px_35px_rgba(212,175,55,0.3)]"
        />

        {/* Reflection of the mark below it */}
        <div 
          className="w-full h-[50px] opacity-15 pointer-events-none mt-2 overflow-hidden relative"
          style={{
            transform: "scaleY(-1)",
            WebkitMaskImage: "linear-gradient(to top, transparent 35%, rgba(0,0,0,0.8) 100%)",
            maskImage: "linear-gradient(to top, transparent 35%, rgba(0,0,0,0.8) 100%)"
          }}
        >
          <img
            src={mark}
            alt=""
            className="max-h-[220px] sm:max-h-[260px] w-auto object-contain mx-auto filter blur-[2.5px]"
          />
        </div>
      </div>

      {/* 3D Pedestal / Platform */}
      <div className="relative w-[280px] sm:w-[320px] h-[80px] mt-[-25px] flex items-center justify-center pointer-events-none">
        {/* Pedestal Base - Dark ellipse with gold highlights */}
        <div 
          className="absolute w-[280px] sm:w-[320px] h-[60px] sm:h-[64px] rounded-full bg-gradient-to-b from-[#18191e] to-[#08090b] border border-gold/15 shadow-[0_10px_30px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(212,175,55,0.25)]"
          style={{
            transform: "rotateX(60deg)"
          }}
        />

        {/* Glowing top rim of the pedestal */}
        <div 
          className="absolute w-[260px] sm:w-[300px] h-[46px] sm:h-[50px] rounded-full bg-transparent border-2 border-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          style={{
            transform: "rotateX(60deg) translateY(-2px)"
          }}
        />

        {/* Intense core gold light source inside the pedestal */}
        <div 
          className="absolute w-[160px] sm:w-[180px] h-[26px] sm:h-[30px] rounded-full opacity-70"
          style={{
            background: "radial-gradient(ellipse, rgba(212, 175, 55, 0.6) 0%, rgba(212, 175, 55, 0.2) 50%, transparent 80%)",
            transform: "rotateX(60deg) translateY(-4px)",
            filter: "blur(4px)"
          }}
        />
      </div>
    </div>
  );
}
