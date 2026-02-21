// ═══════════════════════════════════════════════════════
// Google Auth Helper
// - App nativo: usa GoogleAuth plugin via Capacitor.Plugins (sem import direto)
// - Web: usa supabase.auth.signInWithOAuth (redirect)
// ═══════════════════════════════════════════════════════

import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const WEB_CLIENT_ID = "259731661832-a7v1j6nnd2as7lhdlnkfsmg0fl4jq2sh.apps.googleusercontent.com";

// Registrar o plugin sem import direto do pacote nativo
// No app nativo, o plugin real é carregado pelo Capacitor
// Na web, isso cria um proxy que não faz nada
interface GoogleAuthPlugin {
  initialize(options: { clientId: string; scopes: string[]; grantOfflineAccess: boolean }): void;
  signIn(): Promise<{
    authentication: { idToken: string };
    email: string;
    familyName: string;
    givenName: string;
    id: string;
    name: string;
  }>;
  signOut(): Promise<void>;
}

let googleAuthPlugin: GoogleAuthPlugin | null = null;

/**
 * Inicializar o Google Auth (chamar uma vez no app startup)
 */
export function initGoogleAuth() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    googleAuthPlugin = registerPlugin<GoogleAuthPlugin>("GoogleAuth");
    googleAuthPlugin.initialize({
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
 */
export async function signInWithGoogle(
  redirectPath: string = "/home"
): Promise<{ success: boolean; error?: string }> {
  // ═══ APP NATIVO ═══
  if (Capacitor.isNativePlatform()) {
    try {
      if (!googleAuthPlugin) {
        return { success: false, error: "Google Auth não inicializado" };
      }

      const googleUser = await googleAuthPlugin.signIn();

      if (!googleUser?.authentication?.idToken) {
        return { success: false, error: "Token do Google não recebido" };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: googleUser.authentication.idToken,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      if (err?.message?.includes("canceled") || err?.message?.includes("cancelled") || err?.code === "SIGN_IN_CANCELLED") {
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
