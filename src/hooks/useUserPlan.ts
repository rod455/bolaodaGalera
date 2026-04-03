import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserPlan = "free" | "premium" | "premium_pro";

interface UserPlanData {
  plano: UserPlan;
  planoExpiraEm: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUserPlan = (): UserPlanData => {
  const { user } = useAuth();
  const [plano, setPlano] = useState<UserPlan>("free");
  const [planoExpiraEm, setPlanoExpiraEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("plano, plano_expira_em")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        const d = data as { plano?: string; plano_expira_em?: string };
        setPlano((d.plano as UserPlan) || "free");
        setPlanoExpiraEm(d.plano_expira_em || null);
      }
    } catch (err) {
      console.error("Erro ao buscar plano do usuário:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [user]);

  return {
    plano,
    planoExpiraEm,
    loading,
    refetch: fetchPlan,
  };
};
