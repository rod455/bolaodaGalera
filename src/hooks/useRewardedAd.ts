import { useState, useCallback, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle de palpites
const PALPITE_COUNT_KEY = "bolao_palpite_count";
const PALPITE_COUNT_DATE_KEY = "bolao_palpite_count_date";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ Ad Unit IDs ═══
const REWARDED_ID = "ca-app-pub-9316035916536420/8143495428";
const INTERSTITIAL_ID = "ca-app-pub-9316035916536420/1822017661";
const REWARDED_INTERSTITIAL_ID = "ca-app-pub-9316035916536420/4753813043";
const BANNER_ID = "ca-app-pub-9316035916536420/8926482067";


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
let adPreloaded = false;

/**
 * Inicializa o AdMob SE ainda não foi inicializado.
 */
async function ensureAdMobReady(): Promise<boolean> {
  if (adMobInitialized) return true;

  const AdMob = getAdMobPlugin();
  if (!AdMob) return false;

  try {
    await AdMob.initialize({ initializeForTesting: false });
    adMobInitialized = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Pré-carrega o ad para que esteja pronto quando o usuário salvar.
 */
async function preloadAd(): Promise<void> {
  if (adPreloaded) return;

  const AdMob = getAdMobPlugin();
  if (!AdMob) return;

  try {
    await ensureAdMobReady();
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, isTesting: false });
    adPreloaded = true;
  } catch {
    // preload failed silently — will retry on next attempt
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

  // Pré-carregar o ad quando o hook monta (se for nativo + free)
  const preloadDone = useRef(false);
  useEffect(() => {
    if (!isPremium && isNative && !preloadDone.current) {
      preloadDone.current = true;
      preloadAd();
    }
  }, [isPremium, isNative]);

  // Controle de palpites: interstitial a cada 5
  const getPalpiteCount = useCallback((): number => {
    try {
      const date = localStorage.getItem(PALPITE_COUNT_DATE_KEY);
      if (date !== getToday()) return 0; // reset diário
      return parseInt(localStorage.getItem(PALPITE_COUNT_KEY) || "0", 10) || 0;
    } catch { return 0; }
  }, []);

  const incrementPalpiteCount = useCallback(() => {
    try {
      const date = localStorage.getItem(PALPITE_COUNT_DATE_KEY);
      if (date !== getToday()) {
        localStorage.setItem(PALPITE_COUNT_DATE_KEY, getToday());
        localStorage.setItem(PALPITE_COUNT_KEY, "1");
      } else {
        const count = parseInt(localStorage.getItem(PALPITE_COUNT_KEY) || "0", 10) || 0;
        localStorage.setItem(PALPITE_COUNT_KEY, String(count + 1));
      }
    } catch {}
  }, []);

  const shouldShowPalpiteAd = useCallback((): boolean => {
    const count = getPalpiteCount();
    return count === 1 || (count > 1 && count % 5 === 0); // 1º palpite + a cada 5
  }, [getPalpiteCount]);

  /**
   * Mostra AdMob Rewarded fullscreen.
   * Inicializa o AdMob na hora se necessário (lazy init).
   */
  const showNativeRewardedAd = useCallback(
    async (tipo: string): Promise<boolean> => {
      const ready = await ensureAdMobReady();
      const AdMob = getAdMobPlugin();

      if (!ready || !AdMob) return true;

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

          const finish = (fromDismiss: boolean) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            // Só conta como sucesso se o usuário assistiu o ad completo (reward recebido)
            // ou se houve falha no carregamento/exibição (não bloquear o usuário)
            const success = fromDismiss ? userRewarded : true;
            // Marcar para re-preload na próxima vez
            adPreloaded = false;
            // Pré-carregar o próximo ad em background
            setTimeout(() => preloadAd(), 2000);
            resolve(success);
          };

          // Timeout de segurança (60s) — permite prosseguir
          const timeout = setTimeout(() => {
            finish(false);
          }, 60000);

          try {
            // Registrar listeners
            const l1 = await AdMob.addListener(REWARD_EVENTS.Rewarded, () => {
              userRewarded = true;
            });
            listeners.push(l1);

            const l2 = await AdMob.addListener(REWARD_EVENTS.Dismissed, () => {
              clearTimeout(timeout);
              finish(true); // fromDismiss=true: checa userRewarded
            });
            listeners.push(l2);

            const l3 = await AdMob.addListener(REWARD_EVENTS.FailedToLoad, () => {
              clearTimeout(timeout);
              finish(false); // falha: não bloquear o usuário
            });
            listeners.push(l3);

            const l4 = await AdMob.addListener(REWARD_EVENTS.FailedToShow, () => {
              clearTimeout(timeout);
              finish(false); // falha: não bloquear o usuário
            });
            listeners.push(l4);

            // Se não foi preloaded, preparar agora
            if (!adPreloaded) {
              await AdMob.prepareRewardVideoAd({
                adId: REWARDED_ID,
                isTesting: false,
              });
            }

            adPreloaded = false;
            await AdMob.showRewardVideoAd();

          } catch {
            clearTimeout(timeout);
            finish(false); // falha: não bloquear o usuário
          }
        });
      } catch {
        return true;
      }
    },
    []
  );

  /**
   * Mostra AdMob Interstitial (para entrar em bolão).
   * Sempre retorna true para não bloquear o fluxo.
   */
  const showNativeInterstitialAd = useCallback(
    async (): Promise<boolean> => {
      const ready = await ensureAdMobReady();
      const AdMob = getAdMobPlugin();
      if (!ready || !AdMob) return true;

      try {
        return new Promise<boolean>(async (resolve) => {
          let resolved = false;
          const listeners: any[] = [];

          const cleanup = () => {
            listeners.forEach((l) => {
              try { if (l?.remove) l.remove(); } catch {}
            });
          };

          const finish = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(true);
          };

          // Timeout de segurança (30s)
          const timeout = setTimeout(finish, 30000);

          try {
            const l1 = await AdMob.addListener("onInterstitialAdDismissed", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l1);

            const l2 = await AdMob.addListener("onInterstitialAdFailedToLoad", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l2);

            const l3 = await AdMob.addListener("onInterstitialAdFailedToShow", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l3);

            await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: false });
            await AdMob.showInterstitial();
          } catch {
            clearTimeout(timeout);
            finish();
          }
        });
      } catch {
        return true;
      }
    },
    []
  );

  /**
   * Mostra AdMob Rewarded Interstitial (mais curto, com X para fechar).
   */
  const showNativeRewardedInterstitialAd = useCallback(
    async (): Promise<boolean> => {
      const ready = await ensureAdMobReady();
      const AdMob = getAdMobPlugin();
      if (!ready || !AdMob) return true;

      try {
        return new Promise<boolean>(async (resolve) => {
          let resolved = false;
          const listeners: any[] = [];

          const cleanup = () => {
            listeners.forEach((l) => {
              try { if (l?.remove) l.remove(); } catch {}
            });
          };

          const finish = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(true);
          };

          const timeout = setTimeout(finish, 30000);

          try {
            const l1 = await AdMob.addListener("onRewardedInterstitialAdDismissed", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l1);

            const l2 = await AdMob.addListener("onRewardedInterstitialAdFailedToLoad", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l2);

            const l3 = await AdMob.addListener("onRewardedInterstitialAdFailedToShow", () => {
              clearTimeout(timeout);
              finish();
            });
            listeners.push(l3);

            await AdMob.prepareRewardInterstitialAd({ adId: REWARDED_INTERSTITIAL_ID, isTesting: false });
            await AdMob.showRewardInterstitialAd();
          } catch {
            clearTimeout(timeout);
            finish();
          }
        });
      } catch {
        return true;
      }
    },
    []
  );

  const showAd = useCallback(
    async (tipo: "criar" | "palpite" | "entrar" | "quiz"): Promise<boolean> => {
      if (isPremium) return true;
      if (!isNative) return true;

      // Palpite: rewarded interstitial no 1º + a cada 5
      if (tipo === "palpite") {
        incrementPalpiteCount();
        if (!shouldShowPalpiteAd()) return true;
        setAdLoading(true);
        try {
          return await showNativeRewardedInterstitialAd();
        } finally {
          setAdLoading(false);
        }
      }

      // Entrar em bolão: interstitial
      if (tipo === "entrar") {
        setAdLoading(true);
        try {
          return await showNativeInterstitialAd();
        } finally {
          setAdLoading(false);
        }
      }

      // Criar grupo, quiz: rewarded
      setAdLoading(true);
      try {
        return await showNativeRewardedAd(tipo);
      } finally {
        setAdLoading(false);
      }
    },
    [isPremium, isNative, incrementPalpiteCount, shouldShowPalpiteAd, showNativeRewardedAd, showNativeInterstitialAd, showNativeRewardedInterstitialAd]
  );

  return { showAd, adLoading, isPremium, needsAd: !isPremium && isNative };
};

// ═══ App Open Ad — chamar no App.tsx ao iniciar ═══
export async function showAppOpenAd(isPremium?: boolean): Promise<void> {
  if (!isRunningInNativeApp()) return;
  if (isPremium) return;

  const AdMob = getAdMobPlugin();
  if (!AdMob) return;

  try {
    await ensureAdMobReady();
    await AdMob.prepareRewardInterstitialAd({ adId: REWARDED_INTERSTITIAL_ID, isTesting: false });
    await AdMob.showRewardInterstitialAd();
  } catch {
    // Ad failed — continue normally
  }
}


