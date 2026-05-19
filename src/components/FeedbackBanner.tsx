import { useState, useEffect } from "react";
import { Star, X, Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

const FEEDBACK_DONE_KEY = "feedback_done";
const FEEDBACK_TRIGGER_KEY = "feedback_trigger";
import { getStoreUrl } from "@/lib/constants";
const PLAY_STORE_URL = getStoreUrl();

/**
 * Marca que o feedback deve ser solicitado na próxima visita à Home.
 * Chamar após salvar palpite, ver ranking, etc.
 */
export function triggerFeedback() {
  if (localStorage.getItem(FEEDBACK_DONE_KEY)) return;
  localStorage.setItem(FEEDBACK_TRIGGER_KEY, "true");
}

interface Props {
  className?: string;
}

export default function FeedbackBanner({ className }: Props) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovering, setHovering] = useState(0);
  const [step, setStep] = useState<"stars" | "improve" | "thanks">("stars");
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Já deu feedback antes — nunca mais mostrar
    if (localStorage.getItem(FEEDBACK_DONE_KEY)) return;
    // Precisa de um trigger ativo
    if (!localStorage.getItem(FEEDBACK_TRIGGER_KEY)) return;

    // Mostrar com delay para não competir com outros banners
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const markDone = () => {
    localStorage.setItem(FEEDBACK_DONE_KEY, "true");
    localStorage.removeItem(FEEDBACK_TRIGGER_KEY);
  };

  const handleDismiss = () => {
    setShow(false);
    // Remove trigger mas não marca como "done" — pode aparecer de novo
    localStorage.removeItem(FEEDBACK_TRIGGER_KEY);
    trackEvent("feedback_dismissed", {});
  };

  const handleRate = (stars: number) => {
    setRating(stars);
    trackEvent("feedback_rated", { stars });

    if (stars >= 4) {
      // Nota alta → direcionar para Play Store
      markDone();
      setStep("thanks");
      setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          window.open(PLAY_STORE_URL, "_system");
        } else {
          window.open(PLAY_STORE_URL, "_blank");
        }
      }, 800);
    } else {
      // Nota baixa → pedir feedback textual
      setStep("improve");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await supabase.functions.invoke("send-feedback", {
        body: {
          tipo: "sugestao",
          mensagem: `[Rating: ${rating}/5] ${feedback.trim()}`,
          nome: user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário",
          userId: user?.id,
          email: user?.email,
        },
      });
      trackEvent("feedback_submitted", { stars: rating });
    } catch {
      // Silently fail — feedback is best-effort
    }
    markDone();
    setStep("thanks");
    setSending(false);
  };

  if (!show) return null;

  return (
    <div className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 p-5 animate-fade-in ${className || ""}`}>
      {/* Botão fechar */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {step === "stars" && (
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-foreground">
            O que você acha do Grupo da Galera?
          </p>
          <p className="text-xs text-muted-foreground">
            Sua opinião nos ajuda a melhorar
          </p>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHovering(star)}
                onMouseLeave={() => setHovering(0)}
                onTouchStart={() => setHovering(star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hovering || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "improve" && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">
              O que podemos melhorar?
            </p>
            <div className="flex justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Conte o que você gostaria de ver diferente..."
            className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-copa-green-300 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => { markDone(); setShow(false); }}
              className="flex-1 text-xs text-muted-foreground"
            >
              Pular
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || sending}
              className="flex-1 bg-copa-green-500 hover:bg-copa-green-600 text-white text-xs rounded-xl"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Enviar
            </Button>
          </div>
        </div>
      )}

      {step === "thanks" && (
        <div className="text-center space-y-2 py-2">
          <p className="text-2xl">🎉</p>
          <p className="text-sm font-bold text-foreground">
            {rating >= 4 ? "Obrigado! Você está sendo redirecionado..." : "Obrigado pelo feedback!"}
          </p>
          <p className="text-xs text-muted-foreground">
            {rating >= 4
              ? "Avalie o app na Play Store para nos ajudar"
              : "Sua opinião vai nos ajudar a melhorar"}
          </p>
          {rating >= 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (Capacitor.isNativePlatform()) {
                  window.open(PLAY_STORE_URL, "_system");
                } else {
                  window.open(PLAY_STORE_URL, "_blank");
                }
                setShow(false);
              }}
              className="text-xs mt-1"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Avaliar na Play Store
            </Button>
          )}
          <button
            onClick={() => setShow(false)}
            className="block mx-auto text-[10px] text-muted-foreground mt-2 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}


