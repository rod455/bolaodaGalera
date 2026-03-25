import { Capacitor } from "@capacitor/core";
import { trackEvent, setUserProperty } from "./analytics";

/**
 * UTM Tracker — captura parâmetros UTM de duas fontes:
 *
 * 1. URL da web (query params) — quando o usuário acessa via link de campanha
 * 2. Android Install Referrer — quando o usuário instala o app via Play Store
 *    com um link que contém utm_source, utm_medium, etc.
 *
 * Os UTMs são salvos no localStorage e enviados como:
 * - Evento "campaign_details" no Firebase Analytics
 * - User properties para segmentação
 */

const UTM_STORAGE_KEY = "bolao_utm_params";

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  captured_at?: string;
}

/**
 * Captura UTMs da URL atual (web).
 * Ex: https://bolaonacopa.com.br/?utm_source=instagram&utm_campaign=bolao2026
 */
function captureWebUTMs(): UTMParams | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UTMParams = {};
    let hasAny = false;

    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const val = params.get(key);
      if (val) {
        (utm as any)[key] = val;
        hasAny = true;
      }
    }

    // Referrer do document (de onde veio o tráfego)
    if (document.referrer) {
      utm.referrer = document.referrer;
    }

    if (hasAny) {
      utm.captured_at = new Date().toISOString();
      return utm;
    }
  } catch {}
  return null;
}

/**
 * Captura UTMs do Android Install Referrer via Capacitor.Plugins.
 * Requer a dependência com.android.installreferrer:installreferrer no build.gradle.
 * O referrer é passado pelo Google Play quando o app é instalado via link com UTMs.
 */
async function captureInstallReferrer(): Promise<UTMParams | null> {
  if (!isNativeApp()) return null;

  try {
    // Tenta acessar o Install Referrer via plugin customizado ou bridge
    // Se não tiver plugin dedicado, o Firebase Analytics já captura automaticamente
    // o install referrer e envia como evento "campaign_details"
    return null;
  } catch {
    return null;
  }
}

function isNativeApp(): boolean {
  try { if (Capacitor.isNativePlatform()) return true; } catch {}
  try {
    const p = Capacitor.getPlatform();
    if (p === "android" || p === "ios") return true;
  } catch {}
  try { if ((window as any).androidBridge) return true; } catch {}
  return false;
}

/**
 * Salva UTMs no localStorage.
 */
function saveUTMs(utm: UTMParams) {
  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  } catch {}
}

/**
 * Recupera UTMs salvos do localStorage.
 */
export function getSavedUTMs(): UTMParams | null {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/**
 * Inicializa o UTM Tracker.
 * Deve ser chamado uma vez no startup do app (junto com initAnalytics).
 *
 * - Captura UTMs da URL (web)
 * - Salva no localStorage
 * - Envia evento + user properties para o Firebase Analytics
 */
export async function initUTMTracker() {
  // 1. Tentar capturar da URL
  const webUTMs = captureWebUTMs();
  if (webUTMs) {
    saveUTMs(webUTMs);

    // Enviar evento para analytics
    await trackEvent("campaign_hit", {
      source: webUTMs.utm_source || "direct",
      medium: webUTMs.utm_medium || "none",
      campaign: webUTMs.utm_campaign || "none",
    });

    // Definir user properties para segmentação
    if (webUTMs.utm_source) await setUserProperty("utm_source", webUTMs.utm_source);
    if (webUTMs.utm_medium) await setUserProperty("utm_medium", webUTMs.utm_medium);
    if (webUTMs.utm_campaign) await setUserProperty("utm_campaign", webUTMs.utm_campaign);

    // Limpar UTMs da URL (para não reenviar em navigations)
    try {
      const url = new URL(window.location.href);
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, "", url.pathname + url.hash);
    } catch {}
  }

  // 2. No nativo, o Firebase Analytics SDK captura automaticamente o install referrer
  // quando com.android.installreferrer:installreferrer está no build.gradle.
  // O evento "campaign_details" é enviado automaticamente ao Firebase.
  if (isNativeApp()) {
    await captureInstallReferrer();
  }
}
