import { Capacitor } from "@capacitor/core";

/**
 * Analytics Helper — dispara eventos em 3 plataformas:
 * 1. gtag (Google Analytics / Google Ads) — web
 * 2. fbq (Meta Pixel) — web
 * 3. Firebase Analytics nativo — app Android
 *
 * NOTA: Não importa @capacitor-firebase/analytics diretamente
 * para não quebrar o build web no Vercel.
 * O plugin é registrado automaticamente pelo Capacitor no app nativo
 * e acessado via Capacitor.Plugins em runtime.
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// Acessa Firebase Analytics via Capacitor.Plugins (sem import direto)
function getFirebaseAnalytics(): any | null {
  try {
    if (Capacitor.isNativePlatform()) {
      return (Capacitor as any).Plugins?.FirebaseAnalytics ?? null;
    }
  } catch {}
  return null;
}

export async function initAnalytics() {
  const FA = getFirebaseAnalytics();
  if (FA) {
    console.log("[Analytics] Firebase Analytics available via Capacitor.Plugins");
  }
}

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

  // 3. Firebase Analytics nativo (via Capacitor.Plugins, sem import)
  try {
    const FA = getFirebaseAnalytics();
    if (FA) {
      await FA.logEvent({ name: eventName, params });
    }
  } catch {}
}

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
