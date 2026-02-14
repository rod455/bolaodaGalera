import { useState, useEffect } from "react";
import { Loader2, Play, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AdRewardModalProps {
  open: boolean;
  onComplete: (watched: boolean) => void;
  message?: string;
}

/**
 * Modal de Ad Reward
 * - No web: mostra um countdown de 5 segundos simulando um ad
 * - No nativo: o AdMob real é gerenciado pelo hook, este modal é fallback
 */
const AdRewardModal = ({ open, onComplete, message }: AdRewardModalProps) => {
  const [countdown, setCountdown] = useState(30);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!open) { setCountdown(30); setWatching(false); return; }
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
      <DialogContent className="max-w-sm rounded-2xl text-center [&>button]:hidden">
        {!watching ? (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-copa-gold-100 rounded-full flex items-center justify-center mx-auto">
              <Gift className="w-8 h-8 text-copa-gold-500" />
            </div>
            <h3 className="text-lg font-bold">
              {message || "Assista um breve vídeo para continuar"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Usuários Premium não veem anúncios.
            </p>
            <Button onClick={() => setWatching(true)}
              className="w-full h-12 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl">
              <Play className="w-5 h-5 mr-2" /> Assistir
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-copa-green-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Carregando anúncio...</p>
              </div>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div className="absolute top-0 left-0 bg-copa-green-500 rounded-full h-2 transition-all duration-1000"
                style={{ width: `${((30 - countdown) / 30) * 100}%` }} />
            </div>
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">Fechando em {countdown}s...</p>
            ) : (
              <p className="text-sm text-copa-green-600 font-medium">Obrigado! Continuando...</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdRewardModal;
