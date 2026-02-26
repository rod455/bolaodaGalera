import { Capacitor } from "@capacitor/core";

/**
 * Analytics Helper — dispara eventos em 3 plataformas:
 * 1. gtag (Google Analytics / Google Ads) — web
 * 2. fbq (Meta Pixel) — web
 * 3. Firebase Analytics nativo — app Android
 */

// Tipos globais
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// Firebase Analytics (lazy loaded, só no nativo)
let firebaseAnalytics: any = null;
let firebaseLoaded = false;

async function getFirebaseAnalytics() {
  if (firebaseLoaded) return firebaseAnalytics;
  if (!Capacitor.isNativePlatform()) {
    firebaseLoaded = true;
    return null;
  }

  try {
    const mod = await import("@capacitor-firebase/analytics");
    firebaseAnalytics = mod.FirebaseAnalytics;
    firebaseLoaded = true;
    console.log("[Analytics] Firebase Analytics loaded");
    return firebaseAnalytics;
  } catch (err) {
    console.warn("[Analytics] Firebase Analytics not available:", err);
    firebaseLoaded = true;
    return null;
  }
}

// Inicializar Firebase Analytics no startup do app
export async function initAnalytics() {
  await getFirebaseAnalytics();
}

/**
 * Disparar evento em todas as plataformas
 */
export async function trackEvent(
  eventName: string,
  params: Record<string, any> = {}
) {
  // 1. Google Analytics / Google Ads (gtag)
  try {
    if (typeof window.gtag !== "undefined") {
      window.gtag("event", eventName, params);
    }
  } catch {}

  // 2. Meta Pixel (fbq)
  try {
    if (typeof window.fbq !== "undefined") {
      window.fbq("trackCustom", eventName, params);
    }
  } catch {}

  // 3. Firebase Analytics nativo (app Android)
  try {
    const FA = await getFirebaseAnalytics();
    if (FA) {
      await FA.logEvent({
        name: eventName,
        params,
      });
    }
  } catch (err) {
    console.warn("[Analytics] Firebase event error:", err);
  }
}

/**
 * Definir User ID em todas as plataformas
 */
export async function setAnalyticsUser(userId: string) {
  try {
    if (typeof window.gtag !== "undefined") {
      window.gtag("set", { user_id: userId });
    }
  } catch {}

  try {
    const FA = await getFirebaseAnalytics();
    if (FA) {
      await FA.setUserId({ userId });
    }
  } catch {}
}

/**
 * Google Ads Conversion tracking
 */
export function trackConversion(conversionId: string, params: Record<string, any> = {}) {
  try {
    if (typeof window.gtag !== "undefined") {
      window.gtag("event", "conversion", {
        send_to: conversionId,
        ...params,
      });
    }
  } catch {}
}
