import { useState } from "react";
import { Trophy, ChevronRight, Loader2, Clock, Hourglass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FREE_MAX_PARTICIPANTES, PREMIUM_MAX_PARTICIPANTES, PREMIUM_PRO_MAX_PARTICIPANTES } from "@/lib/constants";

interface PromoBannerProps {
  jaParticipa?: boolean;
  bolaoId?: string;
}

const PromoBanner = ({ jaParticipa = false, bolaoId }: PromoBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);

  const checkBolaoCapacity = async (id: string): Promise<boolean> => {
    const { count } = await supabase
      .from("bolao_participantes")
      .select("*", { count: "exact", head: true })
      .eq("bolao_id", id)
      .eq("status", "ativo");
    const currentCount = count || 0;
    const { data: participants } = await supabase
      .from("bolao_participantes")
      .select("user_id, profiles(plano)")
      .eq("bolao_id", id)
      .eq("status", "ativo");
    const { data: bolaoData } = await supabase
      .from("boloes")
      .select("criador_id, profiles(plano)")
      .eq("id", id)
      .single();
    const allPlanos = [
      ...(participants || []).map((p: any) => p.profiles?.plano),
      bolaoData?.profiles?.plano,
    ];
    const hasProMember = allPlanos.includes("premium_pro");
    const hasPremiumMember = hasProMember || allPlanos.includes("premium");
    const maxCapacity = hasProMember ? PREMIUM_PRO_MAX_PARTICIPANTES : hasPremiumMember ? PREMIUM_MAX_PARTICIPANTES : FREE_MAX_PARTICIPANTES;
    if (currentCount >= maxCapacity) {
      toast.error(`Este grupo está lotado! Limite de ${maxCapacity} participantes.${!hasPremiumMember ? " Com Premium o limite sobe para 30, e com Premium PRO para 50!" : !hasProMember ? " Com Premium PRO o limite sobe para 50!" : ""}`);
      return false;
    }
    return true;
  };

  const handleClick = async () => {
    if (!bolaoId || !user) return;

    if (jaParticipa) {
      navigate(`/bolao/${bolaoId}`);
      return;
    }

    setJoining(true);
    try {
      if (!(await checkBolaoCapacity(bolaoId))) {
        setJoining(false);
        return;
      }

      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: bolaoId, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
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
      className={`relative overflow-hidden rounded-2xl cursor-pointer group mb-4 ${joining ? "pointer-events-none opacity-80" : ""}`}
      style={{
        background: "linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 40%, #111111 100%)",
        border: "1px solid rgba(234, 179, 8, 0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.1)",
      }}
    >
      {/* Efeito de brilho dourado sutil */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Textura de campo */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.08) 30px, rgba(255,255,255,0.08) 31px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-5 py-6">
        {/* Troféu */}
        <div className="text-5xl mb-2 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 12px rgba(234,179,8,0.4))" }}>
          🏆
        </div>

        {/* Valor do prêmio */}
        <h2
          className="text-3xl sm:text-4xl font-black tracking-tight"
          style={{
            color: "#FBBF24",
            textShadow: "0 0 20px rgba(251,191,36,0.3), 0 2px 4px rgba(0,0,0,0.5)",
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          }}
        >
          R$200 EM PRÊMIO
        </h2>

        {/* Subtítulo */}
        <p className="text-white/80 text-sm font-semibold mt-1.5 tracking-wide">
          Bolão do Paulistão — Semifinais
        </p>

        {/* Badge de urgência */}
        <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full"
          style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.25)" }}>
          <span className="text-amber-400 text-xs">⏳</span>
          <span className="text-amber-300 text-xs font-bold">
            {jaParticipa ? "Você já está participando!" : "Últimas vagas - 100% grátis"}
          </span>
        </div>

        {/* Botão CTA */}
        <button
          className="mt-4 w-full max-w-xs h-12 flex items-center justify-center gap-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all group-hover:scale-[1.02] group-hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            color: "white",
            boxShadow: "0 4px 16px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
            letterSpacing: "0.08em",
          }}
        >
          {joining ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
          ) : (
            <>
              {jaParticipa ? "VER MEUS PALPITES" : "CRIAR MEU BOLÃO AGORA"}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;
