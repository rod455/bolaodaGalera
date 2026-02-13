import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserPlan = "free" | "premium" | "premium_pro";

interface UserPlanData {
  plano: UserPlan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planoExpiraEm: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useUserPlan = (): UserPlanData => {
  const { user } = useAuth();
  const [plano, setPlano] = useState<UserPlan>("free");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
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
        .select("plano, stripe_customer_id, stripe_subscription_id, plano_expira_em")
        .eq("id", user.id)
        .single();

      if (data && !error) {
        setPlano((data as any).plano || "free");
        setStripeCustomerId((data as any).stripe_customer_id || null);
        setStripeSubscriptionId((data as any).stripe_subscription_id || null);
        setPlanoExpiraEm((data as any).plano_expira_em || null);
      }
    } catch (err) {
      console.error("Erro ao buscar plano:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [user]);

  return {
    plano,
    stripeCustomerId,
    stripeSubscriptionId,
    planoExpiraEm,
    loading,
    refetch: fetchPlan,
  };
};
