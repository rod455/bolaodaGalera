// ═══════════════════════════════════════════════════════
// Google Auth Helper
// - App nativo: usa @capgo/capacitor-social-login (Google nativo)
// - Web: usa supabase.auth.signInWithOAuth (redirect)
// ═══════════════════════════════════════════════════════

import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const WEB_CLIENT_ID = "259731661832-a7v1j6nnd2as7lhdlnkfsmg0fl4jq2sh.apps.googleusercontent.com";

// Tipagem do plugin
interface SocialLoginPlugin {
  initialize(options: { google: { webClientId: string } }): Promise<void>;
  login(options: { provider: string; options: Record<string, any> }): Promise<{
    provider: string;
    result: {
      idToken: string;
      accessToken?: string;
      profile?: {
        email: string;
        name: string;
        imageUrl?: string;
      };
    };
  }>;
  logout(options: { provider: string }): Promise<void>;
}

let socialLogin: SocialLoginPlugin | null = null;
let initialized = false;

/**
 * Inicializar o Social Login (chamar uma vez no app startup)
 */
export async function initGoogleAuth() {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;

  try {
    socialLogin = registerPlugin<SocialLoginPlugin>("SocialLogin");
    await socialLogin.initialize({
      google: {
        webClientId: WEB_CLIENT_ID,
      },
    });
    initialized = true;
  } catch {
  }
}

/**
 * Fazer login com Google.
 */
export async function signInWithGoogle(
  redirectPath: string = "/home"
): Promise<{ success: boolean; error?: string }> {
  // ═══ APP NATIVO ═══
  if (Capacitor.isNativePlatform()) {
    try {
      if (!socialLogin) {
        // Tentar inicializar se ainda não foi
        await initGoogleAuth();
        if (!socialLogin) {
          return { success: false, error: "Google Auth não disponível" };
        }
      }

      const result = await socialLogin.login({
        provider: "google",
        options: {
          scopes: ["profile", "email"],
        },
      });

      const idToken = result?.result?.idToken;

      if (!idToken) {
        return { success: false, error: "Token do Google não recebido" };
      }

      // Usar idToken para autenticar no Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      if (
        err?.message?.includes("cancel") ||
        err?.message?.includes("Cancel") ||
        err?.code === "SIGN_IN_CANCELLED"
      ) {
        return { success: false, error: "Login cancelado" };
      }
      return { success: false, error: err?.message || "Erro ao fazer login com Google" };
    }
  }

  // ═══ WEB ═══
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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao fazer login com Google" };
  }
}
