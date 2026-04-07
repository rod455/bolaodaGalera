import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Lock, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, Heart, Copy, Check, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import AdLoadingOverlay from "@/components/AdLoadingOverlay";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import type { Jogo, Palpite } from "@/lib/types";
import { FASE_ORDER } from "@/lib/constants";
import { traduzirFase, formatDataJogo, rodadaNum } from "@/lib/formatters";
import SEOHead from "@/components/SEOHead";
import { useGamification } from "@/hooks/useGamification";
import XPToast from "@/components/XPToast";
import { trackEvent } from "@/lib/analytics";
import { triggerFeedback } from "@/components/FeedbackBanner";
import FirstPalpiteCelebration from "@/components/FirstPalpiteCelebration";

interface PalpiteDB extends Palpite { id: string; }

const FASES_AGRUPADAS: string[] = ["Final", "Terceiro Lugar"];
const getTabKey = (jogo: Jogo): string => {
  // traduzirFase converte EN→PT; se já estiver em PT, usa direto
  const faseTrad = traduzirFase(jogo.fase) || jogo.fase || "";
  if (!jogo.rodada) return faseTrad || "Outros";
  if (FASES_AGRUPADAS.includes(faseTrad)) return faseTrad;
  return `${faseTrad} – ${jogo.rodada}`;
};

