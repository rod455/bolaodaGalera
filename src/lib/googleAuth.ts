// ═══════════════════════════════════════════════════════
// Google Auth Helper
// - App nativo: usa @codetrix-studio/capacitor-google-auth (sign-in nativo)
// - Web: usa supabase.auth.signInWithOAuth (redirect)
// ═══════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const WEB_CLIENT_ID = "259731661832-a7v1j6nnd2as7lhdlnkfsmg0fl4jq2sh.apps.googleusercontent.com";

/**
 * Inicializar o plugin Google Auth (chamar uma vez no app startup)
 * Só executa no app nativo.
 */
export async function initGoogleAuth() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { GoogleAuth } = await import(/* @vite-ignore */ "@codetrix-studio/capacitor-google-auth");
    GoogleAuth.initialize({
      clientId: WEB_CLIENT_ID,
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
  } catch (err) {
    console.error("Erro ao inicializar GoogleAuth:", err);
  }
}

/**
 * Fazer login com Google.
 * - No app nativo: abre o seletor de conta nativo do Google, retorna idToken,
 *   e usa supabase.auth.signInWithIdToken para autenticar.
 * - Na web: usa signInWithOAuth com redirect.
 *
 * @param redirectPath - path para redirecionar após login na web (ex: "/home")
 * @returns { success: boolean, error?: string }
 */
export async function signInWithGoogle(
  redirectPath: string = "/home"
): Promise<{ success: boolean; error?: string }> {
  // ═══ APP NATIVO: Google Sign-In nativo ═══
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import(/* @vite-ignore */ "@codetrix-studio/capacitor-google-auth");

      const googleUser = await GoogleAuth.signIn();

      if (!googleUser?.authentication?.idToken) {
        return { success: false, error: "Token do Google não recebido" };
      }

      // Usar idToken para autenticar no Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: googleUser.authentication.idToken,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      // Usuário cancelou o login
      if (err?.message?.includes("canceled") || err?.message?.includes("cancelled")) {
        return { success: false, error: "Login cancelado" };
      }
      return { success: false, error: err?.message || "Erro ao fazer login com Google" };
    }
  }

  // ═══ WEB: OAuth redirect ═══
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + redirectPath,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Na web, o redirect acontece automaticamente
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao fazer login com Google" };
  }
}
