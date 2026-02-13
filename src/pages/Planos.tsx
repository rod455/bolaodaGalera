import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ExternalLink, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { supabase } from "@/integrations/supabase/client";

const Planos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, user } = useAuth();
  const { plano: userPlano, loading: loadingPlano, refetch } = useUserPlan();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const pricingTableRef = useRef<HTMLDivElement>(null);

  // Carregar o script do Stripe Pricing Table
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remover script ao desmontar
      const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Verificar status de retorno do Stripe
  useEffect(() => {
    const status = searchParams.get("status");
    const planoParam = searchParams.get("plano");

    if (status === "sucesso") {
      toast.success(
        `Parabéns! Seu plano ${planoParam === "premium_pro" ? "Premium PRO" : "Premium"} foi ativado!`
      );
      refetch();
      window.history.replaceState({}, "", "/planos");
    } else if (status === "cancelado") {
      toast.info("Pagamento cancelado. Você pode tentar novamente quando quiser.");
      window.history.replaceState({}, "", "/planos");
    }
  }, [searchParams]);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Erro ao abrir portal:", err);
      toast.error("Erro ao abrir gerenciamento da assinatura.");
    } finally {
      setLoadingPortal(false);
    }
  };

  const isPremium = userPlano === "premium" || userPlano === "premium_pro";
  const isPro = userPlano === "premium_pro";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Tipos de Planos</h2>
      </div>

      {/* Banner do plano atual (se já for premium) */}
      {!loadingPlano && isPremium && (
        <div className="bg-copa-green-50 border border-copa-green-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-copa-gold-100 flex items-center justify-center">
              {isPro ? (
                <Zap className="w-5 h-5 text-copa-gold-600" />
              ) : (
                <Crown className="w-5 h-5 text-copa-gold-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-copa-green-700">
                Você é {isPro ? "Premium PRO" : "Premium"}!
              </p>
              <p className="text-xs text-muted-foreground">Assinatura ativa</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            disabled={loadingPortal}
            className="text-xs border-copa-green-300 text-copa-green-600 hover:bg-copa-green-50 rounded-lg"
          >
            {loadingPortal ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Gerenciar
              </>
            )}
          </Button>
        </div>
      )}

      {/* Stripe Pricing Table */}
      {!isPremium && (
        <div ref={pricingTableRef} className="rounded-2xl overflow-hidden">
          {user ? (
            <div
              dangerouslySetInnerHTML={{
                __html: `
                  <stripe-pricing-table
                    pricing-table-id="prctbl_1T0LS4CPiJml4DyDHVe9ndjV"
                    publishable-key="pk_test_51StwCOCPiJml4DyDzXTYfZKTaF8xkUciUP7O2TiJX6VWfdO2jFjGG0IgacU4zSQNFJivlerVcHpCkrFax8rQvUeK00Wf4Psfl2"
                    client-reference-id="${user.id}"
                    customer-email="${user.email}"
                  >
                  </stripe-pricing-table>
                `,
              }}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Faça login para ver os planos disponíveis.</p>
            </div>
          )}
        </div>
      )}

      {/* Se já é premium, mostrar opção de upgrade ou gerenciamento */}
      {!loadingPlano && userPlano === "premium" && (
        <div className="bg-copa-green-50/50 border border-copa-green-200 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Quer desbloquear todos os modos de pontuação?
          </p>
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <stripe-pricing-table
                  pricing-table-id="prctbl_1T0LS4CPiJml4DyDHVe9ndjV"
                  publishable-key="pk_test_51StwCOCPiJml4DyDzXTYfZKTaF8xkUciUP7O2TiJX6VWfdO2jFjGG0IgacU4zSQNFJivlerVcHpCkrFax8rQvUeK00Wf4Psfl2"
                  client-reference-id="${user?.id}"
                  customer-email="${user?.email}"
                >
                </stripe-pricing-table>
              `,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Planos;
