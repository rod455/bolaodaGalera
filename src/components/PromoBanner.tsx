import { useState } from "react";
import { Trophy, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PromoBannerProps {
  jaParticipa?: boolean;
  bolaoId?: string;
}

const PromoBanner = ({ jaParticipa = false, bolaoId }: PromoBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);

  const handleClick = async () => {
    if (!bolaoId || !user) return;

    // Já participa — só navegar
    if (jaParticipa) {
      navigate(`/bolao/${bolaoId}`);
      return;
    }

    // Não participa — entrar no bolão e depois navegar
    setJoining(true);
    try {
      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: bolaoId, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
          // Já participava (constraint unique) — só navegar
          toast.info("Você já está participando!");
        } else {
          throw error;
        }
      } else {
        toast.success("Você entrou no bolão! Faça seus palpites.");
      }

      navigate(`/bolao/${bolaoId}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar no bolão");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group mb-6 ${joining ? "pointer-events-none opacity-80" : ""}`}
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
              🚨 Últimas Vagas
            </span>
          </div>
          <p className="text-white font-bold text-sm sm:text-base leading-snug">
            <span style={{ color: "#FEF9C3" }}>R$ 200 EM PRÊMIOS</span> — ÚLTIMAS VAGAS!
          </p>
          <p className="text-white/70 text-xs mt-1">
            {jaParticipa
              ? "Você já está participando! Continue fazendo seus palpites."
              : "Dispute o Bolão do Paulistão gratuitamente e concorra ao valor total. Prazo final: sábado às 18h. Não fique de fora."}
          </p>
          <button
            className="mt-2 px-4 py-1.5 bg-white text-amber-800 font-bold text-xs rounded-lg hover:bg-white/90 transition-colors shadow-md flex items-center gap-1"
          >
            {joining ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Entrando...</>
            ) : (
              <>{jaParticipa ? "Ver meus palpites" : "Entrar agora"} <ChevronRight className="w-3.5 h-3.5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;
