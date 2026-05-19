import { useState, useEffect } from "react";
import { Loader2, Play, Gift, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AdRewardModalProps {
  open: boolean;
  onComplete: (watched: boolean) => void;
  message?: string;
}

const AD_DURATION = 5;

/**
 * Modal de Ad Reward — countdown de 5 segundos
 * Fallback para quando AdMob não está disponível
 */
const AdRewardModal = ({ open, onComplete, message }: AdRewardModalProps) => {
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!open) { setCountdown(AD_DURATION); setWatching(false); return; }
  }, [open]);

  useEffect(() => {
    if (!watching || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [watching, countdown]);

  useEffect(() => {
    if (watching && countdown === 0) {
      const timer = setTimeout(() => onComplete(true), 500);
      return () => clearTimeout(timer);
    }
  }, [watching, countdown, onComplete]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm mx-auto rounded-2xl text-center p-4 sm:p-5 [&>button]:hidden">
        {!watching ? (
          <div className="space-y-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-copa-gold-100 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-copa-gold-500" />
            </div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">
              {message || "Aguarde um momento para continuar"}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Usuários Premium não veem anúncios.
            </p>
            <Button onClick={() => setWatching(true)}
              className="w-full h-10 sm:h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl text-sm">
              <Play className="w-4 h-4 mr-1.5" /> Continuar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full h-24 sm:h-28 bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 text-copa-green-500 animate-spin mx-auto mb-1.5" />
                <p className="text-[11px] sm:text-xs text-muted-foreground">Carregando...</p>
              </div>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
              <div className="bg-copa-green-500 rounded-full h-1.5 sm:h-2 transition-all duration-1000"
                style={{ width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%` }} />
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {countdown > 0 ? `Fechando em ${countdown}s...` : "Obrigado! Continuando..."}
            </p>
            <button
              onClick={() => onComplete(true)}
              className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-copa-gold-600 font-medium mx-auto hover:underline"
            >
              <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Assine Premium e remova anúncios
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdRewardModal;


