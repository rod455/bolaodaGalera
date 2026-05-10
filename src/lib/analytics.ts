import { Capacitor } from "@capacitor/core";

/**
 * Analytics Helper — dispara eventos em 3 plataformas:
 * 1. gtag (Google Analytics / Google Ads) — web
 * 2. fbq (Meta Pixel) — web
 * 3. Firebase Analytics nativo — app Android (via Capacitor.Plugins)
 *
 * NOTA: Não importa @capacitor-firebase/analytics diretamente
 * para não quebrar o build web no Vercel.
 * O plugin é acessado via Capacitor.Plugins em runtime.
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// ═══ Detecção robusta de plataforma nativa ═══
function isNativeApp(): boolean {
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
  return false;
}

// ═══ Acessa Firebase Analytics via Capacitor.Plugins (sem import direto) ═══
function getFirebaseAnalytics(): any | null {
  try {
    const plugins = (Capacitor as any).Plugins;
    if (plugins?.FirebaseAnalytics) return plugins.FirebaseAnalytics;
  } catch {}
  try {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.FirebaseAnalytics) return cap.Plugins.FirebaseAnalytics;
  } catch {}
  return null;
}

/**
 * Inicializa Analytics.
 * No app nativo: habilita coleta do Firebase Analytics.
 */
export async function initAnalytics() {
  if (!isNativeApp()) return;

  const FA = getFirebaseAnalytics();
  if (FA) {
    try {
      await FA.setEnabled({ enabled: true });
      await FA.setCollectionEnabled({ enabled: true });
    } catch {
      // Firebase init failed silently
    }
  }
}

/**
 * Dispara evento customizado em todas as plataformas.
 */
export async function trackEvent(
  eventName: string,
  params: Record<string, any> = {}
) {
  // 1. Google Analytics / Google Ads (gtag)
  try {
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag("event", eventName, params);
    }
  } catch {}

  // 2. Meta Pixel (fbq)
  try {
    if (typeof window !== "undefined" && typeof window.fbq !== "undefined") {
      window.fbq("trackCustom", eventName, params);
    }
  } catch {}

  // 3. Firebase Analytics nativo
  try {
    const FA = getFirebaseAnalytics();
    if (FA) {
      await FA.logEvent({ name: eventName, params });
    }
  } catch {}
}

/**
 * Define o User ID em todas as plataformas.
 */
export async function setAnalyticsUser(userId: string) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag("set", { user_id: userId });
    }
  } catch {}

  try {
    const FA = getFirebaseAnalytics();
    if (FA) {
      await FA.setUserId({ userId });
    }
  } catch {}
}

/**
 * Define propriedades do usuário no Firebase Analytics.
 * Útil para segmentação (plano, nível, etc).
 */
export async function setUserProperty(key: string, value: string) {
  try {
    const FA = getFirebaseAnalytics();
    if (FA) {
      await FA.setUserProperty({ key, value });
    }
  } catch {}

  try {
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag("set", "user_properties", { [key]: value });
    }
  } catch {}
}

/**
 * Registra a tela atual no Firebase Analytics.
 */
export async function trackScreenView(screenName: string) {
  try {
    const FA = getFirebaseAnalytics();
    if (FA) {
      await FA.setCurrentScreen({ screenName });
    }
  } catch {}

  try {
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag("event", "screen_view", { screen_name: screenName });
    }
  } catch {}
}

/**
 * Rastreia conversão do Google Ads.
 */
export function trackConversion(sendTo: string) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag !== "undefined") {
      window.gtag("event", "conversion", {
        send_to: sendTo,
        value: 0.5,
        currency: "BRL",
      });
    }
  } catch {}
}

