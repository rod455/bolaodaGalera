import { useState, useEffect } from "react";

const LOGO_URL = "https://dtfqmxmmbbfmfpouzqzt.supabase.co/storage/v1/object/public/logos/Splash.png";

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
        background: "#FAFAF7",
      }}
    >
      {/* Logo com animação bounce */}
      <div className="splash-logo-container">
        <img
          src={LOGO_URL}
          alt="Bolão da Galera"
          className="w-72 h-72 object-contain drop-shadow-xl splash-bounce"
        />
      </div>

      {/* Nome do app */}
      <h1 className="text-copa-green-700 text-3xl font-black mt-6 tracking-tight splash-fade-in">
        Bolão da Galera
      </h1>

      {/* Subtítulo */}
      <p className="text-copa-green-600/80 text-sm mt-2 splash-fade-in-delayed">
        Reúna os amigos, vibre com a galera.
      </p>

      {/* Loading dot */}
      <div className="mt-10 splash-fade-in-delayed">
        <div className="w-8 h-8 rounded-full bg-copa-green-100 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-copa-green-500 splash-pulse" />
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


