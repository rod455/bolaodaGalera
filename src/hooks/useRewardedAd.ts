import { useState, useCallback, useRef } from "react";
import { useUserPlan } from "./useUserPlan";
import { toast } from "sonner";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";

const getToday = () => new Date().toISOString().split("T")[0]; // "2026-02-14"

/**
 * Hook para gerenciar Rewarded Ads
 * - Usuários premium/premium_pro não veem ads
 * - Palpites: só mostra ad no primeiro do dia
 * - Criar bolão e Entrar: sempre mostra ad para free
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);
  const resolveRef = useRef<((watched: boolean) => void) | null>(null);

  const isPremium = plano === "premium" || plano === "premium_pro";

  // Verifica se já assistiu ad de palpite hoje
  const hasWatchedPalpiteAdToday = useCallback(() => {
    try {
      const last = localStorage.getItem(LAST_PALPITE_AD_KEY);
      return last === getToday();
    } catch { return false; }
  }, []);

  // Marca que assistiu ad de palpite hoje
  const markPalpiteAdWatched = useCallback(() => {
    try { localStorage.setItem(LAST_PALPITE_AD_KEY, getToday()); } catch {}
  }, []);

  // Mostra o ad e retorna promise que resolve quando terminar
  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    // Premium não vê ads
    if (isPremium) return true;

    // Palpite: só no primeiro do dia
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    setAdLoading(true);

    try {
      // Verificar se está rodando no Capacitor (app nativo)
      const isNative = typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.isNativePlatform?.();

      if (isNative) {
        // ═══ AMBIENTE NATIVO (Android/iOS) ═══
        try {
          const admobModule = await import("@capacitor-community/admob");
          const AdMob = admobModule.AdMob;

          const options = {
            adId: "ca-app-pub-3940256099942544/5224354917", // Test Rewarded Ad
          };

          await AdMob.prepareRewardVideoAd(options);

          return new Promise<boolean>((resolve) => {
            AdMob.addListener("onRewardedVideoAdDismissed", () => {
              if (tipo === "palpite") markPalpiteAdWatched();
              setAdLoading(false);
              resolve(true);
            });

            AdMob.addListener("onRewardedVideoAdFailedToLoad", () => {
              setAdLoading(false);
              resolve(true);
            });

            AdMob.showRewardVideoAd();
          });
        } catch {
          // AdMob não disponível no nativo, usar fallback web
          setAdLoading(false);
          return true;
        }
      } else {
        // ═══ AMBIENTE WEB (fallback com modal) ═══
        return new Promise<boolean>((resolve) => {
          resolveRef.current = (watched: boolean) => {
            if (watched && tipo === "palpite") markPalpiteAdWatched();
            setAdLoading(false);
            resolve(watched);
          };
        });
      }
    } catch (err) {
      console.error("Erro ao mostrar ad:", err);
      setAdLoading(false);
      return true;
    }
  }, [isPremium, hasWatchedPalpiteAdToday, markPalpiteAdWatched]);

  // Função para resolver o ad modal web
  const resolveWebAd = useCallback((watched: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(watched);
      resolveRef.current = null;
    }
  }, []);

  return {
    showAd,
    adLoading,
    isPremium,
    resolveWebAd,
    needsAd: !isPremium,
  };
};
