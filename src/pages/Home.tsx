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

// ID do bolão do Paulistão (promoção R$200)
const PAULISTAO_BOLAO_ID = "71851d2a-88fa-4ec4-a780-7c1e450869ef";

interface ProximoJogo {
  time_a: string; time_b: string;
  logo_time_a: string | null; logo_time_b: string | null;
  data_hora: string; fase: string | null; rodada: string | null;
}

interface PendingAlert {
  id: string; bolaoId: string; bolaoNome: string;
  jogoId: string; jogo: string; horasRestantes: number;
}

/* ─── Persistir ordem ─── */
const STORAGE_KEY = "bolao_order_privados";
const loadSavedOrder = (): string[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const saveOrder = (ids: string[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {} };
const sortByOrder = (boloes: Bolao[], savedOrder: string[]): Bolao[] => {
  if (savedOrder.length === 0) return boloes;
  const m = new Map(savedOrder.map((id, i) => [id, i]));
  return [...boloes].sort((a, b) => (m.get(a.id) ?? 999) - (m.get(b.id) ?? 999));
};

/* ─── BolaoCard ─── */
const BolaoCard = ({
  bolao, participantes, posicao, isParticipating, onAccess, onInfoClick, imgFallback,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
}: {
  bolao: Bolao; participantes: number; posicao: number | null;
  isParticipating?: boolean; onAccess: () => void; onInfoClick?: () => void; imgFallback: string;
  canMoveUp?: boolean; canMoveDown?: boolean;
  onMoveUp?: () => void; onMoveDown?: () => void;
}) => (
  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
    <div className="relative h-36 overflow-hidden cursor-pointer" onClick={onAccess}>
      <img src={bolao.imagem_url || imgFallback} alt={bolao.nome} className="w-full h-full object-cover"
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
        <Button size="sm"
          className={`font-semibold rounded-lg ${isParticipating ? "bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800" : "bg-copa-green-500 hover:bg-copa-green-600 text-white"}`}
          onClick={(e) => { e.stopPropagation(); onAccess(); }}>
          {isParticipating ? "Acessar" : "Participar"}<ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

/* ─── NacionalCard ─── */
const NacionalCard = ({
  bolao, participantes, proximoJogo, isParticipando, onEntrar, onAcessar, onInfoClick, imgFallback, joining,
}: {
  bolao: Bolao; participantes: number; proximoJogo: ProximoJogo | null;
  isParticipando: boolean; onEntrar: () => void; onAcessar: () => void;
  onInfoClick?: () => void; imgFallback: string; joining: boolean;
}) => (
  <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all rounded-2xl">
    <div className="relative h-40 overflow-hidden cursor-pointer" onClick={isParticipando ? onAcessar : undefined}>
      <img src={bolao.imagem_url || imgFallback} alt={bolao.nome} className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = imgFallback; }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {(bolao.campeonatos as any)?.logo_url && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-1.5">
          <img src={(bolao.campeonatos as any).logo_url} alt="" className="w-6 h-6 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="absolute bottom-3 left-4 right-4">
        <h3 className="text-white font-bold text-lg leading-tight">{bolao.nome}</h3>
        <p className="text-white/70 text-xs mt-0.5">{bolao.descricao}</p>
      </div>
    </div>
    <CardContent className="p-4 space-y-3">
      {proximoJogo ? (
        <div className="bg-muted/50 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3 h-3 text-copa-green-500" />
            <span className="text-[10px] font-semibold text-copa-green-600 uppercase tracking-wide">Próximo jogo</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {proximoJogo.logo_time_a && <img src={proximoJogo.logo_time_a} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              <span className="text-xs font-semibold truncate">{proximoJogo.time_a}</span>
              <span className="text-[10px] text-muted-foreground font-bold">vs</span>
              <span className="text-xs font-semibold truncate">{proximoJogo.time_b}</span>
              {proximoJogo.logo_time_b && <img src={proximoJogo.logo_time_b} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{formatDataJogo(proximoJogo.data_hora)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 rounded-xl px-3 py-2.5 text-center">
          <span className="text-xs text-muted-foreground">Sem jogos agendados no momento</span>
        </div>
      )}
      <div className="flex items-center justify-between">
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
        </div>
        {isParticipando ? (
          <Button size="sm" className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg" onClick={onAcessar}>
            Acessar <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" disabled={joining} className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg disabled:opacity-60" onClick={onEntrar}>
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Participar <ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

/* ─── CountdownStrip: Deadline real baseado no próximo sábado 18h ─── */
const CountdownStrip = () => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const getNextDeadline = () => {
      const now = new Date();
      const target = new Date(now);
      const dayOfWeek = target.getDay();
      const daysUntilSat = dayOfWeek <= 6 ? (6 - dayOfWeek) : 0;
      target.setDate(target.getDate() + (daysUntilSat === 0 && now.getHours() >= 18 ? 7 : daysUntilSat));
      target.setHours(18, 0, 0, 0);
      return target;
    };

    const deadline = getNextDeadline();

    const tick = () => {
      const diff = Math.max(0, deadline.getTime() - Date.now());
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const totalHours = timeLeft.d * 24 + timeLeft.h;
  const isUrgent = totalHours < 12;

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-md ${isUrgent ? "bg-red-600" : "bg-gradient-to-r from-gray-900 to-gray-800"}`}>
      {isUrgent && <div className="absolute inset-0 bg-red-500 animate-pulse opacity-30" />}
      <div className="relative flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isUrgent ? "bg-white animate-pulse" : "bg-copa-gold-400"}`} />
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
            {isUrgent ? "Palpites fechando!" : "Palpites fecham em"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {timeLeft.d > 0 && (
            <>
              <div className="bg-white/10 rounded px-2 py-1 min-w-[32px] text-center">
                <span className="text-sm font-black text-white tabular-nums">{timeLeft.d}</span>
                <span className="text-[8px] text-white/50 ml-0.5">d</span>
              </div>
              <span className="text-white/30 text-xs font-bold">:</span>
            </>
          )}
          <div className="bg-white/10 rounded px-2 py-1 min-w-[32px] text-center">
            <span className="text-sm font-black text-white tabular-nums">{pad(timeLeft.h)}</span>
            <span className="text-[8px] text-white/50 ml-0.5">h</span>
          </div>
          <span className="text-white/30 text-xs font-bold">:</span>
          <div className="bg-white/10 rounded px-2 py-1 min-w-[32px] text-center">
            <span className="text-sm font-black text-white tabular-nums">{pad(timeLeft.m)}</span>
            <span className="text-[8px] text-white/50 ml-0.5">m</span>
          </div>
          <span className="text-white/30 text-xs font-bold">:</span>
          <div className={`rounded px-2 py-1 min-w-[32px] text-center ${isUrgent ? "bg-white/20" : "bg-copa-gold-400/20"}`}>
            <span className={`text-sm font-black tabular-nums ${isUrgent ? "text-white" : "text-copa-gold-400"}`}>{pad(timeLeft.s)}</span>
            <span className="text-[8px] text-white/50 ml-0.5">s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ HOME ═══ */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [privados, setPrivados] = useState<Bolao[]>([]);
  const [nacionais, setNacionais] = useState<Bolao[]>([]);
  const [participantesCount, setParticipantesCount] = useState<Record<string, number>>({});
  const [userPosicoes, setUserPosicoes] = useState<Record<string, number | null>>({});
  const [userBolaoIds, setUserBolaoIds] = useState<Set<string>>(new Set());
  const [proximosJogos, setProximosJogos] = useState<Record<string, ProximoJogo | null>>({});
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

  useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAppleLogin = async () => {
    try {
      trackEvent('Criar_Conta', { metodo: 'apple_home' });
      const result = await signInWithApple("/home");
      if (!result.success && result.error && result.error !== "Login cancelado") {
        navigate("/auth?modo=cadastro");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Apple");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      trackEvent('Criar_Conta', { metodo: 'google_home' });
      const result = await signInWithGoogle("/home");

      if (result.success && Capacitor.isNativePlatform()) {
        toast.success("Login realizado com sucesso!");
        navigate("/home");
      } else if (!result.success && result.error) {
        if (result.error !== "Login cancelado") {
          toast.error(result.error);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login com Google");
    }
  };

  const loadData = async () => {
    try {
      // ═══ DADOS PÚBLICOS (sempre carregam) ═══
      const { data: nac } = await supabase.from("boloes").select("*, campeonatos(*)").eq("is_nacional", true).eq("is_publico", true).order("created_at", { ascending: true });

      let estado: string | null = null;
      const participandoIds = new Set<string>();

      // Ordenar nacionais
      const sortedNac = [...((nac as any[]) || [])].sort((a, b) => {
        const aDestaque = estado && (a.estados_destaque || []).includes(estado) ? 1 : 0;
        const bDestaque = estado && (b.estados_destaque || []).includes(estado) ? 1 : 0;
        return bDestaque - aDestaque;
      });
      setNacionais(sortedNac);

      // ★ GUEST: mostrar conteúdo IMEDIATO — loading false antes das counts
      if (!user) {
        setLoading(false);
      }

      // ═══ DADOS DO USUÁRIO (só se logado) ═══
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("estado").eq("id", user.id).single();
        estado = profileData?.estado || null;
        setUserEstado(estado);

        const { data: participacoes } = await supabase.from("bolao_participantes").select("bolao_id, posicao_ranking, boloes(*, campeonatos(*))").eq("user_id", user.id);
        const privList: Bolao[] = [];
        const posicoes: Record<string, number | null> = {};

        (participacoes || []).forEach((p: any) => {
          participandoIds.add(p.bolao_id);
          if (p.boloes && !p.boloes.is_nacional) {
            privList.push(p.boloes);
            posicoes[p.boloes.id] = p.posicao_ranking;
          }
        });

        const sorted = sortByOrder(privList, loadSavedOrder());
        setPrivados(sorted);
        setUserPosicoes(posicoes);
        setUserBolaoIds(participandoIds);

        // ═══ Contexto para segmentação de banners ═══
        const diasCadastro = user.created_at
          ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        let maxParticipantes = 0;
        let temSolitario = false;
        if (privList.length > 0) {
          const privIds = privList.map(b => b.id);
          const { data: countData } = await supabase
            .from("bolao_participantes")
            .select("bolao_id")
            .in("bolao_id", privIds);
          if (countData) {
            const counts: Record<string, number> = {};
            countData.forEach((p: any) => {
              counts[p.bolao_id] = (counts[p.bolao_id] || 0) + 1;
            });
            maxParticipantes = Math.max(...Object.values(counts), 0);
            const meusBoloesIds = privList.filter(b => b.criador_id === user.id).map(b => b.id);
            temSolitario = meusBoloesIds.some(id => (counts[id] || 0) <= 1);
          }
        }
        setUserBannerCtx({
          diasDesdeCadastro: diasCadastro,
          temBolaoPrivado: privList.length > 0,
          qtdParticipantesMax: maxParticipantes,
          temBolaoSolitario: temSolitario,
        });

        // ═══ ONBOARDING: mostrar para novos usuários sem bolões ═══
        if (participandoIds.size === 0 && !isOnboardingDone()) {
          setShowOnboarding(true);
        }

        // Re-sort nacionais com estado
        if (estado) {
          const resorted = [...((nac as any[]) || [])].sort((a, b) => {
            const aD = (a.estados_destaque || []).includes(estado) ? 1 : 0;
            const bD = (b.estados_destaque || []).includes(estado) ? 1 : 0;
            return bD - aD;
          });
          setNacionais(resorted);
        }

        setLoading(false);

        // Counts para privados — em paralelo
        const privCountPromises = privList.map(async (b) => {
          const { count } = await supabase.from("bolao_participantes").select("*", { count: "exact", head: true }).eq("bolao_id", b.id);
          return [b.id, count || 0] as [string, number];
        });
        const privResults = await Promise.all(privCountPromises);
        setParticipantesCount((prev) => ({ ...prev, ...Object.fromEntries(privResults) }));

        await loadAlerts();
      } else {
        setUserBolaoIds(participandoIds);
      }

      // Counts para nacionais — em paralelo (carrega em background)
      const nacCountPromises = ((nac as any[]) || []).map(async (b) => {
        const { count } = await supabase.from("bolao_participantes").select("*", { count: "exact", head: true }).eq("bolao_id", b.id);
        return [b.id, count || 0] as [string, number];
      });
      const nacResults = await Promise.all(nacCountPromises);
      setParticipantesCount((prev) => ({ ...prev, ...Object.fromEntries(nacResults) }));

      // Próximos jogos — em paralelo
      const proxPromises = ((nac as any[]) || []).map(async (bolao) => {
        if (!bolao.campeonato_id) return [bolao.id, null] as [string, ProximoJogo | null];
        const isFanatico = bolao.modo_pontuacao === "fanatico" && bolao.time_favorito;

        // Buscar todos os campeonatos vinculados (multi-campeonato)
        const { data: bcData } = await supabase
          .from("bolao_campeonatos")
          .select("campeonato_id")
          .eq("bolao_id", bolao.id);
        const campIds = bcData && bcData.length > 0
          ? bcData.map((bc: any) => bc.campeonato_id)
          : [bolao.campeonato_id];

        let query = supabase.from("jogos")
          .select("time_a, time_b, logo_time_a, logo_time_b, data_hora, fase, rodada")
          .in("campeonato_id", campIds).eq("status", "agendado")
          .gte("data_hora", new Date().toISOString())
          .order("data_hora", { ascending: true }).limit(1);
        if (isFanatico) {
          query = query.or(`time_a.eq.${bolao.time_favorito},time_b.eq.${bolao.time_favorito}`);
        }
        const { data: jogos } = await query;
        return [bolao.id, jogos && jogos.length > 0 ? (jogos[0] as any) : null] as [string, ProximoJogo | null];
      });
      const proxResults = await Promise.all(proxPromises);
      setProximosJogos(Object.fromEntries(proxResults));
    } catch {} finally { setLoading(false); }
  };

  const loadAlerts = async () => {
    if (!user) return;
    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const cutoff = new Date(now.getTime() + 10 * 60 * 1000);
    const { data: participacoes } = await supabase.from("bolao_participantes").select("bolao_id, boloes(nome, campeonato_id)").eq("user_id", user.id);
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

  const handleEntrarNacional = async (bolaoId: string) => {
    if (!user) {
      navigate(`/auth?modo=cadastro&bolao=${bolaoId}`);
      return;
    }
    setJoiningBolao(bolaoId);
    try {
      await ensureProfile();
      const { error } = await supabase.from("bolao_participantes").insert({ bolao_id: bolaoId, user_id: user.id });
      if (error) {
        if (error.code === "23505") { toast.info("Você já está participando!"); setUserBolaoIds((prev) => new Set(prev).add(bolaoId)); navigate(`/bolao/${bolaoId}`); }
        else throw error;
      } else { toast.success("Você entrou no bolão!"); setUserBolaoIds((prev) => new Set(prev).add(bolaoId)); setParticipantesCount((prev) => ({ ...prev, [bolaoId]: (prev[bolaoId] || 0) + 1 })); navigate(`/bolao/${bolaoId}`); }
    } catch (err: any) { toast.error(err.message || "Erro ao entrar no bolão"); } finally { setJoiningBolao(null); }
  };

  const visibleAlerts = dismissCount >= 2 ? [] : alerts.filter((a) => !dismissedAlerts.has(a.id));

  // ═══ Limites do plano Free ═══
  const FREE_MAX_PRIVADOS = CONST_FREE_MAX_PRIVADOS;
  const FREE_MAX_CRIAR = CONST_FREE_MAX_CRIAR;
  const isFree = !userPlano || userPlano === "free";
  const atingiuLimitePrivados = isFree && user && privados.length >= FREE_MAX_PRIVADOS;

  const checkBolaoCapacity = async (bolaoId: string): Promise<boolean> => {
    const { count } = await supabase
      .from("bolao_participantes")
      .select("*", { count: "exact", head: true })
      .eq("bolao_id", bolaoId);
    const currentCount = count || 0;
    const { data: participants } = await supabase
      .from("bolao_participantes")
      .select("user_id, profiles(plano)")
      .eq("bolao_id", bolaoId);
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

  const handleEntrarPorCodigo = async () => {
    if (!codigoInput.trim()) { toast.error("Informe o código do bolão"); return; }
    if (!user) return;

    // Bloquear se atingiu limite de privados no plano free
    if (atingiuLimitePrivados) {
      setUpsellModal({ open: true, reason: "privado_limite" });
      navigate("/planos");
      return;
    }

    // Mostrar ad para usuários free
    if (needsAd) {
      const adResult = await showAd("entrar");
      if (!adResult) return;
    }

    setJoiningByCode(true);
    try {
      await ensureProfile();
      const { data: bolao } = await supabase.from("boloes").select("id, nome").eq("codigo_convite", codigoInput.trim().toUpperCase()).maybeSingle();
      if (!bolao) { toast.error("Código inválido. Verifique e tente novamente."); return; }
      if (!(await checkBolaoCapacity(bolao.id))) return;
      const { error } = await supabase.from("bolao_participantes").insert({ bolao_id: bolao.id, user_id: user.id });
      if (error) { if (error.code === "23505") { toast.info("Você já está neste bolão!"); navigate(`/bolao/${bolao.id}`); } else throw error; }
      else { toast.success(`Você entrou no "${bolao.nome}"!`); navigate(`/bolao/${bolao.id}`); }
    } catch (err: any) { toast.error(err.message || "Erro ao entrar no bolão"); } finally { setJoiningByCode(false); }
  };

  const dismissAlert = (e: React.MouseEvent, alertId: string) => { e.stopPropagation(); setDismissedAlerts((prev) => new Set(prev).add(alertId)); setDismissCount((c) => c + 1); };

  /* ─── Reordenar bolões ─── */
  const moveBolao = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= privados.length) return;
    const newList = [...privados];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setPrivados(newList);
    saveOrder(newList.map((b) => b.id));
  };

  if (loading) return <LoadingSpinner />;

  // ═══ ONBOARDING para novos usuários ═══
  if (showOnboarding && user) {
    return createPortal(
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-white overflow-y-auto"
        style={{ zIndex: 99999, paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Onboarding
          onComplete={() => {
            setShowOnboarding(false);
            markOnboardingDone();
            loadData();
          }}
        />
      </div>,
      document.body
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${!user ? "pb-20" : ""}`}>
      <SEOHead
        title="Bolão de Futebol Grátis | Copa 2026, Campeonatos e mais"
        description="Bolão na Copa: crie bolões de futebol grátis e dispute com amigos! Palpites em campeonatos nacionais e internacionais, Champions League e mais. Cadastre-se em 10 segundos."
        path="/home"
        keywords="bolão na copa, bolão da copa, bolão de futebol grátis, palpites futebol, bolão brasileirão 2026, bolão copa do mundo 2026, bolão entre amigos"
      />



      {/* ═══ GUEST: Countdown ═══ */}
      {!user && <CountdownStrip />}

      {/* ═══ BANNERS DINÂMICOS — carrossel ═══ */}
      <DynamicBanner userBolaoIds={userBolaoIds} userContext={userBannerCtx} />



      {/* ═══ GUEST: Login rápido ═══ */}
      {!user && Capacitor.getPlatform() === "ios" && (
        <button
          onClick={handleAppleLogin}
          className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 rounded-xl py-3.5 font-semibold text-sm text-white transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Cadastre-se rápido com Apple
        </button>
      )}
      {!user && Capacitor.getPlatform() !== "ios" && !/FBAN|FBAV|Instagram|Line|TikTok|Snapchat/i.test(navigator.userAgent) && (
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-copa-green-400 hover:shadow-md rounded-xl py-3.5 font-semibold text-sm text-gray-600 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Cadastre-se rápido com Google
        </button>
      )}

      {/* ═══ GUEST: Banner Quiz (dinâmico do Supabase) ═══ */}
      {!user && <QuizBannerCarousel />}

      {/* ═══ FEEDBACK BANNER — aparece após palpitar ═══ */}
      {user && <FeedbackBanner />}


      {/* ═══ CONTEÚDO LOGADO: Alerts + Meus Bolões + Privados ═══ */}
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
              {visibleAlerts.length > 3 && <p className="text-xs text-center text-amber-600 font-medium">+{visibleAlerts.length - 3} palpites pendentes</p>}
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-foreground">Meus Bolões</h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe seus bolões</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate("/criar")} className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl text-xs sm:text-sm px-2 sm:px-4">
              <PlusCircle className="w-4 h-4 mr-1.5 flex-shrink-0" /> Criar bolão
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
              <input placeholder="Código do bolão" value={codigoInput}
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
          <h3 className="text-base font-bold">Bolões Privados</h3>
          {isFree && user && (
            <span className="text-xs text-muted-foreground">({privados.length}/{FREE_MAX_PRIVADOS})</span>
          )}
        </div>

        {/* Aviso de limite atingido */}
        {atingiuLimitePrivados && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Limite atingido</p>
              <p className="text-xs text-amber-600">Você atingiu o máximo de {FREE_MAX_PRIVADOS} bolões privados no plano Free.</p>
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
                onAccess={() => navigate(`/bolao/${b.id}`)}
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
              <h4 className="font-bold text-foreground mb-1">Nenhum bolão privado</h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">Crie seu próprio bolão ou entre em um com código de convite</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate("/criar")} className="bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-semibold rounded-lg">
                  <PlusCircle className="w-4 h-4 mr-1" /> Criar bolão
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

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-2">BOLÕES NACIONAIS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-copa-green-500" />
          <h3 className="text-base font-bold">Bolões Nacionais</h3>
          <span className="text-xs text-muted-foreground">• Abertos para todos</span>
        </div>

        {/* Banner de destaque regional */}
        {(() => {
          const destaque = userEstado ? nacionais.find(b => (b as any).estados_destaque?.includes(userEstado) && !userBolaoIds.has(b.id)) : null;
          if (!destaque) return null;
          return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-copa-green-600 to-copa-green-500 text-white p-4 shadow-lg animate-fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-copa-gold-300" />
                  <span className="text-xs font-bold text-copa-gold-300 uppercase tracking-wider">Recomendado para você</span>
                </div>
                <h4 className="font-bold text-lg">{destaque.nome}</h4>
                <p className="text-white/80 text-xs mt-0.5">{destaque.descricao || "Participe e faça seus palpites!"}</p>
                <Button size="sm" onClick={() => handleEntrarNacional(destaque.id)}
                  disabled={joiningBolao === destaque.id}
                  className="mt-3 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-bold rounded-lg shadow-md">
                  {joiningBolao === destaque.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar agora <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          );
        })()}

        <div className="space-y-4">
          {(user ? nacionais : []).map((b, i) => {
            const isPaulistao = b.id === PAULISTAO_BOLAO_ID;
            const card = (
              <NacionalCard key={b.id} bolao={b} participantes={participantesCount[b.id] || 0}
                proximoJogo={proximosJogos[b.id] || null} isParticipando={userBolaoIds.has(b.id)}
                onEntrar={() => handleEntrarNacional(b.id)} onAcessar={() => navigate(`/bolao/${b.id}`)}
                onInfoClick={() => setRegrasModal(b.modo_pontuacao || null)}
                imgFallback={FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]} joining={joiningBolao === b.id} />
            );

            // Envolver o card do Paulistão com borda dourada
            if (isPaulistao) {
              return (
                <div key={b.id} className="mt-2">
                  <PromoCardBorder>{card}</PromoCardBorder>
                </div>
              );
            }

            return card;
          })}
          {nacionais.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum bolão nacional disponível.</p>}
        </div>
      </div>

      {/* ═══ GUEST: Banner Como Funciona ═══ */}
      {!user && (
        <div onClick={() => { window.location.href = "/como-funciona.html"; }}
          className="relative overflow-hidden rounded-2xl cursor-pointer bg-gradient-to-br from-copa-green-600 to-copa-green-700 p-6 text-white shadow-lg text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
          <div className="relative z-10 space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">🏆</div>
            <h3 className="text-xl font-black">Como funciona o Bolão na Copa?</h3>
            <p className="text-xs max-w-sm" style={{ color: "rgba(255,255,255,.7)" }}>
              Crie bolões, faça palpites nos jogos e dispute com amigos. Ranking automático e 7 modos de pontuação.
            </p>
            <div className="flex items-center gap-2 mt-1 py-2.5 px-6 rounded-xl font-bold text-sm bg-white text-copa-green-700">
              Saiba mais <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      <RegrasModal regras={regrasModal ? MODO_REGRAS[regrasModal] || null : null} open={!!regrasModal} onClose={() => setRegrasModal(null)} />

      {/* ═══ GUEST: Sticky CTA bar no bottom ═══ */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}>
          <div className="container max-w-4xl mx-auto">
            {/* iOS nativo: botão Apple Sign-In */}
            {Capacitor.getPlatform() === "ios" ? (
              <button onClick={handleAppleLogin}
                className="w-full h-11 flex items-center justify-center gap-2 bg-black hover:bg-gray-900 rounded-xl font-semibold text-sm text-white transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Cadastre-se com Apple
              </button>
            ) : !/FBAN|FBAV|Instagram|Line|TikTok|Snapchat/i.test(navigator.userAgent) ? (
              /* Browser normal: dois botões (Google + email) */
              <div className="flex items-center gap-2">
                <button onClick={handleGoogleLogin}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <Button onClick={() => navigate("/auth?modo=cadastro")}
                  className="flex-1 h-10 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-xs rounded-xl shadow-md">
                  Criar conta grátis
                </Button>
              </div>
            ) : (
              /* WebView: botão único destaque */
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">Bolão grátis — R$ 200 em prêmios</p>
                  <p className="text-[10px] text-gray-500">Crie sua conta em segundos</p>
                </div>
                <Button onClick={() => navigate("/auth?modo=cadastro")}
                  className="h-10 px-5 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-xs rounded-xl shadow-md flex-shrink-0">
                  Criar conta grátis
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <PremiumUpsellModal
        open={upsellModal.open}
        onClose={() => setUpsellModal({ ...upsellModal, open: false })}
        reason={upsellModal.reason}
      />
    </div>
  );
};

export default Home;
