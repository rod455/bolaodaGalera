import { useNavigate } from "react-router-dom";
import { Crown, Zap, X, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpsellReason = "criar_limite" | "privado_limite" | "grupo_lotado" | "modo_bloqueado";

interface PremiumUpsellModalProps {
  open: boolean;
  onClose: () => void;
  reason: UpsellReason;
  extraInfo?: string; // ex: nome do modo, limite atual, etc.
}

const UPSELL_CONTENT: Record<UpsellReason, {
  icon: string;
  title: string;
  subtitle: string;
  benefits: string[];
}> = {
  criar_limite: {
    icon: "🚫",
    title: "Limite de grupos atingido",
    subtitle: "No plano Free você pode criar apenas 1 grupo privado. Com Premium PRO, crie quantos quiser!",
    benefits: [
      "Grupos ilimitados",
      "Até 50 participantes por grupo",
      "Sem anúncios entre telas",
      "Todos os modos de jogo",
    ],
  },
  privado_limite: {
    icon: "🔒",
    title: "Limite de grupos privados",
    subtitle: "Você já participa de 3 grupos privados no plano Free. Desbloqueie participação ilimitada!",
    benefits: [
      "Participe de grupos ilimitados",
      "Crie quantos grupos quiser",
      "Sem anúncios entre telas",
      "Badge Premium no perfil",
    ],
  },
  grupo_lotado: {
    icon: "👥",
    title: "Grupo lotado!",
    subtitle: "Este grupo atingiu o limite de participantes do plano Free. Com Premium, o limite sobe para 50!",
    benefits: [
      "Até 50 participantes por grupo",
      "Grupos ilimitados",
      "Sem anúncios entre telas",
      "Modos de jogo exclusivos",
    ],
  },
  modo_bloqueado: {
    icon: "🎮",
    title: "Modo exclusivo Premium",
    subtitle: "Este modo de jogo é exclusivo para assinantes. Desbloqueie modos com pontuações diferenciadas!",
    benefits: [
      "Modos: Profissional, Fanático, Tudo ou Nada",
      "Grupos ilimitados",
      "Sem anúncios entre telas",
      "Suporte prioritário",
    ],
  },
};

const PremiumUpsellModal = ({ open, onClose, reason, extraInfo }: PremiumUpsellModalProps) => {
  const navigate = useNavigate();

  if (!open) return null;

  const content = UPSELL_CONTENT[reason];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 text-center"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)" }}>
          <button onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="text-4xl mb-3">{content.icon}</div>
          <h3 className="text-lg font-bold text-white">{content.title}</h3>
          {extraInfo && (
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(250,204,21,.15)", color: "#facc15", border: "1px solid rgba(250,204,21,.3)" }}>
              {extraInfo}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{content.subtitle}</p>

          {/* Benefits */}
          <div className="space-y-2.5">
            {content.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-copa-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-copa-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{b}</span>
              </div>
            ))}
          </div>

          {/* Preço */}
          <div className="text-center bg-copa-gold-50 border border-copa-gold-200 rounded-xl py-3 px-4">
            <p className="text-xs text-muted-foreground">Premium PRO a partir de</p>
            <p className="text-xl font-black text-copa-green-700">
              <span className="line-through text-sm font-normal text-muted-foreground mr-1">R$ 39,90</span>
              R$ 14,90<span className="text-sm font-semibold">/mês</span>
            </p>
            <p className="text-[10px] text-copa-gold-600 font-semibold mt-0.5">Preço promocional por tempo limitado</p>
          </div>

          {/* CTAs */}
          <Button
            onClick={() => { onClose(); navigate("/planos"); }}
            className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black text-sm rounded-xl shadow-md"
          >
            <Zap className="w-4 h-4 mr-2" />
            Assinar Premium PRO
          </Button>

          <button onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumUpsellModal;
export type { UpsellReason };

