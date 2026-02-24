import { useState, useCallback, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// Registrar o plugin AdMob via Capacitor bridge (funciona mesmo com server.url remoto)
// O registerPlugin se comunica com o Java nativo, não precisa do pacote JS
let AdMob: any = null;
try {
  if (Capacitor.isNativePlatform()) {
    AdMob = registerPlugin("AdMob");
  }
} catch (e) {
  console.warn("[AdMob] Failed to register plugin:", e);
}

/**
 * Hook para gerenciar Rewarded Ads
 * - Nativo (Capacitor): usa Google AdMob via registerPlugin
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
    if (!AdMob) {
      console.warn("[AdMob] Plugin not available");
      return true;
    }

    try {
      console.log("[AdMob] Preparing rewarded ad...");

      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-8494311740043165/9218959284",
      });

      console.log("[AdMob] Ad prepared, showing...");

      return new Promise<boolean>((resolve) => {
        let resolved = false;
        const finish = (success: boolean) => {
          if (resolved) return;
          resolved = true;
          if (tipo === "palpite" && success) markPalpiteAdWatched();
          setAdLoading(false);
          resolve(true);
        };

        // Timeout de segurança: se nada acontecer em 15s, libera
        const timeout = setTimeout(() => {
          console.warn("[AdMob] Timeout - releasing user");
          finish(false);
        }, 15000);

        try {
          AdMob.addListener("onRewardedVideoAdDismissed", () => {
            console.log("[AdMob] Ad dismissed");
            clearTimeout(timeout);
            finish(true);
          });

          AdMob.addListener("onRewardedVideoAdFailedToLoad", () => {
            console.warn("[AdMob] Ad failed to load");
            clearTimeout(timeout);
            finish(false);
          });

          AdMob.addListener("onRewardedVideoAdFailedToShow", () => {
            console.warn("[AdMob] Ad failed to show");
            clearTimeout(timeout);
            finish(false);
          });
        } catch (listenerErr) {
          console.warn("[AdMob] Listener error:", listenerErr);
        }

        AdMob.showRewardVideoAd().catch((showErr: any) => {
          console.warn("[AdMob] Show error:", showErr);
          clearTimeout(timeout);
          finish(false);
        });
      });
    } catch (err) {
      console.warn("[AdMob] Error:", err);
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

    console.log(`[AdMob] showAd called: tipo=${tipo}`);
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
