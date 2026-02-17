import { Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PromoBannerProps {
  /** Se o usuário já participa do bolão do Paulistão */
  jaParticipa?: boolean;
  /** ID do bolão do Paulistão (para link direto) */
  bolaoId?: string;
}

const PromoBanner = ({ jaParticipa = false, bolaoId }: PromoBannerProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        if (bolaoId) navigate(`/bolao/${bolaoId}`);
      }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group mb-6"
      style={{
        background: "linear-gradient(135deg, #92400E 0%, #B45309 25%, #D97706 50%, #F59E0B 75%, #EAB308 100%)",
        border: "2px solid rgba(250, 204, 21, 0.4)",
        boxShadow: "0 4px 20px rgba(234, 179, 8, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* Efeito de brilho */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute -top-1/2 -right-1/4 w-1/2 h-[200%] opacity-10 group-hover:opacity-20 transition-opacity duration-500"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          transform: "rotate(15deg)",
        }}
      />

      <div className="relative z-10 flex items-center gap-4 p-4 sm:p-5">
        {/* Ícone */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Trophy className="w-7 h-7 text-white" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              🏆 Promoção
            </span>
          </div>
          <p className="text-white font-bold text-sm sm:text-base leading-snug">
            Dispute o Bolão do Paulistão de forma gratuita e concorra a{" "}
            <span style={{ color: "#FEF9C3" }}>R$ 200 em prêmios!</span>
          </p>
          <p className="text-white/60 text-xs mt-1">
            {jaParticipa
              ? "Você já está participando! Continue fazendo seus palpites."
              : "Inscreva-se até sábado (22/02) às 18h — é grátis e sem compromisso."}
          </p>
        </div>

        {/* Seta */}
        <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0 group-hover:text-white/80 transition-colors" />
      </div>
    </div>
  );
};

export default PromoBanner;
