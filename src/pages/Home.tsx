import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { signInWithGoogle } from "@/lib/googleAuth";
import { signInWithApple } from "@/lib/appleAuth";
import {
  PlusCircle, Keyboard, Users, MapPin, ChevronRight, ChevronUp, ChevronDown, GripVertical,
  Trophy, Globe, LogIn, AlertTriangle, Clock, X, Loader2, Calendar, Search, Info, UserPlus, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RegrasModal from "@/components/RegrasModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { useUserPlan } from "@/hooks/useUserPlan";
import DynamicBanner from "@/components/DynamicBanner";
import type { UserBannerContext } from "@/components/DynamicBanner";
import QuizBannerCarousel from "@/components/QuizBannerCarousel";
import GuestHeroCarousel from "@/components/GuestHeroCarousel";
import PromoCardBorder from "@/components/PromoCardBorder";
import type { Bolao } from "@/lib/types";
import { MODO_LABELS, MODO_REGRAS, FALLBACK_IMAGES, FREE_MAX_PRIVADOS as CONST_FREE_MAX_PRIVADOS, FREE_MAX_CRIAR as CONST_FREE_MAX_CRIAR, FREE_MAX_PARTICIPANTES, PREMIUM_MAX_PARTICIPANTES, PREMIUM_PRO_MAX_PARTICIPANTES } from "@/lib/constants";
import { formatDataJogo } from "@/lib/formatters";
import SEOHead from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import type { UpsellReason } from "@/components/PremiumUpsellModal";
import Onboarding, { isOnboardingDone, markOnboardingDone } from "@/components/Onboarding";
import FeedbackBanner from "@/components/FeedbackBanner";

const PAULISTAO_BOLAO_ID = "71851d2a-88fa-4ec4-a780-7c1e450869ef";

const BOLOES_ARQUIVADOS = new Set([
  "71851d2a-88fa-4ec4-a780-7c1e450869ef",
  "21d68ba2-89f4-4585-a21d-d9a046150b94",
  "a8cbcb1a-2e6f-4e66-b070-3e874e531552",
]);

interface ProximoJogo {
  time_a: string; time_b: string;
  logo_time_a: string | null; logo_time_b: string | null;
  data_hora: string; fase: string | null; rodada: string | null;
}

interface PendingAlert {
  id: string; bolaoId: string; bolaoNome: string;
  jogoId: string; jogo: string; horasRestantes: number;
}

const STORAGE_KEY = "bolao_order_privados";
const loadSavedOrder = (): string[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveOrder = (ids: string[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {} };
const sortByOrder = (boloes: Bolao[], savedOrder: string[]): Bolao[] => {
  if (savedOrder.length === 0) return boloes;
  const m = new Map(savedOrder.map((id, i) => [id, i]));
  return [...boloes].sort((a, b) => (m.get(a.id) ?? 999) - (m.get(b.id) ?? 999));
};

const BolaoCard = ({
  bolao, participantes, posicao, isParticipating, isPending, onAccess, onInfoClick, imgFallback,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
}: {
  bolao: Bolao; participantes: number; posicao: number | null;
  isParticipating?: boolean; isPending?: boolean; onAccess: () => void; onInfoClick?: () => void; imgFallback: string;
  canMoveUp?: boolean; canMoveDown?: boolean;
  onMoveUp?: () => void; onMoveDown?: () => void;
}) => (
  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
    <div className="relative h-36 overflow-hidden cursor-pointer" onClick={onAccess}>
      <img src={(Capacitor.isNativePlatform() && (bolao as any).imagem_url_mobile) ? (bolao as any).imagem_url_mobile : bolao.imagem_url || imgFallback} alt={bolao.nome} className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = imgFallback; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
        <h3 className="text-white font-bold text-lg leading-tight">{bolao.nome}</h3>
        {(canMoveUp || canMoveDown) && (
          <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={onMoveUp} disabled={!canMoveUp}
              className={`bg-white/20 backdrop-blur-sm rounded-md p-0.5 transition-all ${canMoveUp ? "hover:bg-white/40 active:scale-90" : "opacity-30 cursor-default"}`}>
              <ChevronUp className="w-4 h-4 text-white" />
            </button>
            <button onClick={onMoveDown} disabled={!canMoveDown}
              className={`bg-white/20 backdrop-blur-sm rounded-md p-0.5 transition-all ${canMoveDown ? "hover:bg-white/40 active:scale-90" : "opacity-30 cursor-default"}`}>
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {bolao.modo_pontuacao && (
              <button onClick={(e) => { e.stopPropagation(); onInfoClick?.(); }}
                className="text-[10px] font-bold bg-copa-green-100 text-copa-green-700 rounded-full px-2 py-0.5 flex items-center gap-1 hover:bg-copa-green-200 transition-colors">
                Modo de Jogo: {MODO_LABELS[bolao.modo_pontuacao] || bolao.modo_pontuacao}
                <Info className="w-3 h-3" />
              </button>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />{participantes.toLocaleString("pt-BR")} participantes
            </span>
            {posicao && (
              <Badge variant="secondary" className="bg-copa-green-50 text-copa-green-600 border-0 text-xs font-semibold">
                <MapPin className="w-3 h-3 mr-1" />{posicao}º lugar
              </Badge>
            )}
          </div>
        </div>
        {isPending ? (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold px-3 py-1.5">
            <Clock className="w-3 h-3 mr-1" />Aguardando Aprovação
          </Badge>
        ) : (
          <Button size="sm"
            className={`font-semibold rounded-lg ${isParticipating ? "bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800" : "bg-copa-green-500 hover:bg-copa-green-600 text-white"}`}
            onClick={(e) => { e.stopPropagation(); onAccess(); }}>
            {isParticipating ? "Acessar" : "Participar"}<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [privados, setPrivados] = useState<Bolao[]>([]);
  const [pendingBolaoIds, setPendingBolaoIds] = useState<Set<string>>(new Set());
  const [nacionais, setNacionais] = useState<Bolao[]>([]);
  const [participantesCount, setParticipantesCount] = useState<Record<string, number>>({});
  const [userPosicoes, setUserPosicoes] = useState<Record<string, number | null>>({});
  const [userBolaoIds, setUserBolaoIds] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<PendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningBolao, setJoiningBolao] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dismissCount, setDismissCount] = useState(0);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const { showAd, needsAd } = useRewardedAd();
  const { plano: userPlano } = useUserPlan();
  const [regrasModal, setRegrasModal] = useState<string | null>(null);
  const [userEstado, setUserEstado] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userBannerCtx, setUserBannerCtx] = useState<UserBannerContext | undefined>(undefined);
  const [upsellModal, setUpsellModal] = useState<{ open: boolean; reason: UpsellReason }>({ open: false, reason: "grupo_lotado" });

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    try {
      if (!user) { setLoading(false); return; }

      const { data: profileData } = await supabase.from("profiles").select("estado").eq("id", user.id).single();
      setUserEstado(profileData?.estado || null);

      const { data: participacoes } = await supabase.from("bolao_participantes").select("bolao_id, posicao_ranking, status, boloes(*, campeonatos(*))").eq("user_id", user.id).neq("status", "recusado");
      const privList: Bolao[] = [];
      const posicoes: Record<string, number | null> = {};
      const participandoIds = new Set<string>();
      const pendingIds = new Set<string>();

      (participacoes || []).forEach((p: any) => {
        participandoIds.add(p.bolao_id);
        if (p.status === "pendente") pendingIds.add(p.bolao_id);
        if (p.boloes && !p.boloes.is_nacional && !BOLOES_ARQUIVADOS.has(p.boloes.id)) {
          privList.push(p.boloes);
          posicoes[p.boloes.id] = p.posicao_ranking;
        }
      });

      const sorted = sortByOrder(privList, loadSavedOrder());
      setPrivados(sorted);
      setUserPosicoes(posicoes);
      setUserBolaoIds(participandoIds);
      setPendingBolaoIds(pendingIds);

      if (participandoIds.size === 0 && !isOnboardingDone()) {
        setShowOnboarding(true);
      }

      setLoading(false);

      const privCountPromises = privList.map(async (b) => {
        const { count } = await supabase.from("bolao_participantes").select("*", { count: "exact", head: true }).eq("bolao_id", b.id).eq("status", "ativo");
        return [b.id, count || 0] as [string, number];
      });
      const privResults = await Promise.all(privCountPromises);
      setParticipantesCount((prev) => ({ ...prev, ...Object.fromEntries(privResults) }));

      await loadAlerts();
    } catch {} finally { setLoading(false); }
  };

  const loadAlerts = async () => {
    if (!user) return;
    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const cutoff = new Date(now.getTime() + 10 * 60 * 1000);
    const { data: participacoes } = await supabase.from("bolao_participantes").select("bolao_id, boloes(nome, campeonato_id)").eq("user_id", user.id).eq("status", "ativo");
    if (!participacoes || participacoes.length === 0) return;
    const pendingAlerts: PendingAlert[] = [];
    for (const p of participacoes) {
      const bolao = p.boloes as any;
      if (!bolao?.campeonato_id) continue;
      const { data: jogos } = await supabase.from("jogos").select("id, time_a, time_b, data_hora, status, campeonato_id").eq("campeonato_id", bolao.campeonato_id).eq("status", "agendado").gt("data_hora", cutoff.toISOString()).lte("data_hora", in12h.toISOString());
      if (!jogos || jogos.length === 0) continue;
      const jogoIds = jogos.map((j: any) => j.id);
      const { data: palpites } = await supabase.from("palpites").select("jogo_id").eq("user_id", user.id).eq("bolao_id", p.bolao_id).in("jogo_id", jogoIds);
      const done = new Set((palpites || []).map((pp: any) => pp.jogo_id));
      for (const jogo of jogos) {
        if (!done.has((jogo as any).id)) {
          const hrs = Math.max(1, Math.round((new Date((jogo as any).data_hora).getTime() - now.getTime()) / (1000 * 60 * 60)));
          pendingAlerts.push({ id: `${p.bolao_id}-${(jogo as any).id}`, bolaoId: p.bolao_id, bolaoNome: bolao.nome, jogoId: (jogo as any).id, jogo: `${(jogo as any).time_a} vs ${(jogo as any).time_b}`, horasRestantes: hrs });
        }
      }
    }
    setAlerts(pendingAlerts);
  };

  const ensureProfile = async () => {
    if (!user) return false;
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
    if (!profile) {
      const { error } = await supabase.from("profiles").insert({ id: user.id, nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário", email: user.email || "" });
      if (error && error.code !== "23505") return false;
    }
    return true;
  };

  const visibleAlerts = dismissCount >= 2 ? [] : alerts.filter((a) => !dismissedAlerts.has(a.id));

  const FREE_MAX_PRIVADOS = CONST_FREE_MAX_PRIVADOS;
  const FREE_MAX_CRIAR = CONST_FREE_MAX_CRIAR;
  const isFree = !userPlano || userPlano === "free";
  const atingiuLimitePrivados = isFree && user && privados.length >= FREE_MAX_PRIVADOS;

  const checkBolaoCapacity = async (bolaoId: string): Promise<boolean> => {
    const { count } = await supabase.from("bolao_participantes").select("*", { count: "exact", head: true }).eq("bolao_id", bolaoId).eq("status", "ativo");
    const currentCount = count || 0;
    const { data: participants } = await supabase.from("bolao_participantes").select("user_id, profiles(plano)").eq("bolao_id", bolaoId).eq("status", "ativo");
    const { data: bolaoData } = await supabase.from("boloes").select("criador_id, profiles(plano)").eq("id", bolaoId).single();
    const allPlanos = [...(participants || []).map((p: any) => p.profiles?.plano), bolaoData?.profiles?.plano];
    const hasProMember = allPlanos.includes("premium_pro");
    const hasPremiumMember = hasProMember || allPlanos.includes("premium");
    const maxCapacity = hasProMember ? PREMIUM_PRO_MAX_PARTICIPANTES : hasPremiumMember ? PREMIUM_MAX_PARTICIPANTES : FREE_MAX_PARTICIPANTES;
    if (currentCount >= maxCapacity) { setUpsellModal({ open: true, reason: "grupo_lotado" }); return false; }
    return true;
  };

  const handleEntrarPorCodigo = async () => {
    if (!codigoInput.trim()) { toast.error("Informe o código do grupo"); return; }
    if (!user) return;
    if (atingiuLimitePrivados) { setUpsellModal({ open: true, reason: "privado_limite" }); navigate("/planos"); return; }
    if (needsAd) { const adResult = await showAd("entrar"); if (!adResult) return; }
    setJoiningByCode(true);
    try {
      await ensureProfile();
      const { data: bolao } = await supabase.from("boloes").select("id, nome, aprovacao_entrada, is_nacional").eq("codigo_convite", codigoInput.trim().toUpperCase()).maybeSingle();
      if (!bolao) { toast.error("Código inválido. Verifique e tente novamente."); return; }
      if (!(await checkBolaoCapacity(bolao.id))) return;
      const needsApproval = bolao.aprovacao_entrada && !bolao.is_nacional;
      const { error } = await supabase.from("bolao_participantes").insert({ bolao_id: bolao.id, user_id: user.id, status: needsApproval ? "pendente" : "ativo" });
      if (error) { if (error.code === "23505") { toast.info("Você já está neste grupo!"); navigate(`/bolao/${bolao.id}`); } else throw error; }
      else if (needsApproval) { toast.success("Solicitação enviada! Aguarde a aprovação do moderador."); }
      else { toast.success(`Você entrou no "${bolao.nome}"!`); navigate(`/bolao/${bolao.id}`); }
    } catch (err: any) { toast.error(err.message || "Erro ao entrar no grupo"); } finally { setJoiningByCode(false); }
  };

  const dismissAlert = (e: React.MouseEvent, alertId: string) => { e.stopPropagation(); setDismissedAlerts((prev) => new Set(prev).add(alertId)); setDismissCount((c) => c + 1); };

  const moveBolao = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= privados.length) return;
    const newList = [...privados];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setPrivados(newList);
    saveOrder(newList.map((b) => b.id));
  };

  if (loading) return <LoadingSpinner />;

  if (showOnboarding && user) {
    return createPortal(
      <div data-onboarding="true" className="fixed top-0 left-0 right-0 bottom-0 bg-white overflow-y-auto"
        style={{ zIndex: 99999, paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Onboarding onComplete={() => { setShowOnboarding(false); markOnboardingDone(); loadData(); }} />
      </div>,
      document.body
    );
  }

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Jogador";

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead title="Bolão da Galera" description="Crie grupos e dispute com amigos!" path="/home" />

      <div className="text-center pt-2">
        <img src="https://dtfqmxmmbbfmfpouzqzt.supabase.co/storage/v1/object/public/iconesapp/BolaoDaGalera%20-%20sem%20fundo.png"
          alt="Bolão da Galera" className="w-16 h-16 mx-auto mb-2 object-contain" />
        <h1 className="text-xl font-bold text-foreground">Bem-vindo, {userName}!</h1>
        <p className="text-sm text-muted-foreground">Qual seu palpite hoje?</p>
      </div>

      <div className="space-y-3">
        <button onClick={() => navigate("/quiz")}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:shadow-md active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}>
          <span className="text-3xl flex-shrink-0">🧠</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-white">Quiz do Dia</p>
            <p className="text-[11px] text-white/60">Descubra qual lenda, seleção ou jogador você seria</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
        </button>

        <button onClick={() => {
            const texto = "⚽ Bora criar um grupo? Baixa o Bolão da Galera!\n\nhttps://bolaodagalera-ten.vercel.app";
            if (navigator.share) { navigator.share({ title: "Bolão da Galera", text: texto }).catch(() => {}); }
            else { navigator.clipboard.writeText(texto).then(() => toast.success("Link copiado!")).catch(() => {}); }
          }}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:shadow-md active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #92400e 0%, #b45309 100%)" }}>
          <span className="text-3xl flex-shrink-0">📣</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-white">Convide a Galera</p>
            <p className="text-[11px] text-white/60">Mande o link para o grupo e desafie seus amigos</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
        </button>
      </div>

      <FeedbackBanner />

      {user && (
        <>
          {visibleAlerts.length > 0 && (
            <div className="space-y-2">
              {visibleAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} onClick={() => navigate(`/bolao/${alert.bolaoId}/palpites?jogo=${alert.jogoId}`)}
                  className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800 truncate">{alert.jogo}</p>
                    <p className="text-xs text-amber-600">{alert.bolaoNome} • Fecha 10min antes do jogo</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-200/60 rounded-lg px-2 py-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-amber-700" /><span className="text-xs font-bold text-amber-700">{alert.horasRestantes}h</span>
                  </div>
                  <button onClick={(e) => dismissAlert(e, alert.id)} className="w-6 h-6 rounded-full hover:bg-amber-200 flex items-center justify-center flex-shrink-0 transition-colors">
                    <X className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-foreground">Meus Grupos</h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe seus grupos</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate("/criar")} className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl text-xs sm:text-sm px-2 sm:px-4">
              <PlusCircle className="w-4 h-4 mr-1.5 flex-shrink-0" /> Criar grupo
            </Button>
            <Button variant="outline" onClick={() => setShowCodeInput(!showCodeInput)}
              className={`h-12 font-semibold rounded-xl text-xs sm:text-sm px-2 sm:px-4 ${showCodeInput ? "border-copa-gold-400 text-copa-gold-600 bg-copa-gold-50" : "border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50"}`}>
              <Keyboard className="w-4 h-4 mr-1.5 flex-shrink-0" /> Entrar por código
            </Button>
          </div>

          {showCodeInput && (
            <Card className="rounded-2xl shadow-sm border-copa-gold-300 bg-copa-gold-50 animate-fade-in">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <input placeholder="Código do grupo" value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEntrarPorCodigo(); }}
                    className="h-11 rounded-xl bg-white min-w-0 flex-1 font-mono text-center tracking-widest text-lg px-3 border border-gray-200 focus:border-copa-green-500 focus:outline-none"
                    maxLength={6} autoFocus />
                  <Button onClick={handleEntrarPorCodigo} disabled={joiningByCode}
                    className="h-11 px-4 flex-shrink-0 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl">
                    {joiningByCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1" /> Entrar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-500" />
              <h3 className="text-base font-bold">Grupos Privados</h3>
              {isFree && user && (
                <span className="text-xs text-muted-foreground">({privados.length}/{FREE_MAX_PRIVADOS})</span>
              )}
            </div>

            {atingiuLimitePrivados && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Limite atingido</p>
                  <p className="text-xs text-amber-600">Você atingiu o máximo de {FREE_MAX_PRIVADOS} grupos privados no plano Free.</p>
                </div>
                <Button size="sm" onClick={() => navigate("/planos")}
                  className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-lg flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 mr-1" /> Upgrade
                </Button>
              </div>
            )}

            {privados.length > 0 ? (
              <div className="space-y-4">
                {privados.map((b, i) => (
                  <BolaoCard key={b.id} bolao={b} participantes={participantesCount[b.id] || 0}
                    posicao={userPosicoes[b.id] || null} isParticipating={true}
                    isPending={pendingBolaoIds.has(b.id)}
                    onAccess={() => { if (!pendingBolaoIds.has(b.id)) navigate(`/bolao/${b.id}`); }}
                    onInfoClick={() => setRegrasModal(b.modo_pontuacao || null)}
                    imgFallback={FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
                    canMoveUp={i > 0} canMoveDown={i < privados.length - 1}
                    onMoveUp={() => moveBolao(i, "up")} onMoveDown={() => moveBolao(i, "down")} />
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-dashed border-2 border-copa-green-200 bg-copa-green-50/30">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-14 h-14 bg-copa-green-100 rounded-full flex items-center justify-center mb-3">
                    <LogIn className="w-6 h-6 text-copa-green-500" />
                  </div>
                  <h4 className="font-bold text-foreground mb-1">Nenhum grupo privado</h4>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs">Crie seu próprio grupo ou entre em um com código de convite</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate("/criar")} className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg">
                      <PlusCircle className="w-4 h-4 mr-1" /> Criar grupo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCodeInput(true)} className="border-copa-green-300 text-copa-green-600 font-semibold rounded-lg">
                      <Keyboard className="w-4 h-4 mr-1" /> Entrar por código
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <RegrasModal regras={regrasModal ? MODO_REGRAS[regrasModal] || null : null} open={!!regrasModal} onClose={() => setRegrasModal(null)} />
      <PremiumUpsellModal open={upsellModal.open} onClose={() => setUpsellModal({ ...upsellModal, open: false })} reason={upsellModal.reason} />
    </div>
  );
};

export default Home;

