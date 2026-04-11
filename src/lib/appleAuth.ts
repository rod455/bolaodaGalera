// ═══════════════════════════════════════════════════════
// Apple Auth Helper
// - App nativo iOS: usa @capgo/capacitor-social-login (Apple nativo)
// - Web: usa supabase.auth.signInWithOAuth (redirect)
// ═══════════════════════════════════════════════════════

import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

interface SocialLoginPlugin {
  initialize(options: { apple: Record<string, never> }): Promise<void>;
  login(options: { provider: string; options: Record<string, any> }): Promise<{
    provider: string;
    result: {
      idToken: string;
      accessToken?: string;
      nonce?: string;
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
 * Inicializar o Apple Social Login (chamar uma vez no app startup)
 */
export async function initAppleAuth() {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== "ios") return;
  if (initialized) return;

  try {
    socialLogin = registerPlugin<SocialLoginPlugin>("SocialLogin");
    await socialLogin.initialize({ apple: {} });
    initialized = true;
  } catch {
    // Plugin não disponível
  }
}

/**
 * Fazer login com Apple.
 */
export async function signInWithApple(
  redirectPath: string = "/home"
): Promise<{ success: boolean; error?: string }> {
  // ═══ APP NATIVO iOS ═══
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    try {
      if (!socialLogin) {
        await initAppleAuth();
        if (!socialLogin) {
          return { success: false, error: "Apple Auth não disponível" };
        }
      }

      const result = await socialLogin.login({
        provider: "apple",
        options: {
          scopes: ["email", "name"],
        },
      });

      const idToken = result?.result?.idToken;
      const nonce = result?.result?.nonce;

      if (!idToken) {
        return { success: false, error: "Token da Apple não recebido" };
      }

      console.log("[AppleAuth] nonce present:", !!nonce);

      // Usar idToken para autenticar no Supabase (nonce obrigatório para Apple)
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: idToken,
        ...(nonce ? { nonce } : {}),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      if (
        err?.message?.includes("cancel") ||
        err?.message?.includes("Cancel") ||
        err?.code === "1000" ||
        err?.code === "ASAuthorizationError.canceled"
      ) {
        return { success: false, error: "Login cancelado" };
      }
      return { success: false, error: err?.message || "Erro ao fazer login com Apple" };
    }
  }

  // ═══ WEB ═══
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.origin + redirectPath,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao fazer login com Apple" };
  }
}
