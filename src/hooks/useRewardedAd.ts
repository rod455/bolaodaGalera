import { useState, useCallback, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ AdMob Manager (singleton) ═══
let adMobInstance: any = null;
let adMobInitialized = false;
let adMobFailed = false;

async function getAdMob() {
  if (adMobFailed) return null;
  if (adMobInstance) return adMobInstance;

  try {
    const mod = await import("@capacitor-community/admob");
    adMobInstance = mod.AdMob;
    return adMobInstance;
  } catch (err) {
    console.warn("[AdMob] Import failed (expected on web):", err);
    adMobFailed = true;
    return null;
  }
}

async function initAdMob() {
  if (adMobInitialized || adMobFailed) return;

  const AdMob = await getAdMob();
  if (!AdMob) return;

  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    adMobInitialized = true;
    console.log("[AdMob] Initialized successfully");
  } catch (err) {
    console.warn("[AdMob] Initialize failed:", err);
    adMobFailed = true;
  }
}

/**
 * Hook para gerenciar Rewarded Ads
 * - App nativo: tenta Google AdMob real → fallback para countdown
 * - Web: mostra AdRewardModal (countdown)
 * - Premium: sem ads
 * - Palpites: só 1x por dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);
  const resolveRef = useRef<((watched: boolean) => void) | null>(null);

  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();

  // Inicializar AdMob ao montar (só no nativo)
  useEffect(() => {
    if (isNative) {
      initAdMob();
    }
  }, [isNative]);

  const hasWatchedPalpiteAdToday = useCallback(() => {
    try { return localStorage.getItem(LAST_PALPITE_AD_KEY) === getToday(); }
    catch { return false; }
  }, []);

  const markPalpiteAdWatched = useCallback(() => {
    try { localStorage.setItem(LAST_PALPITE_AD_KEY, getToday()); } catch {}
  }, []);

  // Tenta mostrar AdMob real no app nativo
  const showNativeAdMob = useCallback(async (tipo: string): Promise<boolean | null> => {
    const AdMob = await getAdMob();
    if (!AdMob || !adMobInitialized) return null;

    try {
      console.log("[AdMob] Preparing rewarded ad...");

      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-8494311740043165/9218959284",
        isTesting: false,
      });

      console.log("[AdMob] Ad prepared, showing...");

      return new Promise<boolean>((resolve) => {
        let resolved = false;
        const finish = (success: boolean) => {
          if (resolved) return;
          resolved = true;
          if (tipo === "palpite" && success) markPalpiteAdWatched();
          resolve(success);
        };

        const timeout = setTimeout(() => {
          console.warn("[AdMob] Timeout");
          finish(true);
        }, 30000);

        AdMob.addListener("onRewardedVideoAdDismissed", () => {
          console.log("[AdMob] Ad dismissed");
          clearTimeout(timeout);
          finish(true);
        });

        AdMob.addListener("onRewardedVideoAdFailedToShow", () => {
          console.warn("[AdMob] Failed to show");
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
      return null; // Fallback para countdown
    }
  }, [markPalpiteAdWatched]);

  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    if (isPremium) return true;
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    // App nativo: tentar AdMob real
    if (isNative) {
      setAdLoading(true);
      const result = await showNativeAdMob(tipo);
      setAdLoading(false);

      if (result !== null) return result;
      // null = AdMob não disponível → cair no countdown abaixo
      console.log("[AdMob] Fallback to countdown");
    }

    // Web OU fallback: countdown modal (AdRewardModal)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = (watched: boolean) => {
        if (tipo === "palpite" && watched) markPalpiteAdWatched();
        resolve(watched);
      };
    });
  }, [isPremium, isNative, hasWatchedPalpiteAdToday, markPalpiteAdWatched, showNativeAdMob]);

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
