import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlusCircle, Keyboard, Search, Users, ChevronRight, Loader2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import type { Bolao } from "@/lib/types";
import { FALLBACK_IMAGES, FREE_MAX_PRIVADOS, FREE_MAX_PARTICIPANTES, PREMIUM_MAX_PARTICIPANTES, PREMIUM_PRO_MAX_PARTICIPANTES } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import type { UpsellReason } from "@/components/PremiumUpsellModal";

const EntrarBolao = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [publicos, setPublicos] = useState<Bolao[]>([]);
  const [participantesCount, setParticipantesCount] = useState<Record<string, number>>({});
  const [userBolaoIds, setUserBolaoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const { plano: userPlano } = useUserPlan();
  const { showAd, needsAd } = useRewardedAd();
  const [upsellModal, setUpsellModal] = useState<{ open: boolean; reason: UpsellReason }>({ open: false, reason: "privado_limite" });

  const checkPrivateLimit = async (): Promise<boolean> => {
    if (userPlano !== "free" && userPlano) return true;
    if (!user) return false;
    const { data } = await supabase
      .from("bolao_participantes")
      .select("bolao_id, boloes(is_nacional)")
      .eq("user_id", user.id)
      .eq("status", "ativo");
    const privCount = (data || []).filter((p: any) => p.boloes && !p.boloes.is_nacional).length;
    if (privCount >= FREE_MAX_PRIVADOS) {
      setUpsellModal({ open: true, reason: "privado_limite" });
      return false;
    }
    return true;
  };

  const checkBolaoCapacity = async (bolaoId: string): Promise<boolean> => {
    const { count } = await supabase
      .from("bolao_participantes")
      .select("*", { count: "exact", head: true })
      .eq("bolao_id", bolaoId)
      .eq("status", "ativo");
    const currentCount = count || 0;
    const { data: participants } = await supabase
      .from("bolao_participantes")
      .select("user_id, profiles(plano)")
      .eq("bolao_id", bolaoId)
      .eq("status", "ativo");
    const { data: bolaoData } = await supabase
      .from("boloes")
      .select("criador_id, profiles(plano)")
      .eq("id", bolaoId)
      .single();
    const allPlanos = [
      ...(participants || []).map((p: any) => p.profiles?.plano),
      bolaoData?.profiles?.plano,
    ];
    const hasProMember = allPlanos.includes("premium_pro");
    const hasPremiumMember = hasProMember || allPlanos.includes("premium");
    const maxCapacity = hasProMember ? PREMIUM_PRO_MAX_PARTICIPANTES : hasPremiumMember ? PREMIUM_MAX_PARTICIPANTES : FREE_MAX_PARTICIPANTES;
    if (currentCount >= maxCapacity) {
      setUpsellModal({ open: true, reason: "grupo_lotado" });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const codigoFromUrl = searchParams.get("codigo");
    if (codigoFromUrl) setCodigo(codigoFromUrl.toUpperCase());
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    const codigoFromUrl = searchParams.get("codigo");
    if (codigoFromUrl && user && !loading) {
      handleEntrarCodigo();
    }
  }, [user, loading]);

  const loadData = async () => {
    try {
      const { data: participacoes } = await supabase
        .from("bolao_participantes")
        .select("bolao_id")
        .eq("user_id", user?.id ?? "");
      const ids = new Set((participacoes || []).map((p: any) => p.bolao_id));
      setUserBolaoIds(ids);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const ensureProfile = async () => {
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário",
        email: user.email || "",
      });
      if (error && error.code !== "23505") {
        return false;
      }
    }
    return true;
  };

  const handleEntrarCodigo = async () => {
    if (!codigo.trim()) {
      toast.error("Informe o código do grupo");
      return;
    }
    if (!user) return;
    if (!(await checkPrivateLimit())) return;
    setBuscando(true);
    try {
      const { data: bolao, error: fetchError } = await supabase
        .from("boloes")
        .select("id, nome, aprovacao_entrada, is_nacional")
        .eq("codigo_convite", codigo.trim().toUpperCase())
        .single();
      if (fetchError || !bolao) {
        toast.error("Grupo não encontrado. Verifique o código.");
        setBuscando(false);
        return;
      }
      if (!(await checkBolaoCapacity(bolao.id))) {
        setBuscando(false);
        return;
      }
      if (needsAd) {
        const adResult = await showAd("entrar");
        if (!adResult) {
          setBuscando(false);
          return;
        }
      }
      await ensureProfile();
      const needsApproval = bolao.aprovacao_entrada && !bolao.is_nacional;
      const insertStatus = needsApproval ? "pendente" : "ativo";
      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: bolao.id, user_id: user.id, status: insertStatus });
      if (error) {
        if (error.code === "23505") {
          toast.info("Você já está neste grupo!");
        } else {
          throw error;
        }
      } else if (needsApproval) {
        toast.success("Solicitação enviada! Aguarde a aprovação do moderador.");
        navigate("/home");
        return;
      } else {
        toast.success(`Você entrou no ${bolao.nome}!`);
      }
      navigate(`/bolao/${bolao.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar no grupo");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Grupos" path="/entrar" noindex />
      <div>
        <h2 className="text-2xl font-bold text-foreground">Grupos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {userBolaoIds.size > 0 ? "Encontre novos grupos ou crie o seu" : "Crie seu primeiro grupo ou entre em um existente"}
        </p>
      </div>

      {!loading && userBolaoIds.size === 0 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-copa-green-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-copa-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold">Você ainda não está em nenhum grupo</p>
            <p className="text-sm text-muted-foreground mt-1">Crie um grupo e convide seus amigos!</p>
          </div>
          <Button onClick={() => navigate("/criar")} className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl px-6">
            <PlusCircle className="w-4 h-4 mr-2" /> Criar meu primeiro grupo
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => navigate("/criar")}
          className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Criar novo grupo
        </Button>
        <Button
          variant="outline"
          className="h-12 border-copa-gold-400 text-copa-gold-600 bg-copa-gold-50 hover:bg-copa-gold-100 font-semibold rounded-xl"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Entrar por código
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border-copa-gold-300 bg-copa-gold-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Insira o código do grupo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleEntrarCodigo()}
              className="h-11 rounded-xl bg-white flex-1 font-mono text-center tracking-widest text-lg"
              maxLength={6}
            />
            <Button
              onClick={handleEntrarCodigo}
              disabled={buscando}
              className="h-11 px-6 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl"
            >
              {buscando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Entrar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <PremiumUpsellModal
        open={upsellModal.open}
        onClose={() => setUpsellModal({ ...upsellModal, open: false })}
        reason={upsellModal.reason}
      />
    </div>
  );
};

export default EntrarBolao;
