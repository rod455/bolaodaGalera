// ═══════════════════════════════════════════════════════
// Google Auth Helper
// - App nativo (iPhone): usa @capgo/capacitor-social-login (Google nativo)
// - App nativo (iPad): desabilitado (botão escondido em Auth.tsx)
// - Web: usa supabase.auth.signInWithOAuth (redirect)
// ═══════════════════════════════════════════════════════

import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const WEB_CLIENT_ID = "259731661832-a7v1j6nnd2as7lhdlnkfsmg0fl4jq2sh.apps.googleusercontent.com";
const IOS_CLIENT_ID = "259731661832-c4kampg0pu5dca2k9lb9dsfjgp1aqqjd.apps.googleusercontent.com";

// Tipagem do plugin
interface SocialLoginPlugin {
  initialize(options: { google: { webClientId: string; iOSClientId?: string } }): Promise<void>;
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

// ══ Nonce Utils ══
// Fluxo correto para Supabase:
//   1. Gerar rawNonce (aleatório)
//   2. SHA-256(rawNonce) = hashedNonce → enviar ao plugin/Google (vai para o JWT)
//   3. rawNonce → enviar ao Supabase (que faz SHA-256 e compara com o JWT)

function generateRawNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
        ...(Capacitor.getPlatform() === "ios" ? { iOSClientId: IOS_CLIENT_ID } : {}),
      },
      ...(Capacitor.getPlatform() === "ios" ? { apple: {} } : {}),
    } as any);
    initialized = true;
    console.log("[GoogleAuth] Plugin inicializado com sucesso");
  } catch (err) {
    console.error("[GoogleAuth] Falha ao inicializar plugin:", err);
    // Se inicialização falhou, limpar referência para forçar fallback web
    socialLogin = null;
    initialized = false;
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
    // iPad: o plugin nativo de Google Sign-In crasha no iPad (apresentação popover).
    // Usar OAuth web no iPad — mesma experiência, sem crash.
    const isIPad =
      Capacitor.getPlatform() === "ios" &&
      (/iPad/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    if (isIPad) {
      // No iPad nativo, usar scheme customizado como redirectTo.
      // O Safari não consegue navegar para https://localhost (que é o origin do app),
      // então o OAuth nunca voltaria para o app. Com bolaonacopa://, o iOS intercepta
      // o redirect e dispara o evento appUrlOpen no App.tsx.
      return signInWithGoogleWeb(redirectPath, true);
    }

    // Se plugin não inicializou corretamente, NÃO tentar login nativo
    // (evita NSException que crasha o app)
    if (!initialized || !socialLogin) {
      await initGoogleAuth();
      if (!initialized || !socialLogin) {
        console.warn("[GoogleAuth] Plugin não disponível, usando fallback web");
        return signInWithGoogleWeb(redirectPath);
      }
    }

    try {
      // Logout silencioso antes de cada login para limpar sessão em cache.
      // O plugin reutiliza o token anterior se o usuário já estava logado,
      // e esse token antigo não contém o nonce que geramos → erro no Supabase.
      try { await socialLogin.logout({ provider: "google" }); } catch {}

      // Gerar nonce — padrão Supabase:
      // Plugin recebe hashedNonce → Google inclui no JWT → Supabase recebe rawNonce,
      // faz SHA-256 e compara com o JWT. Sem isso, o Google gera nonce internamente
      // e o Supabase não tem como verificar → erro "invalid nonce".
      const rawNonce = generateRawNonce();
      const hashedNonce = await sha256Hex(rawNonce);

      console.log("[GoogleAuth] Iniciando login com nonce");

      const result = await socialLogin.login({
        provider: "google",
        options: {
          scopes: ["profile", "email"],
          nonce: hashedNonce, // Plugin/Google usa o hash no JWT
        },
      });

      const idToken = result?.result?.idToken;

      if (!idToken) {
        return { success: false, error: "Token do Google não recebido" };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce, // Supabase faz SHA-256 e compara com o JWT
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
      console.error("[GoogleAuth] Native login failed:", err);
      return { success: false, error: err?.message || "Erro ao fazer login com Google. Tente com email." };
    }
  }

  return signInWithGoogleWeb(redirectPath);
}

async function signInWithGoogleWeb(
  redirectPath: string,
  useAppScheme = false
): Promise<{ success: boolean; error?: string }> {
  // No iPad nativo: usar bolaodagalera:// para que o iOS intercepte o redirect
  // e abra o app via appUrlOpen (ver App.tsx). Na web, usar a origin normal.
  const redirectTo = useAppScheme
    ? `bolaonacopa:/${redirectPath}`
    : window.location.origin + redirectPath;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
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


