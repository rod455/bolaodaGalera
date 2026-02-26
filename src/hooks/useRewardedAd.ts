import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ AdMob via Capacitor.Plugins (sem import direto) ═══
const AD_ID = "ca-app-pub-8494311740043165/9218959284";
let adMobInitialized = false;
let adMobFailed = false;

function getAdMob(): any | null {
  try {
    if (Capacitor.isNativePlatform()) {
      return (Capacitor as any).Plugins?.AdMob ?? null;
    }
  } catch {}
  return null;
}

async function initAdMob() {
  if (adMobInitialized || adMobFailed) return;

  const AdMob = getAdMob();
  if (!AdMob) {
    adMobFailed = true;
    return;
  }

  try {
    await AdMob.initialize({ initializeForTesting: false });
    adMobInitialized = true;
    console.log("[AdMob] Initialized successfully");
  } catch (err) {
    console.warn("[AdMob] Initialize failed:", err);
    adMobFailed = true;
  }
}

/**
 * Hook para gerenciar Rewarded Ads
 * - App nativo: Google AdMob Rewarded (vídeo fullscreen ~30s)
 * - Web: sem ads (libera direto)
 * - Premium: sem ads
 * - Palpites: só 1x por dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);

  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();

  // Inicializar AdMob ao montar (só no nativo)
  useEffect(() => {
    if (isNative) {
      initAdMob();
    }
  }, [isNative]);

  const hasWatchedPalpiteAdToday = useCallback(() => {
    try {
      return localStorage.getItem(LAST_PALPITE_AD_KEY) === getToday();
    } catch {
      return false;
    }
  }, []);

  const markPalpiteAdWatched = useCallback(() => {
    try {
      localStorage.setItem(LAST_PALPITE_AD_KEY, getToday());
    } catch {}
  }, []);

  // Mostra AdMob Rewarded fullscreen no app nativo
  const showNativeAdMob = useCallback(
    async (tipo: string): Promise<boolean> => {
      const AdMob = getAdMob();
      if (!AdMob || !adMobInitialized) {
        console.warn("[AdMob] Not available, skipping ad");
        return true;
      }

      try {
        console.log("[AdMob] Preparing rewarded ad...");

        await AdMob.prepareRewardVideoAd({
          adId: AD_ID,
          isTesting: false,
        });

        console.log("[AdMob] Ad prepared, showing fullscreen...");

        return new Promise<boolean>((resolve) => {
          let resolved = false;
          const finish = (success: boolean) => {
            if (resolved) return;
            resolved = true;
            try { AdMob.removeAllListeners(); } catch {}
            if (tipo === "palpite" && success) markPalpiteAdWatched();
            resolve(success);
          };

          // Timeout de segurança (45s)
          const timeout = setTimeout(() => {
            console.warn("[AdMob] Timeout after 45s");
            finish(true);
          }, 45000);

          AdMob.addListener("onRewardedVideoAdDismissed", () => {
            console.log("[AdMob] Ad dismissed — reward granted");
            clearTimeout(timeout);
            finish(true);
          });

          AdMob.addListener("onRewardedVideoAdFailedToShow", (err: any) => {
            console.warn("[AdMob] Failed to show:", err);
            clearTimeout(timeout);
            finish(true);
          });

          AdMob.showRewardVideoAd().catch((err: any) => {
            console.warn("[AdMob] Show error:", err);
            clearTimeout(timeout);
            finish(true);
          });
        });
      } catch (err) {
        console.warn("[AdMob] Error:", err);
        return true;
      }
    },
    [markPalpiteAdWatched]
  );

  const showAd = useCallback(
    async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
      if (isPremium) return true;
      if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

      // Web: sem ads
      if (!isNative) return true;

      // App nativo: AdMob Rewarded fullscreen
      setAdLoading(true);
      const result = await showNativeAdMob(tipo);
      setAdLoading(false);
      return result;
    },
    [isPremium, isNative, hasWatchedPalpiteAdToday, showNativeAdMob]
  );

  return {
    showAd,
    adLoading,
    isPremium,
    needsAd: !isPremium && isNative,
  };
};
