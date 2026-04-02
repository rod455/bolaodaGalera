import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface UserXP {
  xp_total: number;
  nivel: number;
  titulo: string;
  convites_aceitos: number;
}

export interface XPLogEntry {
  acao: string;
  xp: number;
  created_at: string;
}

// Tabela de níveis
const NIVEIS = [
  { nivel: 1, xp: 0, titulo: "Torcedor" },
  { nivel: 2, xp: 50, titulo: "Palpiteiro" },
  { nivel: 3, xp: 150, titulo: "Apostador" },
  { nivel: 4, xp: 350, titulo: "Estrategista" },
  { nivel: 5, xp: 600, titulo: "Craque" },
  { nivel: 6, xp: 1000, titulo: "Mestre" },
  { nivel: 7, xp: 1500, titulo: "Lenda" },
  { nivel: 8, xp: 2500, titulo: "Rei do Bolão" },
];

export const getNivelInfo = (nivel: number) => NIVEIS.find((n) => n.nivel === nivel) || NIVEIS[0];
export const getProximoNivel = (nivel: number) => NIVEIS.find((n) => n.nivel === nivel + 1) || null;

export const getXPProgress = (xp: number, nivel: number) => {
  const atual = getNivelInfo(nivel);
  const proximo = getProximoNivel(nivel);
  if (!proximo) return { current: xp, needed: xp, percentage: 100 }; // Max level
  const xpNoNivel = xp - atual.xp;
  const xpParaProximo = proximo.xp - atual.xp;
  return {
    current: xpNoNivel,
    needed: xpParaProximo,
    percentage: Math.min(100, Math.round((xpNoNivel / xpParaProximo) * 100)),
  };
};

// Cores por nível
export const getNivelColor = (nivel: number): string => {
  if (nivel >= 7) return "#FFD700"; // Ouro
  if (nivel >= 5) return "#9333EA"; // Roxo
  if (nivel >= 3) return "#2563EB"; // Azul
  return "#16a34a"; // Verde
};

// Emoji por nível
export const getNivelEmoji = (nivel: number): string => {
  const emojis: Record<number, string> = {
    1: "⚽", 2: "🎯", 3: "🎰", 4: "🧠", 5: "⭐", 6: "👑", 7: "🏆", 8: "🫅",
  };
  return emojis[nivel] || "⚽";
};

export const useGamification = () => {
  const { user } = useAuth();
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchXP = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      // Buscar XP
      const { data: xpData } = await supabase
        .from("user_xp")
        .select("xp_total, nivel, titulo, convites_aceitos")
        .eq("user_id", user.id)
        .single();

      if (xpData) {
        setUserXP(xpData as UserXP);
      } else {
        // Criar registro se não existe
        const { data: newXP } = await supabase
          .from("user_xp")
          .insert({ user_id: user.id, xp_total: 0, nivel: 1, titulo: "Torcedor", convites_aceitos: 0 })
          .select("xp_total, nivel, titulo, convites_aceitos")
          .single();
        if (newXP) setUserXP(newXP as UserXP);
      }

      // Buscar referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      if (profile) setReferralCode((profile as any).referral_code);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchXP(); }, [fetchXP]);

  // Dar XP via RPC
  const darXP = useCallback(async (acao: string, xp: number, referencia?: string) => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc("dar_xp", {
        p_user_id: user.id,
        p_acao: acao,
        p_xp: xp,
        p_referencia: referencia || null,
      });
      if (error) return false;
      if (data) {
        // Refetch XP atualizado
        await fetchXP();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user, fetchXP]);

  // Processar código de referral (quando usuário se cadastra)
  const processarReferral = useCallback(async (referralCode: string) => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc("processar_referral", {
        p_referred_id: user.id,
        p_referral_code: referralCode,
      });
      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  }, [user]);

  return {
    userXP,
    referralCode,
    loading,
    darXP,
    processarReferral,
    refetch: fetchXP,
    // Helpers
    nivelInfo: userXP ? getNivelInfo(userXP.nivel) : getNivelInfo(1),
    progress: userXP ? getXPProgress(userXP.xp_total, userXP.nivel) : { current: 0, needed: 50, percentage: 0 },
    proximoNivel: userXP ? getProximoNivel(userXP.nivel) : NIVEIS[1],
  };
};
