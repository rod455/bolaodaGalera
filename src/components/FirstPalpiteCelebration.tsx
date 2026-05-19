// ═══════════════════════════════════════════════════════
// FirstPalpiteCelebration — Modal de celebração + convite
// Exibido após o primeiro palpite de um novo usuário
// Trigger: ?firstTime=true no Palpites.tsx
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { X, Share2, Copy, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { getInviteUrl } from "@/lib/constants";
import { shareViaWhatsApp } from "@/lib/utils";

interface FirstPalpiteCelebrationProps {
  open: boolean;
  onClose: () => void;
  bolaoId: string;
  bolaoNome: string;
  bolaoCode: string;
  /** Palpite que o usuário acabou de fazer: "Corinthians 2 x 1 Palmeiras" */
  palpiteResumo?: string;
}

// ── Confetti simples com CSS ──
const Confetti = () => {
  const colors = ["#16a34a", "#FBBF24", "#EF4444", "#3B82F6", "#A855F7", "#EC4899"];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[10002] overflow-hidden">
      {confettiPieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

const FirstPalpiteCelebration = ({
  open, onClose, bolaoId, bolaoNome, bolaoCode, palpiteResumo,
}: FirstPalpiteCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const inviteLink = getInviteUrl(bolaoId, bolaoCode, "whatsapp");

  // Mensagem WhatsApp contextual com o palpite real
  const whatsappText = [
    palpiteResumo
      ? `🎯 Acabei de palpitar ${palpiteResumo} no Grupo da Galera!`
      : `🏆 Acabei de fazer meu primeiro palpite no Grupo da Galera!`,
    `\nSer\u00e1 que voc\u00ea consegue me superar? 😏`,
    bolaoNome ? `\n\n⚽ Bol\u00e3o: ${bolaoNome}` : "",
    bolaoCode ? `\n📋 C\u00f3digo: ${bolaoCode}` : "",
    `\n👉 Entre aqui: ${inviteLink}`,
  ].join("");

  const handleWhatsApp = () => {
    shareViaWhatsApp(whatsappText);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(bolaoCode);
    setLinkCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-br from-copa-green-600 to-copa-green-700 px-6 pt-6 pb-8 text-center relative">
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-black text-white">Primeiro palpite feito!</h2>
            <p className="text-copa-green-100 text-sm mt-1.5">
              Agora falta desafiar alguém para ficar divertido
            </p>
          </div>

          {/* Conteúdo */}
          <div className="px-6 pb-6 -mt-3">
            {/* Card de convite */}
            <div className="bg-copa-gold-50 border border-copa-gold-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <p className="text-sm font-bold text-gray-800">
                  Bolão fica melhor com rival!
                </p>
              </div>

              {bolaoCode && (
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-copa-gold-100">
                  <span className="text-xs text-muted-foreground">Código:</span>
                  <span className="text-sm font-black tracking-wider flex-1">{bolaoCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-copa-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              )}

              <Button
                onClick={handleWhatsApp}
                className="w-full h-11 bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Desafiar pelo WhatsApp
              </Button>
            </div>

            {/* CTA Premium */}
            <a href="/planos"
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(250,204,21,.12)", border: "1px solid rgba(250,204,21,.3)", color: "#d97706" }}>
              ⚡ Premium PRO: sem anúncios + grupos ilimitados — R$ 14,90/mês
            </a>

            {/* Botão secundário para pular */}
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              Convidar depois — continuar palpitando
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FirstPalpiteCelebration;


