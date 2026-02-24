import { useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

/**
 * Hook para gerenciar Rewarded Ads
 * - Nativo (Capacitor): usa Google AdMob via @capacitor-community/admob
 * - Web: sem ads (retorna true direto)
 * - Premium: nunca vê ads
 * - Palpites: só mostra ad no primeiro do dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);
  const resolveRef = useRef<((watched: boolean) => void) | null>(null);

  const isPremium = plano === "premium" || plano === "premium_pro";

  const hasWatchedPalpiteAdToday = useCallback(() => {
    try { return localStorage.getItem(LAST_PALPITE_AD_KEY) === getToday(); }
    catch { return false; }
  }, []);

  const markPalpiteAdWatched = useCallback(() => {
    try { localStorage.setItem(LAST_PALPITE_AD_KEY, getToday()); } catch {}
  }, []);

  const showNativeAd = useCallback(async (tipo: string): Promise<boolean> => {
    try {
      // Import dinâmico do AdMob — funciona tanto no build local quanto remoto
      // porque @capacitor-community/admob está no package.json
      const { AdMob } = await import("@capacitor-community/admob");

      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-8494311740043165/9218959284", // Reward Bolão - Produção
      });

      return new Promise<boolean>((resolve) => {
        const onDismiss = AdMob.addListener("onRewardedVideoAdDismissed", () => {
          if (tipo === "palpite") markPalpiteAdWatched();
          setAdLoading(false);
          onDismiss.remove();
          onFail.remove();
          resolve(true);
        });
        const onFail = AdMob.addListener("onRewardedVideoAdFailedToLoad", () => {
          setAdLoading(false);
          onDismiss.remove();
          onFail.remove();
          resolve(true); // Deixa continuar se falhar
        });
        AdMob.showRewardVideoAd();
      });
    } catch (err) {
      console.warn("AdMob error:", err);
      setAdLoading(false);
      return true; // Fallback: deixa continuar
    }
  }, [markPalpiteAdWatched]);

  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    // Premium: sem ads
    if (isPremium) return true;

    // Web (navegador): sem ads
    if (!Capacitor.isNativePlatform()) return true;

    // Palpite: só mostra ad no primeiro do dia
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    setAdLoading(true);
    return showNativeAd(tipo);
  }, [isPremium, hasWatchedPalpiteAdToday, showNativeAd]);

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
