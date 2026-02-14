import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle, Keyboard, Users, MapPin, ChevronRight, ChevronUp, ChevronDown, GripVertical,
  Trophy, Globe, LogIn, AlertTriangle, Clock, X, Loader2, Calendar, Search, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RegrasModal from "@/components/RegrasModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import AdRewardModal from "@/components/AdRewardModal";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import type { Bolao } from "@/lib/types";
import { MODO_LABELS, MODO_REGRAS, FALLBACK_IMAGES } from "@/lib/constants";
import { formatDataJogo } from "@/lib/formatters";

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
  const { showAd, resolveWebAd, needsAd } = useRewardedAd();
  const [showAdModal, setShowAdModal] = useState(false);
  const [regrasModal, setRegrasModal] = useState<string | null>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const { data: nac } = await supabase.from("boloes").select("*, campeonatos(*)").eq("is_nacional", true).eq("is_publico", true);
      setNacionais((nac as any[]) || []);

      const { data: participacoes } = await supabase.from("bolao_participantes").select("bolao_id, posicao_ranking, boloes(*, campeonatos(*))").eq("user_id", user!.id);
      const privList: Bolao[] = [];
      const posicoes: Record<string, number | null> = {};
      const participandoIds = new Set<string>();

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

      const allBolaoIds = [...(nac || []).map((b: any) => b.id), ...privList.map((b) => b.id)];
      const counts: Record<string, number> = {};
      for (const bid of allBolaoIds) {
        const { count } = await supabase.from("bolao_participantes").select("*", { count: "exact", head: true }).eq("bolao_id", bid);
        counts[bid] = count || 0;
      }
      setParticipantesCount(counts);

      const proximos: Record<string, ProximoJogo | null> = {};
      for (const bolao of (nac as any[]) || []) {
        if (!bolao.campeonato_id) { proximos[bolao.id] = null; continue; }
        const { data: jogos } = await supabase.from("jogos")
          .select("time_a, time_b, logo_time_a, logo_time_b, data_hora, fase, rodada")
          .eq("campeonato_id", bolao.campeonato_id).eq("status", "agendado")
          .gte("data_hora", new Date().toISOString())
          .order("data_hora", { ascending: true }).limit(1);
        proximos[bolao.id] = jogos && jogos.length > 0 ? (jogos[0] as any) : null;
      }
      setProximosJogos(proximos);
      await loadAlerts();
    } catch (err) { console.error("Erro ao carregar dados:", err); }
    finally { setLoading(false); }
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
      const { data: jogos } = await supabase.from("jogos").select("*").eq("campeonato_id", bolao.campeonato_id).eq("status", "agendado").gt("data_hora", cutoff.toISOString()).lte("data_hora", in12h.toISOString());
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
      if (error && error.code !== "23505") { console.error("Erro ao criar perfil:", error); return false; }
    }
    return true;
  };

  const handleEntrarNacional = async (bolaoId: string) => {
    if (!user) return;
    setJoiningBolao(bolaoId);
    try {
      await ensureProfile();
      const { error } = await supabase.from("bolao_participantes").insert({ bolao_id: bolaoId, user_id: user.id });
      if (error) {
        if (error.code === "23505") { toast.info("Você já está participando!"); setUserBolaoIds((prev) => new Set(prev).add(bolaoId)); navigate(`/bolao/${bolaoId}`); }
        else throw error;
      } else { toast.success("Você entrou no bolão!"); setUserBolaoIds((prev) => new Set(prev).add(bolaoId)); setParticipantesCount((prev) => ({ ...prev, [bolaoId]: (prev[bolaoId] || 0) + 1 })); navigate(`/bolao/${bolaoId}`); }
    } catch (err: any) { toast.error(err.message || "Erro ao entrar no bolão"); }
    finally { setJoiningBolao(null); }
  };

  const visibleAlerts = dismissCount >= 2 ? [] : alerts.filter((a) => !dismissedAlerts.has(a.id));

  const handleEntrarPorCodigo = async () => {
    if (!codigoInput.trim()) { toast.error("Informe o código do bolão"); return; }
    if (!user) return;

    // Mostrar ad para usuários free
    if (needsAd) {
      setShowAdModal(true);
      const adResult = await showAd("entrar");
      setShowAdModal(false);
      if (!adResult) return;
    }

    setJoiningByCode(true);
    try {
      await ensureProfile();
      const { data: bolao } = await supabase.from("boloes").select("id, nome").eq("codigo_convite", codigoInput.trim().toUpperCase()).maybeSingle();
      if (!bolao) { toast.error("Código inválido. Verifique e tente novamente."); return; }
      const { error } = await supabase.from("bolao_participantes").insert({ bolao_id: bolao.id, user_id: user.id });
      if (error) { if (error.code === "23505") { toast.info("Você já está neste bolão!"); navigate(`/bolao/${bolao.id}`); } else throw error; }
      else { toast.success(`Você entrou no "${bolao.nome}"!`); navigate(`/bolao/${bolao.id}`); }
    } catch (err: any) { toast.error(err.message || "Erro ao entrar no bolão"); }
    finally { setJoiningByCode(false); }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <AdRewardModal open={showAdModal} onComplete={resolveWebAd} message="Assista para entrar no bolão" />
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

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => navigate("/criar")} className="h-12 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50 font-semibold rounded-xl">
          <PlusCircle className="w-4 h-4 mr-2" /> Criar novo bolão
        </Button>
        <Button variant="outline" onClick={() => setShowCodeInput(!showCodeInput)}
          className={`h-12 font-semibold rounded-xl ${showCodeInput ? "border-copa-gold-400 text-copa-gold-600 bg-copa-gold-50" : "border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50"}`}>
          <Keyboard className="w-4 h-4 mr-2" /> Entrar por código
        </Button>
      </div>

      {showCodeInput && (
        <Card className="rounded-2xl shadow-sm border-copa-gold-300 bg-copa-gold-50 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <input placeholder="Insira o código do bolão" value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleEntrarPorCodigo(); }}
                className="h-11 rounded-xl bg-white flex-1 font-mono text-center tracking-widest text-lg px-4 border border-gray-200 focus:border-copa-green-500 focus:outline-none"
                maxLength={6} autoFocus />
              <Button onClick={handleEntrarPorCodigo} disabled={joiningByCode}
                className="h-11 px-6 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-xl">
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
        </div>
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
        <div className="space-y-4">
          {nacionais.map((b, i) => (
            <NacionalCard key={b.id} bolao={b} participantes={participantesCount[b.id] || 0}
              proximoJogo={proximosJogos[b.id] || null} isParticipando={userBolaoIds.has(b.id)}
              onEntrar={() => handleEntrarNacional(b.id)} onAcessar={() => navigate(`/bolao/${b.id}`)}
              onInfoClick={() => setRegrasModal(b.modo_pontuacao || null)}
              imgFallback={FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]} joining={joiningBolao === b.id} />
          ))}
          {nacionais.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum bolão nacional disponível.</p>}
        </div>
      </div>

      <RegrasModal regras={regrasModal ? MODO_REGRAS[regrasModal] || null : null} open={!!regrasModal} onClose={() => setRegrasModal(null)} />
    </div>
  );
};

export default Home;
