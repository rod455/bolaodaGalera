import { useState, useCallback, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "./useUserPlan";

// ═══ Import direto do plugin AdMob (API oficial) ═══
import {
  AdMob,
  RewardAdOptions,
  RewardAdPluginEvents,
  AdMobRewardItem,
} from "@capacitor-community/admob";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// ═══ Seu Ad Unit ID de Rewarded ═══
const AD_ID = "ca-app-pub-8494311740043165/9218959284";

let adMobInitialized = false;
let adMobInitializing = false;

/**
 * Hook para gerenciar Rewarded Ads com @capacitor-community/admob
 *
 * Fluxo no app nativo:
 * 1. Inicializa AdMob ao montar
 * 2. showAd() → prepareRewardVideoAd + showRewardVideoAd (fullscreen ~30s)
 * 3. Espera evento Rewarded (assistiu) + Dismissed (fechou)
 * 4. Retorna true para liberar a ação
 *
 * - Web: sem ads (libera direto)
 * - Premium: sem ads
 * - Palpites: só 1 ad por dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);

  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();

  // Inicializar AdMob ao montar (só no nativo, uma vez)
  useEffect(() => {
    if (!isNative || adMobInitialized || adMobInitializing) return;

    const init = async () => {
      adMobInitializing = true;
      try {
        await AdMob.initialize({
          initializeForTesting: false,
        });
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

  // Cleanup listeners ao desmontar
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((l) => {
        try { l.remove(); } catch {}
      });
      listenersRef.current = [];
    };
  }, []);

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
   * Usa a API oficial: prepareRewardVideoAd → showRewardVideoAd
   * Escuta eventos via RewardAdPluginEvents (enums corretos)
   */
  const showNativeRewardedAd = useCallback(
    async (tipo: string): Promise<boolean> => {
      if (!adMobInitialized) {
        console.warn("[AdMob] Not initialized, skipping ad");
        return true;
      }

      try {
        // Limpa listeners anteriores
        listenersRef.current.forEach((l) => {
          try { l.remove(); } catch {}
        });
        listenersRef.current = [];

        console.log("[AdMob] 🔄 Preparing rewarded ad...");

        return new Promise<boolean>(async (resolve) => {
          let resolved = false;
          let userRewarded = false;

          const finish = (success: boolean) => {
            if (resolved) return;
            resolved = true;
            // Limpa listeners
            listenersRef.current.forEach((l) => {
              try { l.remove(); } catch {}
            });
            listenersRef.current = [];
            if (tipo === "palpite" && success) markPalpiteAdWatched();
            console.log(`[AdMob] ${success ? "✅" : "❌"} Ad finished (rewarded: ${userRewarded})`);
            resolve(success);
          };

          // Timeout de segurança (60s)
          const timeout = setTimeout(() => {
            console.warn("[AdMob] ⏰ Timeout 60s — granting reward");
            finish(true);
          }, 60000);

          // ═══ Evento: Usuário ganhou a recompensa (assistiu o vídeo) ═══
          const rewardedListener = await AdMob.addListener(
            RewardAdPluginEvents.Rewarded,
            (reward: AdMobRewardItem) => {
              console.log("[AdMob] 🎁 User rewarded:", reward);
              userRewarded = true;
              // NÃO resolve aqui — espera Dismissed (usuário fechar o ad)
            }
          );
          listenersRef.current.push(rewardedListener);

          // ═══ Evento: Anúncio fechado pelo usuário ═══
          const dismissedListener = await AdMob.addListener(
            RewardAdPluginEvents.Dismissed,
            () => {
              console.log("[AdMob] 👋 Ad dismissed");
              clearTimeout(timeout);
              finish(true);
            }
          );
          listenersRef.current.push(dismissedListener);

          // ═══ Evento: Falha ao carregar ═══
          const failedToLoadListener = await AdMob.addListener(
            RewardAdPluginEvents.FailedToLoad,
            (error: any) => {
              console.warn("[AdMob] ❌ Failed to load:", error);
              clearTimeout(timeout);
              finish(true); // Libera ação mesmo sem ad
            }
          );
          listenersRef.current.push(failedToLoadListener);

          // ═══ Evento: Falha ao exibir ═══
          const failedToShowListener = await AdMob.addListener(
            RewardAdPluginEvents.FailedToShow,
            (error: any) => {
              console.warn("[AdMob] ❌ Failed to show:", error);
              clearTimeout(timeout);
              finish(true);
            }
          );
          listenersRef.current.push(failedToShowListener);

          try {
            // Passo 1: Preparar (carrega o vídeo rewarded)
            const options: RewardAdOptions = {
              adId: AD_ID,
              isTesting: false,
            };
            await AdMob.prepareRewardVideoAd(options);
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
      if (!isNative) return true; // Web: sem ads

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
   * No fluxo nativo o ad é fullscreen e não precisa de modal web.
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
