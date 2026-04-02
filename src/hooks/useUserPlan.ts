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
        setPlano((data as any).plano || "free");
        setPlanoExpiraEm((data as any).plano_expira_em || null);
      }
    } catch {
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