const Palpites = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const scrollTargetRef = useRef<string | null>(searchParams.get("jogo"));

  const [bolaoNome, setBolaoNome] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [palpitesDB, setPalpitesDB] = useState<Record<string, PalpiteDB>>({});
  const [palpitesLocal, setPalpitesLocal] = useState<Record<string, { a: number; b: number }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLeague, setIsLeague] = useState(false);
  const [rodadas, setRodadas] = useState<string[]>([]);
  const [fases, setFases] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("Todos");
  const [timeFavorito, setTimeFavorito] = useState<string | null>(null);
  const [isFanatico, setIsFanatico] = useState(false);
  const [campeonatosList, setCampeonatosList] = useState<{id: string; nome: string}[]>([]);
  const [activeCampeonato, setActiveCampeonato] = useState<string>("Todos");
  const { showAd, adLoading, needsAd } = useRewardedAd();
  const { darXP } = useGamification();
  const [xpToast, setXPToast] = useState<{xp: number, msg: string} | null>(null);

  // ═══ Celebração primeiro palpite (onboarding) ═══
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    bolaoCode: string; palpiteResumo: string;
  } | null>(null);
  const isFirstTime = searchParams.get("firstTime") === "true";
  const firstPalpiteDone = useRef(false);

  // ═══ Copiar palpite para outros bolões ═══
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyBoloes, setCopyBoloes] = useState<{id: string; nome: string; jaTemPalpite: boolean; temJogo: boolean; palpiteAtual?: string}[]>([]);
  const [copyingBoloes, setCopyingBoloes] = useState<Record<string, "idle" | "loading" | "done">>({});
  const [pendingCopy, setPendingCopy] = useState<{jogoId: string; placarA: number; placarB: number; timeA: string; timeB: string} | null>(null);

  const checkOutrosBoloes = async (jogoId: string, placarA: number, placarB: number) => {
    if (!user) return;

    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    // Buscar todos os bolões que o usuário participa
    const { data: participacoes } = await supabase
      .from("bolao_participantes")
      .select("bolao_id, boloes(id, nome)")
      .eq("user_id", user.id);

    if (!participacoes || participacoes.length <= 1) return;

    // Outros bolões (excluindo o atual)
    const outrosBoloes = (participacoes || [])
      .filter((p: any) => p.boloes && p.boloes.id !== id)
      .map((p: any) => ({ bolaoId: p.boloes.id, nome: p.boloes.nome }));

    if (outrosBoloes.length === 0) return;

    // Buscar jogos iguais (mesmo time_a + time_b + data)
    const { data: jogosIguais } = await supabase
      .from("jogos")
      .select("id, campeonato_id")
      .eq("time_a", jogo.time_a)
      .eq("time_b", jogo.time_b)
      .eq("data_hora", jogo.data_hora);

    const jogoIdsIguais = (jogosIguais || []).map(j => j.id);

    // Para cada bolão, verificar se tem o jogo e se já tem palpite
    const boloesResult: {id: string; nome: string; jaTemPalpite: boolean; temJogo: boolean; palpiteAtual?: string}[] = [];

    for (const ob of outrosBoloes) {
      // Checar campeonatos do bolão
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", ob.bolaoId);

      const campIds = (bcData || []).map((bc: any) => bc.campeonato_id);
      const temJogo = jogosIguais ? jogosIguais.some(j => campIds.includes(j.campeonato_id)) : false;

      let jaTemPalpite = false;
      let palpiteAtual: string | undefined = undefined;
      if (temJogo && jogoIdsIguais.length > 0) {
        const { data: palpExist } = await supabase
          .from("palpites")
          .select("id, placar_a, placar_b")
          .eq("user_id", user.id)
          .eq("bolao_id", ob.bolaoId)
          .in("jogo_id", jogoIdsIguais)
          .limit(1);
        jaTemPalpite = (palpExist && palpExist.length > 0) || false;
        if (jaTemPalpite && palpExist && palpExist[0]) {
          palpiteAtual = `${palpExist[0].placar_a} x ${palpExist[0].placar_b}`;
        }
      }

      boloesResult.push({
        id: ob.bolaoId,
        nome: ob.nome,
        jaTemPalpite,
        temJogo,
        palpiteAtual,
      });
    }

    setPendingCopy({ jogoId, placarA, placarB, timeA: jogo.time_a, timeB: jogo.time_b });
    setCopyBoloes(boloesResult);
    setCopyingBoloes(Object.fromEntries(boloesResult.map(b => [b.id, "idle" as const])));
    setShowCopyDialog(true);
  };

  const copiarPalpiteParaBolao = async (bolaoId: string) => {
    if (!user || !pendingCopy) return;

    setCopyingBoloes(prev => ({ ...prev, [bolaoId]: "loading" }));

    try {
      // Encontrar o jogo_id correto nesse bolão
      const jogo = jogos.find(j => j.id === pendingCopy.jogoId);
      if (!jogo) return;

      const { data: jogosIguais } = await supabase
        .from("jogos")
        .select("id")
        .eq("time_a", jogo.time_a)
        .eq("time_b", jogo.time_b)
        .eq("data_hora", jogo.data_hora);

      if (!jogosIguais || jogosIguais.length === 0) return;
      const jogoIdsIguais = jogosIguais.map(j => j.id);

      // Upsert palpite para cada jogo igual nesse bolão
      for (const jogoId of jogoIdsIguais) {
        const { data: existing } = await supabase
          .from("palpites")
          .select("id")
          .eq("user_id", user.id)
          .eq("bolao_id", bolaoId)
          .eq("jogo_id", jogoId)
          .single();

        if (existing) {
          await supabase.from("palpites")
            .update({ placar_time_a: pendingCopy.placarA, placar_time_b: pendingCopy.placarB })
            .eq("id", existing.id);
        } else {
          await supabase.from("palpites")
            .insert({
              jogo_id: jogoId,
              bolao_id: bolaoId,
              user_id: user.id,
              placar_time_a: pendingCopy.placarA,
              placar_time_b: pendingCopy.placarB,
            });
        }
      }

      setCopyingBoloes(prev => ({ ...prev, [bolaoId]: "done" }));

      // Gamificação: XP por palpite copiado
      darXP("palpite", 5, `${pendingCopy.jogoId}-${bolaoId}`);
    } catch (err) {
      toast.error("Erro ao copiar palpite");
      setCopyingBoloes(prev => ({ ...prev, [bolaoId]: "idle" }));
    }
  };

  const copiarParaTodos = async () => {
    const novo = pendingCopy ? `${pendingCopy.placarA} x ${pendingCopy.placarB}` : "";
    const boloesParaCopiar = copyBoloes.filter(b => {
      const igual = b.jaTemPalpite && b.palpiteAtual === novo;
      return b.temJogo && !igual && copyingBoloes[b.id] !== "done";
    });
    for (const b of boloesParaCopiar) {
      await copiarPalpiteParaBolao(b.id);
    }
    setTimeout(() => {
      setShowCopyDialog(false);
      toast.success("Palpites atualizados!");
    }, 500);
  };

  useEffect(() => {
    if (id && user) loadData().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    if (!loading && scrollTargetRef.current) {
      const jogoId = scrollTargetRef.current;
      scrollTargetRef.current = null;
      setTimeout(() => {
        const el = document.getElementById(`jogo-${jogoId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-copa-gold-400", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-copa-gold-400", "ring-offset-2"), 3000);
        }
      }, 200);
    }
  }, [loading]);

  const loadData = async () => {
    try {
      const { data: bolao } = await supabase
        .from("boloes").select("nome, campeonato_id, modo_pontuacao, time_favorito, campeonatos(tipo)")
        .eq("id", id).single();
      if (!bolao) { toast.error("Bolão não encontrado"); navigate(`/bolao/${id}`); return; }
      setBolaoNome(bolao.nome);

      const tipo = (bolao.campeonatos as any)?.tipo;
      const leagueMode = tipo === "nacional" || tipo === "estadual";
      setIsLeague(leagueMode);

      const fanaticoMode = bolao.modo_pontuacao === "fanatico";
      setIsFanatico(fanaticoMode);

      const bolaoTimeFavorito = fanaticoMode ? (bolao as any).time_favorito || null : null;
      setTimeFavorito(bolaoTimeFavorito);

      // Buscar campeonatos vinculados (multi ou legacy)
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", id!);

      const campIds = bcData && bcData.length > 0
        ? bcData.map((bc: any) => bc.campeonato_id)
        : bolao.campeonato_id ? [bolao.campeonato_id] : [];

      if (campIds.length === 0) { toast.error("Nenhum campeonato vinculado"); setLoading(false); navigate(`/bolao/${id}`); return; }

      // Buscar nomes dos campeonatos (para filtro quando multi-campeonato)
      if (campIds.length > 1) {
        const { data: campData } = await supabase
          .from("campeonatos").select("id, nome_popular").in("id", campIds);
        if (campData && campData.length > 1) {
          setCampeonatosList(campData.map((c: any) => ({ id: c.id, nome: c.nome_popular })));
        }
      }

      const { data: allGames } = await supabase
        .from("jogos").select("*").in("campeonato_id", campIds)
        .order("data_hora", { ascending: true });

      let uniqueJogos = (allGames || []) as Jogo[];

      if (fanaticoMode && bolaoTimeFavorito) {
        uniqueJogos = uniqueJogos.filter(
          (j) => j.time_a === bolaoTimeFavorito || j.time_b === bolaoTimeFavorito
        );
      }
      setJogos(uniqueJogos);

      const targetJogoId = searchParams.get("jogo");

      if (leagueMode) {
        // Verificar se é campeonato misto (tem fases mata-mata além de rodadas normais)
        const KNOCKOUT_FASES_EN = ["SEMI_FINALS", "SEMI_FINAL", "FINAL", "QUARTER_FINALS", "QUARTER_FINAL"];
        const KNOCKOUT_FASES_PT = ["Semifinal", "Final", "Quartas de Final"];
        const hasKnockout = uniqueJogos.some((j) => j.fase && (
          KNOCKOUT_FASES_EN.includes(j.fase) || KNOCKOUT_FASES_PT.includes(j.fase)
        ));
        
        if (hasKnockout) {
          // Modo misto: usar getTabKey como campeonatos de copa
          const tabSet = new Set<string>();
          uniqueJogos.forEach((j) => tabSet.add(getTabKey(j)));
          const sortedTabs = Array.from(tabSet).sort((a, b) => {
            const faseA = a.split(" – ")[0]; const faseB = b.split(" – ")[0];
            const ia = FASE_ORDER.indexOf(faseA); const ib = FASE_ORDER.indexOf(faseB);
            const orderA = ia === -1 ? 99 : ia; const orderB = ib === -1 ? 99 : ib;
            if (orderA !== orderB) return orderA - orderB;
            return a.includes("Ida") && !b.includes("Ida") ? -1 : !a.includes("Ida") && b.includes("Ida") ? 1 : 0;
          });
          // Reordenar: fases com jogos futuros primeiro, passadas ao final
          const fasesComFuturo = sortedTabs.filter((tab) =>
            uniqueJogos.some((j) => getTabKey(j) === tab && (j.status === "agendado" || j.status === "ao_vivo"))
          );
          const fasesSoPassado = sortedTabs.filter((tab) =>
            !uniqueJogos.some((j) => getTabKey(j) === tab && (j.status === "agendado" || j.status === "ao_vivo"))
          );
          setFases(["Todos", ...fasesComFuturo, ...fasesSoPassado]);
          setIsLeague(false); // Tratar como copa para UI de tabs
          if (targetJogoId) {
            const tj = uniqueJogos.find((j) => j.id === targetJogoId);
            setActiveTab(tj ? getTabKey(tj) : "Todos");
          } else { setActiveTab("Todos"); }
        } else {
          // Modo liga puro: usar rodadas
          const rodadaSet = new Set<string>();
          uniqueJogos.forEach((j) => { if (j.rodada) rodadaSet.add(j.rodada); });
          const cronologico = Array.from(rodadaSet).sort((a, b) => rodadaNum(a) - rodadaNum(b));
          const now = new Date();
          const currentRodada = cronologico.find((r) =>
            uniqueJogos.some((j) => j.rodada === r && j.status === "agendado" && new Date(j.data_hora) > now)
          );
          // Reordenar: rodada atual primeiro, futuras em seguida, passadas ao final
          const currentIdx = currentRodada ? cronologico.indexOf(currentRodada) : cronologico.length;
          const sorted = [...cronologico.slice(currentIdx), ...cronologico.slice(0, currentIdx)];
          setRodadas(sorted);
          if (targetJogoId) {
            const tj = uniqueJogos.find((j) => j.id === targetJogoId);
            setActiveTab(tj?.rodada || currentRodada || sorted[sorted.length - 1] || "Todos");
          } else {
            setActiveTab(currentRodada || sorted[sorted.length - 1] || "Todos");
          }
        }
      } else {
        const tabSet = new Set<string>();
        uniqueJogos.forEach((j) => tabSet.add(getTabKey(j)));
        const sortedTabs = Array.from(tabSet).sort((a, b) => {
          const faseA = a.split(" – ")[0]; const faseB = b.split(" – ")[0];
          const ia = FASE_ORDER.indexOf(faseA); const ib = FASE_ORDER.indexOf(faseB);
          const orderA = ia === -1 ? 99 : ia; const orderB = ib === -1 ? 99 : ib;
          if (orderA !== orderB) return orderA - orderB;
          return a.includes("Ida") && !b.includes("Ida") ? -1 : !a.includes("Ida") && b.includes("Ida") ? 1 : 0;
        });
        // Reordenar: fases com jogos futuros primeiro, passadas ao final
        const fasesComFuturo2 = sortedTabs.filter((tab) =>
          uniqueJogos.some((j) => getTabKey(j) === tab && (j.status === "agendado" || j.status === "ao_vivo"))
        );
        const fasesSoPassado2 = sortedTabs.filter((tab) =>
          !uniqueJogos.some((j) => getTabKey(j) === tab && (j.status === "agendado" || j.status === "ao_vivo"))
        );
        setFases(["Todos", ...fasesComFuturo2, ...fasesSoPassado2]);
        if (targetJogoId) {
          const tj = uniqueJogos.find((j) => j.id === targetJogoId);
          setActiveTab(tj ? getTabKey(tj) : "Todos");
        } else { setActiveTab("Todos"); }
      }

      if (uniqueJogos.length > 0) {
        const jogoIds = uniqueJogos.map((j) => j.id);
        const batchSize = 100;
        let allPalpites: any[] = [];
        for (let i = 0; i < jogoIds.length; i += batchSize) {
          const batch = jogoIds.slice(i, i + batchSize);
          const { data } = await supabase.from("palpites")
            .select("id, jogo_id, placar_time_a, placar_time_b, pontos")
            .eq("user_id", user?.id ?? "").eq("bolao_id", id!).in("jogo_id", batch);
          if (data) allPalpites = [...allPalpites, ...data];
        }
        const pMap: Record<string, PalpiteDB> = {};
        const localMap: Record<string, { a: number; b: number }> = {};
        allPalpites.forEach((p: any) => {
          pMap[p.jogo_id] = { ...p, pontos: p.pontos ?? null };
          localMap[p.jogo_id] = { a: p.placar_time_a, b: p.placar_time_b };
        });
        setPalpitesDB(pMap); setPalpitesLocal(localMap);
      }
    } catch { toast.error("Erro ao carregar jogos"); } finally { setLoading(false); }
  };

  const setPlacar = (jogoId: string, time: "a" | "b", valor: number) => {
    setPalpitesLocal((prev) => ({
      ...prev,
      [jogoId]: { a: time === "a" ? Math.max(0, valor) : prev[jogoId]?.a ?? 0, b: time === "b" ? Math.max(0, valor) : prev[jogoId]?.b ?? 0 },
    }));
  };

  const salvarPalpite = async (jogoId: string) => {
    if (!user || !id) return;

    // Capturar valores ANTES do ad (evita race condition se o usuário mudar durante o ad)
    const local = palpitesLocal[jogoId];
    const placarA = local?.a ?? 0; const placarB = local?.b ?? 0;

    // Ad no primeiro palpite do dia (free users)
    if (needsAd) {
      const adResult = await showAd("palpite");
      if (!adResult) return;
    }
    setSalvando(jogoId);
    try {
      const existing = palpitesDB[jogoId];
      if (existing) {
        const { error } = await supabase.from("palpites").update({ placar_time_a: placarA, placar_time_b: placarB }).eq("id", existing.id);
        if (error) throw error;
        setPalpitesDB((prev) => ({ ...prev, [jogoId]: { ...existing, placar_time_a: placarA, placar_time_b: placarB } }));
      } else {
        const { data, error } = await supabase.from("palpites")
          .insert({ jogo_id: jogoId, bolao_id: id, user_id: user.id, placar_time_a: placarA, placar_time_b: placarB })
          .select("id, jogo_id, placar_time_a, placar_time_b, pontos").single();
        if (error) {
          if (error.message?.includes("row-level security") || error.code === "42501") { toast.error("Palpite encerrado! Faltam menos de 10 minutos para o jogo."); return; }
          throw error;
        }
        if (data) setPalpitesDB((prev) => ({ ...prev, [jogoId]: data as any }));
      }
      // Analytics: Palpite enviado
      trackEvent('enviar_palpite', {
        bolao_id: id || '',
        quantidade: 1,
      });

      // Gamificação: +5 XP por palpite
      darXP("palpite", 5, jogoId).then((ganhou) => {
        if (ganhou) setXPToast({ xp: 5, msg: "Palpite feito!" });
      });

      toast.success("Palpite salvo!");
      triggerFeedback();

      // ═══ Celebração do primeiro palpite (onboarding) ═══
      if (isFirstTime && !firstPalpiteDone.current) {
        firstPalpiteDone.current = true;
        const jogoInfo = jogos.find(j => j.id === jogoId);
        const resumo = jogoInfo ? `${jogoInfo.time_a} ${placarA} x ${placarB} ${jogoInfo.time_b}` : "";
        const { data: bolaoInfo } = await supabase
          .from("boloes").select("codigo_convite").eq("id", id).single();
        setCelebrationData({
          bolaoCode: bolaoInfo?.codigo_convite || "",
          palpiteResumo: resumo,
        });
        setTimeout(() => setShowCelebration(true), 800);
      }

      // Verificar se há outros bolões para copiar este palpite
      checkOutrosBoloes(jogoId, placarA, placarB);
    } catch (err: any) { toast.error(err.message || "Erro ao salvar palpite"); } finally { setSalvando(null); }
  };

  const now = new Date();
  // Filtro por campeonato (quando multi-campeonato)
  const jogosPorCamp = activeCampeonato === "Todos" ? jogos : jogos.filter((j) => j.campeonato_id === activeCampeonato);
  let jogosFiltrados: Jogo[];
  if (isLeague) { jogosFiltrados = activeTab === "Todos" ? jogosPorCamp : jogosPorCamp.filter((j) => j.rodada === activeTab); }
  else { jogosFiltrados = activeTab === "Todos" ? jogosPorCamp : jogosPorCamp.filter((j) => getTabKey(j) === activeTab); }

  const jogosAbertos = jogosFiltrados.filter((j) => j.status === "agendado" && (new Date(j.data_hora).getTime() - now.getTime()) / (1000 * 60) > 10);
  const jogosFechados = jogosFiltrados.filter((j) => j.status === "agendado" && (new Date(j.data_hora).getTime() - now.getTime()) / (1000 * 60) <= 10);
  const jogosAoVivo = jogosFiltrados.filter((j) => j.status === "ao_vivo");
  const jogosEncerrados = jogosFiltrados.filter((j) => j.status === "encerrado");

  const currentRodadaIdx = rodadas.indexOf(activeTab);
  const canPrev = isLeague && currentRodadaIdx > 0;
  const canNext = isLeague && currentRodadaIdx >= 0 && currentRodadaIdx < rodadas.length - 1;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-fade-in">
      <SEOHead title="Meus Palpites" noindex />
      {/* ═══ Celebração primeiro palpite (onboarding) ═══ */}
      <FirstPalpiteCelebration
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        bolaoId={id || ""}
        bolaoNome={bolaoNome}
        bolaoCode={celebrationData?.bolaoCode || ""}
        palpiteResumo={celebrationData?.palpiteResumo}
      />
      {adLoading && <AdLoadingOverlay />}
      {xpToast && <XPToast xp={xpToast.xp} message={xpToast.msg} onDone={() => setXPToast(null)} />}

      {/* ═══ Dialog: Copiar palpite para outros bolões ═══ */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-sm p-3 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 pr-6">
              <Copy className="w-4 h-4 text-copa-green-500 flex-shrink-0" />
              Copiar palpite para outros bolões?
            </DialogTitle>
            <DialogDescription className="text-xs">
              {pendingCopy && (
                <span className="font-semibold text-foreground">
                  {pendingCopy.timeA} {pendingCopy.placarA} x {pendingCopy.placarB} {pendingCopy.timeB}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            {copyBoloes.map((bolao) => {
              const status = copyingBoloes[bolao.id];
              const novoPalpite = pendingCopy ? `${pendingCopy.placarA} x ${pendingCopy.placarB}` : "";
              const palpiteIgual = bolao.jaTemPalpite && bolao.palpiteAtual === novoPalpite;
              const podeCopiar = bolao.temJogo && !palpiteIgual && status !== "done";
              return (
                <div
                  key={bolao.id}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2 border gap-2 ${
                    status === "done"
                      ? "bg-copa-green-50 border-copa-green-200"
                      : !bolao.temJogo
                      ? "bg-gray-50 border-gray-100 opacity-50"
                      : palpiteIgual
                      ? "bg-copa-green-50/50 border-copa-green-100"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium leading-tight block break-words ${
                      !bolao.temJogo ? "text-muted-foreground" : ""
                    }`}>
                      {bolao.nome}
                    </span>
                    {bolao.jaTemPalpite && bolao.palpiteAtual && !palpiteIgual && status !== "done" && (
                      <span className="text-[10px] text-amber-600">
                        Palpite atual: {bolao.palpiteAtual}
                      </span>
                    )}
                  </div>

                  {status === "done" ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-copa-green-600 whitespace-nowrap flex-shrink-0">
                      <Check className="w-3 h-3" /> {bolao.jaTemPalpite ? "Atualizado" : "Copiado"}
                    </span>
                  ) : !bolao.temJogo ? (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">Sem jogo</span>
                  ) : palpiteIgual ? (
                    <span className="flex items-center gap-1 text-[10px] text-copa-green-600 whitespace-nowrap flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Igual
                    </span>
                  ) : status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-copa-green-500" />
                  ) : bolao.jaTemPalpite ? (
                    <Button
                      size="sm"
                      onClick={() => copiarPalpiteParaBolao(bolao.id)}
                      className="h-7 px-2.5 text-[10px] bg-amber-500 hover:bg-amber-600 text-white rounded-lg whitespace-nowrap flex-shrink-0"
                    >
                      Atualizar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => copiarPalpiteParaBolao(bolao.id)}
                      className="h-7 px-2.5 text-[10px] bg-copa-green-500 hover:bg-copa-green-600 text-white rounded-lg flex-shrink-0"
                    >
                      Copiar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 mt-3">
            {copyBoloes.some(b => {
              const novo = pendingCopy ? `${pendingCopy.placarA} x ${pendingCopy.placarB}` : "";
              const igual = b.jaTemPalpite && b.palpiteAtual === novo;
              return b.temJogo && !igual && copyingBoloes[b.id] !== "done";
            }) && (
              <Button
                onClick={copiarParaTodos}
                className="w-full h-10 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar para todos
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowCopyDialog(false)}
              className="w-full h-10 rounded-xl"
            >
              {copyBoloes.every(b => {
                const novo = pendingCopy ? `${pendingCopy.placarA} x ${pendingCopy.placarB}` : "";
                const igual = b.jaTemPalpite && b.palpiteAtual === novo;
                return !b.temJogo || igual || copyingBoloes[b.id] === "done";
              }) ? "Fechar" : "Pular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/bolao/${id}`)} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Palpites</h2>
          <p className="text-sm text-muted-foreground">{bolaoNome}</p>
        </div>
      </div>

      {isFanatico && timeFavorito && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <Heart className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-red-700">Mostrando apenas jogos do <strong>{timeFavorito}</strong></span>
        </div>
      )}

      {isFanatico && !timeFavorito && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Heart className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700">Você ainda não escolheu seu time do coração. Mostrando todos os jogos.</span>
        </div>
      )}

      {campeonatosList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => { setActiveCampeonato("Todos"); setActiveTab("Todos"); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeCampeonato === "Todos"
                ? "bg-copa-green-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-3 h-3" /> Todos
          </button>
          {campeonatosList.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCampeonato(c.id); setActiveTab("Todos"); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCampeonato === c.id
                  ? "bg-copa-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {isLeague ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" disabled={!canPrev}
            onClick={() => setActiveTab(rodadas[currentRodadaIdx - 1])}
            className="rounded-full h-9 w-9 flex-shrink-0"><ChevronLeft className="w-5 h-5" /></Button>
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 px-1">
              {rodadas.map((r) => (
                <button key={r} onClick={() => setActiveTab(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === r ? "bg-copa-green-500 text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>{r.replace("Rodada ", "R")}</button>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" disabled={!canNext}
            onClick={() => setActiveTab(rodadas[currentRodadaIdx + 1])}
            className="rounded-full h-9 w-9 flex-shrink-0"><ChevronRight className="w-5 h-5" /></Button>
        </div>
      ) : fases.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {fases.map((fase) => (
            <button key={fase} onClick={() => setActiveTab(fase)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === fase ? "bg-copa-green-500 text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>{fase}</button>
          ))}
        </div>
      )}

      {isLeague && activeTab !== "Todos" && (
        <div className="text-center"><span className="text-sm font-bold text-copa-green-700">{activeTab}</span></div>
      )}

      {jogosAbertos.length > 0 && (<>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-copa-gold-400 rounded-full" />
          <span className="text-sm font-medium text-copa-green-600">Próximos jogos – Palpite aberto</span>
        </div>
        <div className="space-y-4">
          {jogosAbertos.map((jogo) => (
            <PalpiteCard key={jogo.id} jogo={jogo} palpiteDB={palpitesDB[jogo.id] || null}
              localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }} onSetPlacar={setPlacar}
              onSalvar={salvarPalpite} salvando={salvando === jogo.id} editable />
          ))}
        </div>
      </>)}

      {/* Banner Ad entre jogos abertos e fechados */}

      {jogosFechados.length > 0 && (<>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Palpites encerrados</span>
        </div>
        <div className="space-y-4">
          {jogosFechados.map((jogo) => (
            <PalpiteCard key={jogo.id} jogo={jogo} palpiteDB={palpitesDB[jogo.id] || null}
              localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }} onSetPlacar={setPlacar}
              onSalvar={salvarPalpite} salvando={false} editable={false} />
          ))}
        </div>
      </>)}

      {jogosAoVivo.length > 0 && (<>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600">Ao vivo</span>
        </div>
        <div className="space-y-4">
          {jogosAoVivo.map((jogo) => (
            <PalpiteCard key={jogo.id} jogo={jogo} palpiteDB={palpitesDB[jogo.id] || null}
              localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }} onSetPlacar={setPlacar}
              onSalvar={salvarPalpite} salvando={false} editable={false} />
          ))}
        </div>
      </>)}

      {jogosEncerrados.length > 0 && (<>
        <div className="flex items-center gap-2 mt-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Resultados</span>
        </div>
        <div className="space-y-4">
          {jogosEncerrados.map((jogo) => (
            <PalpiteCard key={jogo.id} jogo={jogo} palpiteDB={palpitesDB[jogo.id] || null}
              localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }} onSetPlacar={setPlacar}
              onSalvar={salvarPalpite} salvando={false} editable={false} />
          ))}
        </div>
      </>)}

      {jogosFiltrados.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isFanatico && timeFavorito
                ? `Nenhum jogo do ${timeFavorito} nesta rodada.`
                : "Nenhum jogo encontrado para esta rodada."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PalpiteCard = ({ jogo, palpiteDB, localPlacar, onSetPlacar, onSalvar, salvando, editable }: {
  jogo: Jogo; palpiteDB: PalpiteDB | null; localPlacar: { a: number; b: number };
  onSetPlacar: (jogoId: string, time: "a" | "b", valor: number) => void;
  onSalvar: (jogoId: string) => void; salvando: boolean; editable: boolean;
}) => {
  const isEncerrado = jogo.status === "encerrado";
  const isAoVivo = jogo.status === "ao_vivo";
  const hasPalpite = !!palpiteDB;
  const hasChanges = hasPalpite && (localPlacar.a !== palpiteDB!.placar_time_a || localPlacar.b !== palpiteDB!.placar_time_b);

  return (
    <Card id={`jogo-${jogo.id}`} className={`rounded-2xl shadow-sm overflow-hidden transition-all ${!editable && !isEncerrado ? "opacity-75" : ""}`}>
      {(jogo.fase || jogo.rodada) && (
        <div className={`px-4 py-2 border-b ${isEncerrado ? "bg-gray-50" : "bg-copa-green-50"}`}>
          <p className={`text-xs font-semibold ${isEncerrado ? "text-gray-500" : "text-copa-green-600"}`}>
            {[traduzirFase(jogo.fase), jogo.rodada].filter(Boolean).join(" – ")}
          </p>
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            {jogo.logo_time_a ? (
              <img src={jogo.logo_time_a} alt={jogo.time_a} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-10 h-10 bg-gray-200 rounded-full" />}
            <span className="text-sm font-bold text-center leading-tight">{jogo.time_a}</span>
          </div>

          {isEncerrado || isAoVivo ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">{jogo.placar_time_a ?? "-"}</span>
                <span className="text-lg font-bold text-muted-foreground">x</span>
                <span className="text-2xl font-black">{jogo.placar_time_b ?? "-"}</span>
              </div>
              {hasPalpite && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">Palpite: {palpiteDB!.placar_time_a} x {palpiteDB!.placar_time_b}</span>
                  {palpiteDB!.pontos != null && palpiteDB!.pontos > 0 && (
                    <span className="text-[10px] font-bold text-copa-green-600 bg-copa-green-100 rounded px-1">+{palpiteDB!.pontos} pts</span>
                  )}
                </div>
              )}
            </div>
          ) : editable ? (
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="99" value={localPlacar.a.toString()}
                onChange={(e) => { const v = parseInt(e.target.value.replace(/^0+(?=\d)/, '')) || 0; onSetPlacar(jogo.id, "a", Math.min(99, Math.max(0, v))); }}
                onFocus={(e) => e.target.select()}
                className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-lg font-bold text-muted-foreground">x</span>
              <input type="number" min="0" max="99" value={localPlacar.b.toString()}
                onChange={(e) => { const v = parseInt(e.target.value.replace(/^0+(?=\d)/, '')) || 0; onSetPlacar(jogo.id, "b", Math.min(99, Math.max(0, v))); }}
                onFocus={(e) => e.target.select()}
                className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {hasPalpite ? (<>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-gray-400">{palpiteDB!.placar_time_a}</span>
                  <span className="text-lg font-bold text-muted-foreground">x</span>
                  <span className="text-xl font-black text-gray-400">{palpiteDB!.placar_time_b}</span>
                </div>
                <span className="text-[10px] text-muted-foreground"><Lock className="w-3 h-3 inline mr-0.5" />Palpite travado</span>
              </>) : (
                <div className="flex items-center gap-1 text-gray-400"><Lock className="w-4 h-4" /><span className="text-xs">Sem palpite</span></div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-1.5 flex-1">
            {jogo.logo_time_b ? (
              <img src={jogo.logo_time_b} alt={jogo.time_b} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-10 h-10 bg-gray-200 rounded-full" />}
            <span className="text-sm font-bold text-center leading-tight">{jogo.time_b}</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground">{formatDataJogo(jogo.data_hora)}</p>
          {editable && (
            <p className={`text-xs font-medium mt-1 ${hasPalpite ? "text-copa-green-500" : "text-copa-gold-500"}`}>
              {hasPalpite ? (hasChanges ? "Palpite alterado – salve novamente" : "✓ Palpite salvo") : "Palpite ainda não enviado"}
            </p>
          )}
          {isEncerrado && !hasPalpite && <p className="text-xs text-gray-400 mt-1">Nenhum palpite enviado</p>}
        </div>

        {editable && (
          <Button onClick={() => onSalvar(jogo.id)} disabled={salvando || (hasPalpite && !hasChanges)}
            className={`w-full h-11 font-bold rounded-xl ${hasPalpite && !hasChanges ? "bg-copa-green-100 text-copa-green-600 hover:bg-copa-green-200" : "bg-copa-green-500 hover:bg-copa-green-600 text-white"}`}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {hasPalpite && !hasChanges ? "Palpite salvo" : "Salvar palpite"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default Palpites;
