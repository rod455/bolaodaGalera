import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ Seu Ad Unit ID de Rewarded ═══
const AD_ID = "ca-app-pub-8494311740043165/9218959284";

let adMobInitialized = false;
let adMobInitializing = false;

// ═══════════════════════════════════════════════════════════
// Detecção robusta de plataforma nativa
// Quando se usa server.url remoto, Capacitor.isNativePlatform()
// pode retornar false. Usamos o user agent como fallback.
// ═══════════════════════════════════════════════════════════
function isRunningInNativeApp(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}
  // Fallback: detectar se está em WebView Android do Capacitor
  const ua = navigator.userAgent || "";
  return /wv\)/.test(ua) || /; wv\)/.test(ua);
}

// ═══════════════════════════════════════════════════════════
// Acesso ao plugin AdMob via Capacitor bridge
// Com server.url remoto, o import direto pode não funcionar.
// O bridge nativo injeta os plugins em window.Capacitor.Plugins.
// ═══════════════════════════════════════════════════════════
function getAdMobPlugin(): any | null {
  try {
    // Tenta via Capacitor.Plugins (bridge nativo)
    const plugins = (Capacitor as any).Plugins;
    if (plugins?.AdMob) return plugins.AdMob;
  } catch {}
  try {
    // Tenta via window.Capacitor (fallback)
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.AdMob) return cap.Plugins.AdMob;
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════
// Nomes dos eventos do RewardAdPluginEvents
// Definidos manualmente para não depender do import do pacote
// (que pode falhar com server.url remoto)
// ═══════════════════════════════════════════════════════════
const REWARD_EVENTS = {
  Loaded: "onRewardedVideoAdLoaded",
  Rewarded: "onRewardedVideoAdReward",
  Dismissed: "onRewardedVideoAdDismissed",
  FailedToLoad: "onRewardedVideoAdFailedToLoad",
  FailedToShow: "onRewardedVideoAdFailedToShow",
  Showed: "onRewardedVideoAdShowed",
} as const;

/**
 * Hook para gerenciar Rewarded Ads (Google AdMob)
 *
 * Funciona com server.url remoto (Vercel) porque:
 * 1. Detecta plataforma nativa via user-agent (fallback)
 * 2. Acessa AdMob via Capacitor.Plugins bridge (não import direto)
 * 3. Usa nomes de eventos como strings (não depende do pacote npm)
 *
 * Fluxo:
 * - Premium: sem ads
 * - Web (browser real): sem ads
 * - App nativo: prepareRewardVideoAd → showRewardVideoAd (fullscreen ~30s)
 * - Palpites: só 1 ad por dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);

  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = isRunningInNativeApp();

  // Inicializar AdMob ao montar (só no nativo, uma vez)
  useEffect(() => {
    if (!isNative || adMobInitialized || adMobInitializing) return;

    const init = async () => {
      adMobInitializing = true;
      const AdMob = getAdMobPlugin();

      if (!AdMob) {
        console.warn("[AdMob] ❌ Plugin not found in bridge");
        adMobInitializing = false;
        return;
      }

      try {
        await AdMob.initialize({ initializeForTesting: false });
        adMobInitialized = true;
        console.log("[AdMob] ✅ Initialized successfully");
      } catch (err) {
        console.warn("[AdMob] ❌ Initialize failed:", err);
      } finally {
        adMobInitializing = false;
      }
    };

    init();
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

  /**
   * Mostra AdMob Rewarded fullscreen no app nativo.
   * Acessa o plugin via bridge nativo (Capacitor.Plugins.AdMob).
   */
  const showNativeRewardedAd = useCallback(
    async (tipo: string): Promise<boolean> => {
      const AdMob = getAdMobPlugin();

      if (!AdMob || !adMobInitialized) {
        console.warn("[AdMob] Not available or not initialized, skipping");
        return true;
      }

      try {
        console.log("[AdMob] 🔄 Preparing rewarded ad...");

        return new Promise<boolean>(async (resolve) => {
          let resolved = false;
          let userRewarded = false;
          const listeners: any[] = [];

          const cleanup = () => {
            listeners.forEach((l) => {
              try {
                if (l && typeof l.remove === "function") l.remove();
              } catch {}
            });
          };

          const finish = (success: boolean) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            if (tipo === "palpite" && success) markPalpiteAdWatched();
            console.log(`[AdMob] ${success ? "✅" : "❌"} Ad finished (rewarded: ${userRewarded})`);
            resolve(success);
          };

          // Timeout de segurança (60s)
          const timeout = setTimeout(() => {
            console.warn("[AdMob] ⏰ Timeout 60s — granting reward");
            finish(true);
          }, 60000);

          try {
            // ═══ Registrar listeners ANTES de preparar o ad ═══

            // Evento: Usuário assistiu e ganhou recompensa
            const l1 = await AdMob.addListener(
              REWARD_EVENTS.Rewarded,
              (reward: any) => {
                console.log("[AdMob] 🎁 User rewarded:", reward);
                userRewarded = true;
                // NÃO resolve aqui — espera o Dismissed
              }
            );
            listeners.push(l1);

            // Evento: Anúncio fechado pelo usuário
            const l2 = await AdMob.addListener(
              REWARD_EVENTS.Dismissed,
              () => {
                console.log("[AdMob] 👋 Ad dismissed by user");
                clearTimeout(timeout);
                finish(true);
              }
            );
            listeners.push(l2);

            // Evento: Falha ao carregar
            const l3 = await AdMob.addListener(
              REWARD_EVENTS.FailedToLoad,
              (error: any) => {
                console.warn("[AdMob] ❌ Failed to load:", error);
                clearTimeout(timeout);
                finish(true);
              }
            );
            listeners.push(l3);

            // Evento: Falha ao exibir
            const l4 = await AdMob.addListener(
              REWARD_EVENTS.FailedToShow,
              (error: any) => {
                console.warn("[AdMob] ❌ Failed to show:", error);
                clearTimeout(timeout);
                finish(true);
              }
            );
            listeners.push(l4);

            // Passo 1: Preparar (carrega o vídeo rewarded)
            await AdMob.prepareRewardVideoAd({
              adId: AD_ID,
              isTesting: false,
            });
            console.log("[AdMob] ✅ Ad prepared, showing fullscreen...");

            // Passo 2: Mostrar (exibe fullscreen — vídeo ~30s)
            await AdMob.showRewardVideoAd();
            console.log("[AdMob] 📺 Ad is now showing");

          } catch (err) {
            console.warn("[AdMob] ❌ Error prepare/show:", err);
            clearTimeout(timeout);
            finish(true);
          }
        });

      } catch (err) {
        console.warn("[AdMob] ❌ Unexpected error:", err);
        return true;
      }
    },
    [markPalpiteAdWatched]
  );

  /**
   * Função principal: decide se precisa mostrar ad e mostra
   */
  const showAd = useCallback(
    async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
      if (isPremium) return true;
      if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;
      if (!isNative) return true; // Web real: sem ads

      setAdLoading(true);
      try {
        return await showNativeRewardedAd(tipo);
      } finally {
        setAdLoading(false);
      }
    },
    [isPremium, isNative, hasWatchedPalpiteAdToday, showNativeRewardedAd]
  );

  /**
   * Placeholder para compatibilidade com AdRewardModal nas páginas.
   * O ad nativo é fullscreen, não precisa de modal web.
   */
  const resolveWebAd = useCallback((_watched: boolean) => {
    console.log("[AdMob] resolveWebAd called (no-op)");
  }, []);

  return {
    showAd,
    adLoading,
    isPremium,
    needsAd: !isPremium && isNative,
    resolveWebAd,
  };
};
