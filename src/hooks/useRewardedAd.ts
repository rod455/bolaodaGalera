import { useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ Seu Ad Unit ID de Rewarded ═══
const AD_ID = "ca-app-pub-9316035916536420/8143495428";

// ═══ Detecção de plataforma nativa ═══
function isRunningInNativeApp(): boolean {
  try { if (Capacitor.isNativePlatform()) return true; } catch {}
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return true;
  } catch {}
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.platform === "android" || cap?.platform === "ios") return true;
  } catch {}
  try { if ((window as any).androidBridge) return true; } catch {}
  try {
    const ua = navigator.userAgent || "";
    if (/wv\)/.test(ua)) return true;
  } catch {}
  return false;
}

// ═══ Acesso ao plugin AdMob via bridge nativo ═══
function getAdMobPlugin(): any | null {
  try {
    const p = (Capacitor as any).Plugins;
    if (p?.AdMob) return p.AdMob;
  } catch {}
  try {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.AdMob) return cap.Plugins.AdMob;
  } catch {}
  return null;
}

// ═══ Nomes dos eventos (strings, sem depender do pacote npm) ═══
const REWARD_EVENTS = {
  Loaded: "onRewardedVideoAdLoaded",
  Rewarded: "onRewardedVideoAdReward",
  Dismissed: "onRewardedVideoAdDismissed",
  FailedToLoad: "onRewardedVideoAdFailedToLoad",
  FailedToShow: "onRewardedVideoAdFailedToShow",
} as const;

// ═══ Estado global de inicialização ═══
let adMobInitialized = false;

/**
 * Inicializa o AdMob SE ainda não foi inicializado.
 * Chamado de forma lazy na hora de mostrar o ad.
 */
async function ensureAdMobReady(): Promise<boolean> {
  if (adMobInitialized) return true;

  const AdMob = getAdMobPlugin();
  if (!AdMob) {
    console.warn("[AdMob] Plugin not found");
    return false;
  }

  try {
    await AdMob.initialize({ initializeForTesting: false });
    adMobInitialized = true;
    console.log("[AdMob] ✅ Initialized");
    return true;
  } catch (err) {
    console.warn("[AdMob] ❌ Init failed:", err);
    return false;
  }
}

/**
 * Hook para gerenciar Rewarded Ads (Google AdMob)
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);

  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = isRunningInNativeApp();

  const hasWatchedPalpiteAdToday = useCallback(() => {
    try { return localStorage.getItem(LAST_PALPITE_AD_KEY) === getToday(); } catch { return false; }
  }, []);

  const markPalpiteAdWatched = useCallback(() => {
    try { localStorage.setItem(LAST_PALPITE_AD_KEY, getToday()); } catch {}
  }, []);

  /**
   * Mostra AdMob Rewarded fullscreen.
   * Inicializa o AdMob na hora se necessário (lazy init).
   */
  const showNativeRewardedAd = useCallback(
    async (tipo: string): Promise<boolean> => {
      // Passo 0: Garantir que o AdMob está inicializado
      const ready = await ensureAdMobReady();
      const AdMob = getAdMobPlugin();

      if (!ready || !AdMob) {
        console.warn("[AdMob] Not ready, skipping ad");
        return true;
      }

      try {
        return new Promise<boolean>(async (resolve) => {
          let resolved = false;
          let userRewarded = false;
          const listeners: any[] = [];

          const cleanup = () => {
            listeners.forEach((l) => {
              try { if (l?.remove) l.remove(); } catch {}
            });
          };

          const finish = (success: boolean) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            if (tipo === "palpite" && success) markPalpiteAdWatched();
            console.log(`[AdMob] Ad finished (rewarded: ${userRewarded})`);
            resolve(success);
          };

          // Timeout de segurança (60s)
          const timeout = setTimeout(() => {
            console.warn("[AdMob] Timeout 60s");
            finish(true);
          }, 60000);

          try {
            // Registrar listeners
            const l1 = await AdMob.addListener(REWARD_EVENTS.Rewarded, (r: any) => {
              console.log("[AdMob] 🎁 Rewarded:", r);
              userRewarded = true;
            });
            listeners.push(l1);

            const l2 = await AdMob.addListener(REWARD_EVENTS.Dismissed, () => {
              console.log("[AdMob] 👋 Dismissed");
              clearTimeout(timeout);
              finish(true);
            });
            listeners.push(l2);

            const l3 = await AdMob.addListener(REWARD_EVENTS.FailedToLoad, (e: any) => {
              console.warn("[AdMob] FailedToLoad:", e);
              clearTimeout(timeout);
              finish(true);
            });
            listeners.push(l3);

            const l4 = await AdMob.addListener(REWARD_EVENTS.FailedToShow, (e: any) => {
              console.warn("[AdMob] FailedToShow:", e);
              clearTimeout(timeout);
              finish(true);
            });
            listeners.push(l4);

            // Preparar e mostrar
            console.log("[AdMob] Preparing...");
            await AdMob.prepareRewardVideoAd({
              adId: AD_ID,
              isTesting: false,
            });

            console.log("[AdMob] Showing...");
            await AdMob.showRewardVideoAd();

          } catch (err: any) {
            console.warn("[AdMob] Error:", err);
            clearTimeout(timeout);
            finish(true);
          }
        });
      } catch (err) {
        console.warn("[AdMob] Unexpected error:", err);
        return true;
      }
    },
    [markPalpiteAdWatched]
  );

  const showAd = useCallback(
    async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
      if (isPremium) return true;
      if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;
      if (!isNative) return true;

      setAdLoading(true);
      try {
        return await showNativeRewardedAd(tipo);
      } finally {
        setAdLoading(false);
      }
    },
    [isPremium, isNative, hasWatchedPalpiteAdToday, showNativeRewardedAd]
  );

  const resolveWebAd = useCallback((_watched: boolean) => {}, []);

  return { showAd, adLoading, isPremium, needsAd: !isPremium && isNative, resolveWebAd };
};
