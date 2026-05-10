import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Registrar sessão por plataforma (máximo 1x por dia por dispositivo)
function registrarSessao(userId: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  const chave = `session_log_${userId}_${hoje}`;
  if (localStorage.getItem(chave)) return;
  localStorage.setItem(chave, "1");
  const origem = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
  supabase.from("user_sessions").insert({ user_id: userId, origem }).catch(() => {});
}

// Processar referral pendente do localStorage
function processarReferralPendente(userId: string) {
  try {
    const raw = localStorage.getItem("pending_referral");
    if (!raw) return;

    localStorage.removeItem("pending_referral");
    // Formato: { code: "ABC123", ts: 1234567890 } ou string legado "ABC123"
    let code: string | null = null;
    try {
      const parsed = JSON.parse(raw);
      // Expiração de 24h
      if (parsed.code && Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
        code = parsed.code;
      }
    } catch {
      code = raw; // formato legado (string pura)
    }
    if (code) {
      supabase.rpc("processar_referral", {
        p_referred_id: userId,
        p_referral_code: code,
      }).catch((err) => {
        console.error("Erro ao processar referral:", err);
        localStorage.setItem("pending_referral", raw);
      });
    }
  } catch {}
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Processar referral para usuários já logados que clicaram num link de referral
      if (session?.user) {
        processarReferralPendente(session.user.id);
        registrarSessao(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Salvar origem do cadastro na primeira vez (Google OAuth via redirect)
        if (event === "SIGNED_IN" && session?.user && !session.user.user_metadata?.origem) {
          const origem = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web";
          supabase.auth.updateUser({ data: { origem } }).catch(() => {});
        }

        // Processar referral pendente (salvo no localStorage antes do OAuth redirect)
        if (event === "SIGNED_IN" && session?.user) {
          processarReferralPendente(session.user.id);
          registrarSessao(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Continue logout even if API call fails
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

