import { useState, useEffect } from "react";

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/BolaoDaGalera%20-%20sem%20fundo.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase] = useState<"bounce" | "fade-out">("bounce");

  useEffect(() => {
    // Bounce por 2.5s, depois fade out por 0.5s
    const bounceTimer = setTimeout(() => setPhase("fade-out"), 2500);
    const finishTimer = setTimeout(() => onFinish(), 3000);
    return () => { clearTimeout(bounceTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "fade-out" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 30%, #F9A825 100%)",
      }}
    >
      {/* Logo com animação bounce */}
      <div className="splash-logo-container">
        <img
          src={LOGO_URL}
          alt="Bolão da Galera"
          className="w-64 h-64 object-contain drop-shadow-2xl splash-bounce"
        />
      </div>

      {/* Subtítulo */}
      <p className="text-white/80 text-sm mt-4 splash-fade-in-delayed">
        Faça seus palpites e dispute com os amigos!
      </p>

      {/* Loading dot */}
      <div className="mt-10 splash-fade-in-delayed">
        <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white splash-pulse" />
        </div>
      </div>

      <style>{`
        @keyframes splashBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          15% { transform: translateY(-30px) scale(1.05); }
          30% { transform: translateY(0) scale(0.95); }
          45% { transform: translateY(-18px) scale(1.03); }
          60% { transform: translateY(0) scale(0.97); }
          75% { transform: translateY(-8px) scale(1.01); }
          90% { transform: translateY(0) scale(1); }
        }

        @keyframes splashFadeIn {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }

        .splash-bounce {
          animation: splashBounce 1.8s ease-in-out infinite;
        }

        .splash-fade-in {
          animation: splashFadeIn 0.6s ease-out 0.3s both;
        }

        .splash-fade-in-delayed {
          animation: splashFadeIn 0.6s ease-out 0.6s both;
        }

        .splash-pulse {
          animation: splashPulse 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
