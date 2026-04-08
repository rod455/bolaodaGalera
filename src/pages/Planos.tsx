import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Trophy, Info, X, Loader2, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { supabase } from "@/integrations/supabase/client";
import RegrasModal from "@/components/RegrasModal";
import type { RegraInfo } from "@/lib/types";
import { MODO_REGRAS } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";

// ═══ Price IDs do Stripe (Android/Web) ═══
const STRIPE_PRICES = {
  premium_mensal: "price_1T1TxnC1YtBHMBc2hJMfOwqL",
  premium_anual: "price_1T1TyYC1YtBHMBc2E12oGz6Q",
  premium_pro_mensal: "price_1T1TzjC1YtBHMBc2CGkzhsUe",
  premium_pro_anual: "price_1T1U0KC1YtBHMBc2gqSGO0jD",
};

// ═══ Product IDs do RevenueCat/Apple (iOS) ═══
const RC_PRODUCTS = {
  premium_mensal: "premium_mensal",
  premium_anual: "premium_anual",
  premium_pro_mensal: "premium_pro_mensal",
  premium_pro_anual: "premium_pro_anual",
};

const Planos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { plano: userPlano, loading: loadingPlano, refetch } = useUserPlan();
  const { purchase, restore, purchasing, isAvailable: rcAvailable } = useRevenueCat();
  const isIOS = Capacitor.getPlatform() === "ios";
  const useIAP = isIOS && rcAvailable;
  const [infoModal, setInfoModal] = useState<RegraInfo | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");

  // Verificar status de retorno do Stripe
  useEffect(() => {
    const status = searchParams.get("status");
    const planoParam = searchParams.get("plano");

    if (status === "sucesso") {
      toast.success(`Parabéns! Seu plano ${planoParam === "premium_pro" ? "Premium PRO" : "Premium"} foi ativado!`);
      refetch();
      window.history.replaceState({}, "", "/planos");
    } else if (status === "cancelado") {
      toast.info("Pagamento cancelado. Você pode tentar novamente quando quiser.");
      window.history.replaceState({}, "", "/planos");
    }
  }, [searchParams, refetch]);

  // ═══ IAP via RevenueCat (iOS) ═══
  const handleIAPCheckout = async (rcProductId: string) => {
    if (!session) {
      toast.error("Você precisa estar logado");
      return;
    }

    setLoadingCheckout(rcProductId);
    try {
      const plano = rcProductId.includes("pro") ? "premium_pro" : "premium";
      const periodo = rcProductId.includes("anual") ? "anual" : "mensal";
      trackEvent("iniciar_premium", { plano, periodo, via: "iap" });

      const success = await purchase(rcProductId);
      if (success) {
        toast.success("Assinatura ativada com sucesso!");
        refetch();
      }
    } catch {
      toast.error("Erro ao processar assinatura. Tente novamente.");
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleRestore = async () => {
    setLoadingCheckout("restore");
    try {
      const restored = await restore();
      if (restored) {
        toast.success("Assinatura restaurada com sucesso!");
        refetch();
      } else {
        toast.info("Nenhuma assinatura encontrada para restaurar.");
      }
    } catch {
      toast.error("Erro ao restaurar compras.");
    } finally {
      setLoadingCheckout(null);
    }
  };

  // ═══ Stripe checkout (Android/Web) — BLOQUEADO no iOS ═══
  const handleStripeCheckout = async (priceId: string) => {
    // Apple Guideline 3.1.1: iOS must use IAP only
    if (isIOS) {
      toast.error("Assinatura indisponível no momento. Tente novamente em instantes.");
      return;
    }

    if (!session) {
      toast.error("Você precisa estar logado");
      return;
    }

    setLoadingCheckout(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      // Upgrade com proration (sem checkout, já atualizado)
      if (data?.upgraded) {
        trackEvent('upgrade_premium', { plano: data.plano });
        toast.success("Plano atualizado com sucesso! O valor foi ajustado proporcionalmente.");
        window.location.href = data.url;
        return;
      }

      // Já tem o mesmo plano ativo
      if (data?.upgraded === false && data?.message) {
        toast.info(data.message);
        return;
      }

      if (data?.url) {
        const planoMap: Record<string, string> = {
          [STRIPE_PRICES.premium_mensal]: 'premium',
          [STRIPE_PRICES.premium_anual]: 'premium',
          [STRIPE_PRICES.premium_pro_mensal]: 'premium_pro',
          [STRIPE_PRICES.premium_pro_anual]: 'premium_pro',
        };
        const periodoMap: Record<string, string> = {
          [STRIPE_PRICES.premium_mensal]: 'mensal',
          [STRIPE_PRICES.premium_anual]: 'anual',
          [STRIPE_PRICES.premium_pro_mensal]: 'mensal',
          [STRIPE_PRICES.premium_pro_anual]: 'anual',
        };
        const valorMap: Record<string, number> = {
          [STRIPE_PRICES.premium_mensal]: 9.90,
          [STRIPE_PRICES.premium_anual]: 79.90,
          [STRIPE_PRICES.premium_pro_mensal]: 14.90,
          [STRIPE_PRICES.premium_pro_anual]: 119.90,
        };
        trackEvent('iniciar_premium', {
          plano: planoMap[priceId] || 'premium',
          periodo: periodoMap[priceId] || 'mensal',
          valor: valorMap[priceId] || 0,
        });

        if (Capacitor.isNativePlatform()) {
          window.open(data.url, "_system");
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch {
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoadingCheckout(null);
    }
  };

  // ═══ Handler unificado — roteia para IAP ou Stripe ═══
  const handleCheckout = async (priceId: string) => {
    if (useIAP) {
      // No iOS, mapeia Stripe price ID para RevenueCat product ID
      const rcMap: Record<string, string> = {
        [STRIPE_PRICES.premium_mensal]: RC_PRODUCTS.premium_mensal,
        [STRIPE_PRICES.premium_anual]: RC_PRODUCTS.premium_anual,
        [STRIPE_PRICES.premium_pro_mensal]: RC_PRODUCTS.premium_pro_mensal,
        [STRIPE_PRICES.premium_pro_anual]: RC_PRODUCTS.premium_pro_anual,
      };
      await handleIAPCheckout(rcMap[priceId] || priceId);
    } else {
      await handleStripeCheckout(priceId);
    }
  };

  const InfoButton = ({ modo }: { modo: string }) => (
    <button
      onClick={() => setInfoModal(MODO_REGRAS[modo])}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-copa-green-100 hover:bg-copa-green-200 transition-colors ml-1.5"
      title="Ver detalhes"
    >
      <Info className="w-3 h-3 text-copa-green-600" />
    </button>
  );

  const isPremium = userPlano === "premium" || userPlano === "premium_pro";
  const isPro = userPlano === "premium_pro";

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead
        title="Planos Premium — Bolões Ilimitados a partir de R$9,90/mês"
        description="Desbloqueie modos de pontuação exclusivos, bolões ilimitados, sem anúncios e mais. Bolão na Copa Premium a partir de R$9,90/mês ou R$79,90/ano."
        path="/planos"
        keywords="bolão na copa premium, planos bolão, bolão sem anúncios, bolão ilimitado"
      />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Tipos de Planos</h2>
      </div>

      {/* ═══ Banner urgência — preço sobe domingo ═══ */}
      {(() => {
        const deadline = new Date("2026-04-13T15:00:00Z");
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) return null;
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const tempoRestante = dias > 0 ? `${dias} dia${dias > 1 ? "s" : ""} e ${horas}h` : `${horas}h`;
        return (
          <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Preço sobe em {tempoRestante}</span>
            </div>
            <p className="text-sm text-amber-900 leading-snug">
              Quem assinar agora <strong>garante o preço atual para sempre</strong>, enquanto a assinatura estiver ativa.
            </p>
          </div>
        );
      })()}

      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => setBillingPeriod("mensal")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            billingPeriod === "mensal"
              ? "bg-white text-copa-green-700 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingPeriod("anual")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${
            billingPeriod === "anual"
              ? "bg-white text-copa-green-700 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Anual
          <span className="absolute -top-2 -right-1 text-[9px] font-bold bg-copa-gold-400 text-copa-green-800 rounded-full px-1.5 py-0.5">
            -33%
          </span>
        </button>
      </div>

      {/* ═══ Plano Free ═══ */}
      <Card className={`rounded-2xl shadow-sm ${userPlano === "free" ? "border-copa-green-400 border-2" : "border-copa-green-200"}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-copa-green-500" />
              <CardTitle className="text-lg font-bold text-copa-green-700">Plano Free</CardTitle>
            </div>
            {userPlano === "free" && (
              <Badge className="bg-copa-green-500 text-white text-[10px]">Plano atual</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Criar até 1 bolão privado</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Casual
                <InfoButton modo="casual" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Participar de até 3 bolões privados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Até 15 participantes por grupo</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Bolões nacionais ilimitados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Plano Premium ═══ */}
      <Card className={`rounded-2xl shadow-sm ${userPlano === "premium" ? "border-copa-gold-400 border-2" : "border-copa-gold-300"} bg-copa-gold-50/30`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-copa-gold-500" />
              <CardTitle className="text-lg font-bold text-copa-gold-600">Plano Premium</CardTitle>
            </div>
            {userPlano === "premium" && (
              <Badge className="bg-copa-gold-400 text-copa-green-800 text-[10px]">Plano atual</Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-copa-green-600 mt-1">
            {billingPeriod === "mensal" ? (
              <>
                R$ 9,90/mês
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  ou R$ 6,66/mês no <button onClick={() => setBillingPeriod("anual")} className="text-copa-green-500 hover:text-copa-green-600 underline">plano anual</button>
                </span>
              </>
            ) : (
              <>R$ 79,90/ano <span className="text-xs font-normal text-muted-foreground">(≈ R$ 6,66/mês)</span></>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Bolões ilimitados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modos Free + Amador e Vencedor
                <InfoButton modo="amador" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Até 30 participantes por grupo</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Sem anúncios entre telas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Filtros personalizados</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Badge "Premium" no perfil</span>
            </div>
          </div>

          {userPlano === "premium" ? (
            <div className="text-center py-2">
              <span className="text-sm font-semibold text-copa-gold-600">Seu plano atual</span>
            </div>
          ) : userPlano === "premium_pro" ? (
            <div className="text-center py-2">
              <span className="text-sm text-muted-foreground">Você já tem o PRO</span>
            </div>
          ) : (
            <Button
              onClick={() =>
                handleCheckout(
                  billingPeriod === "mensal"
                    ? STRIPE_PRICES.premium_mensal
                    : STRIPE_PRICES.premium_anual
                )
              }
              disabled={!!loadingCheckout}
              className="w-full h-11 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-xl shadow-md"
            >
              {loadingCheckout ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              {loadingCheckout ? "Redirecionando..." : "Assinar Premium"}
            </Button>
          )}

          <p className="text-center text-[10px] text-muted-foreground/70 leading-tight mt-1">
            A assinatura renova automaticamente. Cancele a qualquer momento nas configurações da sua conta Apple.
          </p>
        </CardContent>
      </Card>

      {/* ═══ Plano Premium PRO ═══ */}
      <Card className={`rounded-2xl shadow-sm relative overflow-hidden ${userPlano === "premium_pro" ? "border-copa-green-500 border-2" : "border-copa-green-400"} bg-copa-green-50/30`}>
        <div className="absolute top-3 right-3">
          {userPlano === "premium_pro" ? (
            <Badge className="bg-copa-green-500 text-white text-[10px]">Plano atual</Badge>
          ) : (
            <Badge className="bg-copa-gold-400 text-copa-green-800 font-bold text-xs">
              Recomendado
            </Badge>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-copa-gold-500" />
            <CardTitle className="text-lg font-bold text-copa-green-700">Plano Premium PRO</CardTitle>
          </div>
          <p className="text-sm font-semibold text-copa-green-600 mt-1">
            {billingPeriod === "mensal" ? (
              <>
                R$ 14,90/mês
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  ou R$ 8,33/mês no <button onClick={() => setBillingPeriod("anual")} className="text-copa-green-500 hover:text-copa-green-600 underline">plano anual</button>
                </span>
              </>
            ) : (
              <>R$ 99,90/ano <span className="text-xs font-normal text-muted-foreground">(≈ R$ 8,33/mês)</span></>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Todos os benefícios Premium</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-copa-green-700">Até 50 participantes por grupo</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modos Profissional e Torcedor Fanático
                <InfoButton modo="profissional" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Tudo ou Nada
                <InfoButton modo="tudo_ou_nada" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">
                Modo Vencedor ou Nada
                <InfoButton modo="vencedor_ou_nada" />
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Sem anúncios entre telas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Bolões privados com senha</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              <span className="text-sm">Suporte prioritário</span>
            </div>
          </div>

          {userPlano === "premium_pro" ? (
            <div className="text-center py-2">
              <span className="text-sm font-semibold text-copa-green-600">Seu plano atual</span>
            </div>
          ) : (
            <Button
              onClick={() =>
                handleCheckout(
                  billingPeriod === "mensal"
                    ? STRIPE_PRICES.premium_pro_mensal
                    : STRIPE_PRICES.premium_pro_anual
                )
              }
              disabled={!!loadingCheckout}
              className="w-full h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl shadow-md"
            >
              {loadingCheckout ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {loadingCheckout
                ? "Redirecionando..."
                : userPlano === "premium"
                ? "Upgrade para PRO"
                : "Assinar Premium PRO"}
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Desbloqueie todas as funcionalidades do app
          </p>
          <p className="text-center text-[10px] text-muted-foreground/70 leading-tight mt-1">
            A assinatura renova automaticamente. Cancele a qualquer momento nas configurações da sua conta Apple.
          </p>
        </CardContent>
      </Card>

      {/* Restaurar compras — obrigatório pela Apple */}
      {useIAP && (
        <button
          onClick={handleRestore}
          disabled={!!loadingCheckout}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar compras anteriores
        </button>
      )}

      {/* Links obrigatórios — Política de Privacidade e Termos de Uso */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2 pb-4">
        <a
          href="/termos-de-uso.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Termos de Uso
        </a>
        <span>·</span>
        <a
          href="/privacidade.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Política de Privacidade
        </a>
      </div>

      <RegrasModal
        regras={infoModal}
        open={!!infoModal}
        onClose={() => setInfoModal(null)}
      />
    </div>
  );
};

export default Planos;
