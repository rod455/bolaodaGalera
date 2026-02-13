import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Trophy, Info, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { supabase } from "@/integrations/supabase/client";

// ═══ Price IDs do Stripe ═══
const STRIPE_PRICES = {
  premium_mensal: "price_1StwGSCPiJml4DyDe86mm6Fq",
  premium_anual: "price_1T0KJHCPiJml4DyDwB657CRs",
  premium_pro_mensal: "price_1T0KMtCPiJml4DyD2m8qiXj6",
  premium_pro_anual: "price_1T0KNKCPiJml4DyDb0hcf6RG",
};

interface ModoInfo {
  titulo: string;
  descricao: string;
  regras: { texto: string; pontos: string; acerto: boolean }[];
}

const modosInfo: Record<string, ModoInfo> = {
  casual: {
    titulo: "Iniciantes / Casual",
    descricao: "Modo simples para quem está começando.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
    ],
  },
  amador: {
    titulo: "Intermediário / Amadores",
    descricao: "Mais detalhado, com pontos extras por diferença de gols.",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "3 pontos", acerto: true },
      { texto: "Apostar no empate e errar número de gols", pontos: "5 pontos", acerto: true },
      { texto: "Diferença de gols correta", pontos: "3 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  profissional: {
    titulo: "Avançado / Profissional",
    descricao: "Modo completo com pontuações altas.",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  fanatico: {
    titulo: "Torcedor Fanático",
    descricao: "Só jogos do seu time, pontuação máxima!",
    regras: [
      { texto: "Placar exato", pontos: "20 pontos", acerto: true },
      { texto: "Vencedor + gols do vencedor", pontos: "12 pontos", acerto: true },
      { texto: "Vencedor + gols do perdedor", pontos: "8 pontos", acerto: true },
      { texto: "Vencedor + Diferença de gols", pontos: "10 pontos", acerto: true },
      { texto: "Vencedor do confronto", pontos: "5 pontos", acerto: true },
      { texto: "Empate e errar número de gols", pontos: "8 pontos", acerto: true },
      { texto: "Número de gols do vencedor", pontos: "2 pontos", acerto: true },
      { texto: "Número de gols do perdedor", pontos: "2 pontos", acerto: true },
    ],
  },
  tudo_ou_nada: {
    titulo: "Tudo ou Nada",
    descricao: "Placar exato ou zero. Para os corajosos!",
    regras: [
      { texto: "Placar exato", pontos: "10 pontos", acerto: true },
      { texto: "Errou o placar", pontos: "0 pontos", acerto: false },
    ],
  },
  vencedor_ou_nada: {
    titulo: "Vencedor ou Nada",
    descricao: "Acerte o vencedor ou o empate.",
    regras: [
      { texto: "Vencedor", pontos: "5 pontos", acerto: true },
      { texto: "Empate", pontos: "5 pontos", acerto: true },
      { texto: "Errou", pontos: "0 pontos", acerto: false },
    ],
  },
};

const Planos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { plano: userPlano, loading: loadingPlano, refetch } = useUserPlan();
  const [infoModal, setInfoModal] = useState<ModoInfo | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
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
  }, [searchParams]);

  const handleCheckout = async (priceId: string) => {
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
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoadingCheckout(null);
    }
  };

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

  const InfoButton = ({ modo }: { modo: string }) => (
    <button
      onClick={() => setInfoModal(modosInfo[modo])}
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Tipos de Planos</h2>
      </div>

      {/* Plano atual badge */}
      {!loadingPlano && isPremium && (
        <div className="bg-copa-green-50 border border-copa-green-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-copa-gold-100 flex items-center justify-center">
              {isPro ? <Zap className="w-5 h-5 text-copa-gold-600" /> : <Crown className="w-5 h-5 text-copa-gold-500" />}
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
              <span className="text-sm">Criar até 1 bolão</span>
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
              <span className="text-sm">Participar de até 3 bolões</span>
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
            {billingPeriod === "mensal" ? "💰 R$ 9,90/mês" : "💰 R$ 79,90/ano (≈ R$ 6,66/mês)"}
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
              <span className="text-sm">Participantes ilimitados no bolão</span>
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
            <Button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              variant="outline"
              className="w-full h-11 border-copa-gold-400 text-copa-gold-600 hover:bg-copa-gold-50 font-bold rounded-xl"
            >
              {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Gerenciar assinatura
            </Button>
          ) : userPlano === "premium_pro" ? (
            <Button disabled variant="outline" className="w-full h-11 font-bold rounded-xl opacity-50">
              Você já tem o PRO
            </Button>
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
        </CardContent>
      </Card>

      {/* ═══ Plano Premium PRO ═══ */}
      <Card className={`rounded-2xl shadow-sm relative overflow-hidden ${userPlano === "premium_pro" ? "border-copa-green-500 border-2" : "border-copa-green-400"} bg-copa-green-50/30`}>
        <div className="absolute top-3 right-3">
          <Badge className="bg-copa-gold-400 text-copa-green-800 font-bold text-xs">
            Recomendado
          </Badge>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-copa-gold-500" />
              <CardTitle className="text-lg font-bold text-copa-green-700">Plano Premium PRO</CardTitle>
            </div>
            {userPlano === "premium_pro" && (
              <Badge className="bg-copa-green-500 text-white text-[10px]">Plano atual</Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-copa-green-600 mt-1">
            {billingPeriod === "mensal" ? "💰 R$ 14,90/mês" : "💰 R$ 99,90/ano (≈ R$ 8,33/mês)"}
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
            <Button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              variant="outline"
              className="w-full h-11 border-copa-green-400 text-copa-green-600 hover:bg-copa-green-50 font-bold rounded-xl"
            >
              {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Gerenciar assinatura
            </Button>
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
        </CardContent>
      </Card>

      {/* Info Modal */}
      <Dialog open={!!infoModal} onOpenChange={() => setInfoModal(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-copa-green-700">
              {infoModal?.titulo}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {infoModal?.descricao}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {infoModal?.regras.map((regra, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  regra.acerto ? "bg-copa-green-50" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {regra.acerto ? (
                    <Check className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{regra.texto}</span>
                </div>
                <span className={`text-sm font-bold ${regra.acerto ? "text-copa-green-600" : "text-red-500"}`}>
                  {regra.pontos}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Planos;
