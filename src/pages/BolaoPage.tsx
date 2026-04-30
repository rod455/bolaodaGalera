import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Trophy, Users, ChevronRight, Medal, Loader2, Clock,
  CheckCircle2, AlertCircle, Lock, Share2, Copy, LogOut, Trash2, Eye, ChevronDown, ChevronUp, Info, Pencil, Camera, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RegrasModal from "@/components/RegrasModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EventosEspeciais from "@/components/EventosEspeciais";
import PromoBolaoHeader from "@/components/PromoBolaoHeader";
import type { Bolao, Jogo, Palpite, RankingEntry } from "@/lib/types";
import { MODO_LABELS, MODO_REGRAS, getInviteUrl, getStoreUrl } from "@/lib/constants";
const STORE_URL = getStoreUrl();
import { shareViaWhatsApp } from "@/lib/utils";
import { formatDataJogo, traduzirFase, getInitials } from "@/lib/formatters";
import SEOHead from "@/components/SEOHead";
import { useGamification } from "@/hooks/useGamification";
import NivelBadge from "@/components/NivelBadge";
import XPToast from "@/components/XPToast";
import { trackEvent } from "@/lib/analytics";
import { triggerFeedback } from "@/components/FeedbackBanner";
import MataMataDashboard from "@/components/MataMataDashboard";
import GerenciarCampeonatos from "@/components/GerenciarCampeonatos";


function getStatusInfo(jogo: Jogo, palpite: Palpite | null, now: Date) {
  const jogoDate = new Date(jogo.data_hora);
  const diffMs = jogoDate.getTime() - now.getTime();
  const diffMin = diffMs / (1000 * 60);

  if (jogo.status === "encerrado") {
    if (palpite) {
      const pts = palpite.pontos ?? 0;
      return {
        label: `Resultado: ${jogo.placar_time_a} x ${jogo.placar_time_b} • ${pts} pts`,
        color: pts > 0 ? "text-copa-green-600 bg-copa-green-50" : "text-gray-500 bg-gray-50",
        icon: pts > 0 ? CheckCircle2 : AlertCircle,
      };
    }
    return {
      label: `Resultado: ${jogo.placar_time_a} x ${jogo.placar_time_b}`,
      color: "text-gray-500 bg-gray-50",
      icon: AlertCircle,
    };
  }

  if (jogo.status === "ao_vivo") {
    return {
      label: "Ao vivo",
      color: "text-red-600 bg-red-50",
      icon: AlertCircle,
    };
  }

  // agendado
  if (diffMin <= 0) {
    // Game already started but status not yet updated
    return {
      label: "Em andamento",
      color: "text-amber-600 bg-amber-50",
      icon: Clock,
    };
  }

  if (diffMin <= 10) {
    return {
      label: "Palpites encerrados",
      color: "text-gray-500 bg-gray-100",
      icon: Lock,
    };
  }

  if (palpite) {
    return {
      label: "Palpite realizado",
      color: "text-copa-green-600 bg-copa-green-50",
      icon: CheckCircle2,
    };
  }

  return {
    label: "Palpites abertos",
    color: "text-amber-600 bg-amber-50",
    icon: Clock,
  };
}

// ── Mensagem contextual do ranking (motivacional) ──
function getRankingMessage(ranking: RankingEntry[], userId: string | undefined): { emoji: string; text: string; color: string } | null {
  if (!userId || ranking.length === 0) return null;
  const me = ranking.find((r) => r.isCurrentUser);
  if (!me) return null;

  const total = ranking.length;
  const pos = me.pos;
  const pontos = me.pontos;

  // Sem pontos ainda
  if (pontos === 0) {
    return { emoji: "🎯", text: "Faça seus palpites para entrar no ranking!", color: "text-amber-600 bg-amber-50 border-amber-200" };
  }

  // 1º lugar
  if (pos === 1) {
    if (total === 1) return { emoji: "👑", text: "Você é o único! Convide amigos para competir.", color: "text-copa-gold-600 bg-copa-gold-50 border-copa-gold-200" };
    const segundo = ranking.find((r) => r.pos === 2);
    const diff = segundo ? pontos - segundo.pontos : 0;
    if (diff === 0) return { emoji: "⚔️", text: "Empatado na liderança! Cada ponto conta.", color: "text-copa-green-600 bg-copa-green-50 border-copa-green-200" };
    if (diff <= 3) return { emoji: "👑", text: `Liderando por apenas ${diff} ponto${diff > 1 ? "s" : ""}! Mantenha o foco.`, color: "text-copa-gold-600 bg-copa-gold-50 border-copa-gold-200" };
    return { emoji: "🏆", text: `Liderando com ${diff} pontos de vantagem! Dominando o bolão.`, color: "text-copa-gold-600 bg-copa-gold-50 border-copa-gold-200" };
  }

  // Pódio (2º ou 3º)
  if (pos <= 3) {
    const lider = ranking.find((r) => r.pos === 1);
    const diff = lider ? lider.pontos - pontos : 0;
    if (diff === 0) return { emoji: "🔥", text: `${pos}º lugar empatado com o líder! Tudo aberto.`, color: "text-copa-green-600 bg-copa-green-50 border-copa-green-200" };
    if (diff <= 5) return { emoji: "🔥", text: `${pos}º lugar — a ${diff} ponto${diff > 1 ? "s" : ""} do líder. Dá pra virar!`, color: "text-copa-green-600 bg-copa-green-50 border-copa-green-200" };
    return { emoji: "💪", text: `No pódio! ${pos}º lugar com ${pontos} pontos.`, color: "text-copa-green-600 bg-copa-green-50 border-copa-green-200" };
  }

  // Top metade
  if (pos <= Math.ceil(total / 2)) {
    const acima = ranking.find((r) => r.pos === pos - 1);
    const diff = acima ? acima.pontos - pontos : 0;
    if (diff <= 2) return { emoji: "📈", text: `${pos}º lugar — a ${diff} ponto${diff > 1 ? "s" : ""} de subir! Continue palpitando.`, color: "text-blue-600 bg-blue-50 border-blue-200" };
    const percentBetter = Math.round(((total - pos) / total) * 100);
    return { emoji: "📊", text: `${pos}º de ${total} — melhor que ${percentBetter}% dos participantes!`, color: "text-blue-600 bg-blue-50 border-blue-200" };
  }

  // Metade inferior
  const acima = ranking.find((r) => r.pos === pos - 1);
  const diff = acima ? acima.pontos - pontos : 0;
  if (diff <= 3) return { emoji: "⬆️", text: `${pos}º lugar — só ${diff} ponto${diff > 1 ? "s" : ""} para subir. Não desista!`, color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { emoji: "💡", text: `${pos}º de ${total} — ainda dá tempo de recuperar! Palpite todo jogo.`, color: "text-amber-600 bg-amber-50 border-amber-200" };
}

const BolaoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [bolao, setBolao] = useState<Bolao | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({});
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingRodada, setRankingRodada] = useState<RankingEntry[]>([]);
  const [rankingTab, setRankingTab] = useState<"geral" | "rodada">("geral");
  const [loadingRodada, setLoadingRodada] = useState(false);
  const [showFullRanking, setShowFullRanking] = useState(false);

  const { darXP } = useGamification();
  const [xpToast, setXPToast] = useState<{xp: number, msg: string} | null>(null);
  const [niveisRanking, setNiveisRanking] = useState<Record<string, number>>({});
  const [streaksRanking, setStreaksRanking] = useState<Record<string, number>>({});
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [otherBoloes, setOtherBoloes] = useState<{ id: string; nome: string; campeonato_id: string | null }[]>([]);
  const [copying, setCopying] = useState(false);
  // Palpites dos participantes (private bolão only)
  const [expandedJogo, setExpandedJogo] = useState<string | null>(null);
  const [participantPalpites, setParticipantPalpites] = useState<Record<string, { nome: string; avatar: string; placar_a: number; placar_b: number; pontos: number | null }[]>>({});
  const [showRegrasModal, setShowRegrasModal] = useState(false);
  const [loadingPalpites, setLoadingPalpites] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [savingNome, setSavingNome] = useState(false);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [capaEditor, setCapaEditor] = useState<{ url: string; file: File } | null>(null);
  const [capaPositionY, setCapaPositionY] = useState(50); // porcentagem vertical (0=topo, 100=base)
  const [capaTarget, setCapaTarget] = useState<"ambos" | "web" | "mobile">("ambos");
  const [isDraggingCapa, setIsDraggingCapa] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPos, setDragStartPos] = useState(50);
  const [showGerenciarCampeonatos, setShowGerenciarCampeonatos] = useState(false);
  const [campeonatosVinculados, setCampeonatosVinculados] = useState<{id: string; nome_popular: string; logo_url: string}[]>([]);
  const [showCampeonatosModal, setShowCampeonatosModal] = useState(false);

  const handleCapaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }

    // Abrir editor de posição
    const previewUrl = URL.createObjectURL(file);
    setCapaPositionY(50);
    setCapaEditor({ url: previewUrl, file });
    e.target.value = "";
  };

  const handleCapaDrag = (clientY: number) => {
    if (!isDraggingCapa) return;
    const diff = dragStartY - clientY;
    const newPos = Math.max(0, Math.min(100, dragStartPos + diff * 0.3));
    setCapaPositionY(newPos);
  };

  const handleSaveCapa = async () => {
    if (!capaEditor || !id) return;

    // Validação de tipo e tamanho do arquivo
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (!ALLOWED_TYPES.includes(capaEditor.file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (capaEditor.file.size > MAX_SIZE) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }

    setUploadingCapa(true);
    try {
      const ext = capaEditor.file.name.split(".").pop() || "jpg";
      const fileName = `bolao_${id}_capa.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("bolao-capas")
        .upload(fileName, capaEditor.file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("bolao-capas")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      const positionValue = `center ${Math.round(capaPositionY)}%`;

      const updateFields: Record<string, string> = { imagem_posicao: positionValue };
      if (capaTarget === "ambos" || capaTarget === "web") updateFields.imagem_url = publicUrl;
      if (capaTarget === "ambos" || capaTarget === "mobile") updateFields.imagem_url_mobile = publicUrl;

      const { error: updateError } = await supabase
        .from("boloes")
        .update(updateFields)
        .eq("id", id);
      if (updateError) throw updateError;

      setBolao((prev) => prev ? { ...prev, ...updateFields } as any : prev);
      const targetLabel = capaTarget === "ambos" ? "Web e Mobile" : capaTarget === "web" ? "Web" : "Mobile";
      toast.success(`Capa atualizada para ${targetLabel}!`);
      URL.revokeObjectURL(capaEditor.url);
      setCapaEditor(null);
    } catch {
      toast.error("Erro ao atualizar foto de capa");
    } finally {
      setUploadingCapa(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (id && user) loadBolao().catch(() => {});
    const interval = setInterval(() => { if (id && user && active) loadBolao().catch(() => {}); }, 120000);
    return () => { active = false; clearInterval(interval); };
  }, [id, user]);

  const loadBolao = async () => {
    try {
      // Fetch bolão info
      const { data: bolaoData } = await supabase
        .from("boloes")
        .select("*, campeonatos(logo_url, nome_popular)")
        .eq("id", id)
        .single();

      if (!bolaoData) {
        navigate("/home");
        return;
      }
      setBolao(bolaoData as any);

      // Count participants
      const { count } = await supabase
        .from("bolao_participantes")
        .select("*", { count: "exact", head: true })
        .eq("bolao_id", id);
      setTotalParticipantes(count || 0);

      // Fetch upcoming + recent games from all linked campeonatos
      // First try bolao_campeonatos (new), fallback to boloes.campeonato_id (legacy)
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", id!);

      const campIds = bcData && bcData.length > 0
        ? bcData.map((bc: any) => bc.campeonato_id)
        : bolaoData.campeonato_id ? [bolaoData.campeonato_id] : [];

      // Carregar nomes dos campeonatos vinculados (para exibir badges)
      if (campIds.length > 0) {
        const { data: campsInfo } = await supabase
          .from("campeonatos")
          .select("id, nome_popular, logo_url")
          .in("id", campIds);
        setCampeonatosVinculados((campsInfo || []) as any);
      } else {
        setCampeonatosVinculados([]);
      }

      if (campIds.length > 0) {
        const now = new Date();

        // Próximos jogos (agendados no futuro)
        const { data: proximos } = await supabase
          .from("jogos")
          .select("*")
          .in("campeonato_id", campIds)
          .eq("status", "agendado")
          .gte("data_hora", now.toISOString())
          .order("data_hora", { ascending: true })
          .limit(5);

        // Jogos agendados que já começaram (data_hora passed but status not yet updated)
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const { data: emAndamento } = await supabase
          .from("jogos")
          .select("*")
          .in("campeonato_id", campIds)
          .eq("status", "agendado")
          .lt("data_hora", now.toISOString())
          .gte("data_hora", twoHoursAgo.toISOString())
          .order("data_hora", { ascending: true });

        // Jogos recentes (encerrados): ontem + hoje, ou últimos 5 se nenhum nos últimos 3 dias
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);

        const { data: recentesHojeOntem } = await supabase
          .from("jogos")
          .select("*")
          .in("campeonato_id", campIds)
          .eq("status", "encerrado")
          .gte("data_hora", yesterdayStart.toISOString())
          .order("data_hora", { ascending: false });

        let recentes = recentesHojeOntem;
        if (!recentes || recentes.length === 0) {
          const { data: fallback } = await supabase
            .from("jogos")
            .select("*")
            .in("campeonato_id", campIds)
            .eq("status", "encerrado")
            .order("data_hora", { ascending: false })
            .limit(5);
          recentes = fallback;
        }

        // Jogos ao vivo
        const { data: aoVivo } = await supabase
          .from("jogos")
          .select("*")
          .in("campeonato_id", campIds)
          .eq("status", "ao_vivo");

        const allJogos = [
          ...(aoVivo || []),
          ...(emAndamento || []),
          ...(proximos || []),
          ...(recentes || []),
        ] as Jogo[];

        // Remove duplicates
        const seen = new Set<string>();
        const uniqueJogos = allJogos.filter((j) => {
          if (seen.has(j.id)) return false;
          seen.add(j.id);
          return true;
        });

        // Filtrar pelo time_favorito se modo fanático
        const isFanatico = (bolaoData as any).modo_pontuacao === "fanatico";
        const timeFav = (bolaoData as any).time_favorito;
        const jogosFinal = (isFanatico && timeFav)
          ? uniqueJogos.filter((j) => j.time_a === timeFav || j.time_b === timeFav)
          : uniqueJogos;
        setJogos(jogosFinal);

        // Fetch user palpites for these games
        if (jogosFinal.length > 0) {
          const jogoIds = jogosFinal.map((j) => j.id);
          const { data: userPalpites, error: palpError } = await supabase
            .from("palpites")
            .select("jogo_id, placar_time_a, placar_time_b, pontos")
            .eq("user_id", user?.id ?? "")
            .eq("bolao_id", id!)
            .in("jogo_id", jogoIds);

          let palpitesList = userPalpites;
          if (palpError) {
            // Fallback without pontos column
            const { data: fallback } = await supabase
              .from("palpites")
              .select("jogo_id, placar_time_a, placar_time_b")
              .eq("user_id", user?.id ?? "")
              .eq("bolao_id", id!)
              .in("jogo_id", jogoIds);
            palpitesList = (fallback || []).map((p: any) => ({ ...p, pontos: null }));
          }

          const palpiteMap: Record<string, Palpite> = {};
          (palpitesList || []).forEach((p: any) => {
            palpiteMap[p.jogo_id] = p;
          });
          setPalpites(palpiteMap);
        }
      }

      // Fetch ranking (all participants)
      const { data: participantes } = await supabase
        .from("bolao_participantes")
        .select("user_id, pontuacao_total, posicao_ranking, streak_atual, profiles(nome, avatar_url)")
        .eq("bolao_id", id!)
        .order("pontuacao_total", { ascending: false });

      const rankingList: RankingEntry[] = (participantes || []).map(
        (p: any, idx: number) => {
          const nome = p.profiles?.nome || "Usuário";
          return {
            pos: p.posicao_ranking || idx + 1,
            nome,
            avatar: getInitials(nome),
            pontos: p.pontuacao_total || 0,
            isCurrentUser: p.user_id === (user?.id ?? ""),
            userId: p.user_id,
          };
        }
      );
      setRanking(rankingList);

      // Mapear streaks
      const streaks: Record<string, number> = {};
      (participantes || []).forEach((p: any) => {
        if (p.streak_atual && p.streak_atual >= 2) streaks[p.user_id] = p.streak_atual;
      });
      setStreaksRanking(streaks);

      // Buscar níveis dos participantes para o ranking
      const userIds = (participantes || []).map((p: any) => p.user_id);
      if (userIds.length > 0) {
        const { data: xpData } = await supabase
          .from("user_xp")
          .select("user_id, nivel")
          .in("user_id", userIds);
        if (xpData) {
          const niveis: Record<string, number> = {};
          xpData.forEach((x: any) => { niveis[x.user_id] = x.nivel; });
          setNiveisRanking(niveis);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // ═══ Ranking por rodada (busca sob demanda) ═══
  const fetchRankingRodada = async () => {
    if (!id || !user || rankingRodada.length > 0) return;
    setLoadingRodada(true);
    try {
      // 1. Buscar campeonatos do bolão
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", id);
      const campIds = (bcData || []).map((bc: any) => bc.campeonato_id);
      if (campIds.length === 0 && bolao?.campeonato_id) campIds.push(bolao.campeonato_id);

      // 2. Calcular semana atual (domingo a domingo)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=dom, 1=seg...
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(0, 0, 0, 0);

      // 3. Buscar jogos desta semana
      const { data: jogosRodada } = await supabase
        .from("jogos")
        .select("id")
        .in("campeonato_id", campIds)
        .gte("data_hora", startOfWeek.toISOString())
        .lt("data_hora", endOfWeek.toISOString());

      const jogoIds = (jogosRodada || []).map((j: any) => j.id);
      if (jogoIds.length === 0) { setLoadingRodada(false); return; }

      // 4. Buscar palpites de todos os participantes nestes jogos
      const { data: palpitesRodada } = await supabase
        .from("palpites")
        .select("user_id, pontos")
        .eq("bolao_id", id)
        .in("jogo_id", jogoIds);

      // 5. Somar pontos por user
      const pontosMap: Record<string, number> = {};
      (palpitesRodada || []).forEach((p: any) => {
        pontosMap[p.user_id] = (pontosMap[p.user_id] || 0) + (p.pontos || 0);
      });

      // 6. Mapear nomes dos participantes do ranking geral
      const nomeMap: Record<string, { nome: string; avatar: string }> = {};
      ranking.forEach((r) => {
        if (r.userId) nomeMap[r.userId] = { nome: r.nome, avatar: r.avatar };
      });

      // 7. Montar ranking da rodada
      const rodadaList = Object.entries(pontosMap)
        .map(([uid, pts]) => ({
          userId: uid,
          nome: nomeMap[uid]?.nome || "Usuário",
          avatar: nomeMap[uid]?.avatar || "??",
          pontos: pts,
          isCurrentUser: uid === user.id,
        }))
        .sort((a, b) => b.pontos - a.pontos)
        .map((item, idx) => ({
          ...item,
          pos: idx + 1,
        }));

      setRankingRodada(rodadaList);
    } catch {
    } finally {
      setLoadingRodada(false);
    }
  };

  const openCopyDialog = async () => {
    if (!user || !bolao) return;

    // 1. Descobrir todos os campeonatos deste bolão (novo + legado)
    const { data: bcThis } = await supabase
      .from("bolao_campeonatos")
      .select("campeonato_id")
      .eq("bolao_id", id!);
    const thisCampIds = new Set(
      [
        ...(bcThis || []).map((bc: any) => bc.campeonato_id),
        ...(bolao.campeonato_id ? [bolao.campeonato_id] : []),
      ]
    );

    // 2. Buscar todos os bolões que o usuário participa
    const { data: participacoes } = await supabase
      .from("bolao_participantes")
      .select("bolao_id, boloes(id, nome, campeonato_id)")
      .eq("user_id", user.id);

    const otherBolaoIds = (participacoes || [])
      .filter((p: any) => p.boloes && p.boloes.id !== id)
      .map((p: any) => p.boloes);

    // 3. Buscar campeonatos de todos esses bolões via bolao_campeonatos
    const otherIds = otherBolaoIds.map((b: any) => b.id);
    const { data: bcOthers } = otherIds.length > 0
      ? await supabase.from("bolao_campeonatos").select("bolao_id, campeonato_id").in("bolao_id", otherIds)
      : { data: [] };

    // Montar mapa bolao_id -> Set de campeonato_ids
    const campMap: Record<string, Set<string>> = {};
    for (const b of otherBolaoIds) {
      campMap[b.id] = new Set(b.campeonato_id ? [b.campeonato_id] : []);
    }
    for (const bc of (bcOthers || [])) {
      if (!campMap[bc.bolao_id]) campMap[bc.bolao_id] = new Set();
      campMap[bc.bolao_id].add(bc.campeonato_id);
    }

    // 4. Filtrar: bolões que compartilham pelo menos 1 campeonato com este
    const others = otherBolaoIds
      .filter((b: any) => {
        const camps = campMap[b.id];
        if (!camps) return false;
        for (const c of camps) {
          if (thisCampIds.has(c)) return true;
        }
        return false;
      })
      .map((b: any) => ({ id: b.id, nome: b.nome, campeonato_id: b.campeonato_id }));

    setOtherBoloes(others);
    setShowCopyDialog(true);
  };

  const copyPalpitesFrom = async (sourceBolaoId: string) => {
    if (!user || !id) return;
    setCopying(true);
    try {
      // Get palpites from source bolão
      const { data: sourcePalpites } = await supabase
        .from("palpites")
        .select("jogo_id, placar_time_a, placar_time_b")
        .eq("user_id", user.id)
        .eq("bolao_id", sourceBolaoId);

      if (!sourcePalpites || sourcePalpites.length === 0) {
        toast.info("Nenhum palpite encontrado no bolão selecionado.");
        setCopying(false);
        return;
      }

      // Get existing palpites in this bolão
      const { data: existingPalpites } = await supabase
        .from("palpites")
        .select("jogo_id")
        .eq("user_id", user.id)
        .eq("bolao_id", id);

      const existingJogoIds = new Set((existingPalpites || []).map((p: any) => p.jogo_id));

      // Only copy palpites for games not yet palpited in this bolão
      const toInsert = sourcePalpites
        .filter((p: any) => !existingJogoIds.has(p.jogo_id))
        .map((p: any) => ({
          jogo_id: p.jogo_id,
          bolao_id: id,
          user_id: user.id,
          placar_time_a: p.placar_time_a,
          placar_time_b: p.placar_time_b,
          origem: Capacitor.getPlatform(),
        }));

      if (toInsert.length === 0) {
        toast.info("Todos os palpites já foram copiados anteriormente.");
        setCopying(false);
        setShowCopyDialog(false);
        return;
      }

      const { error } = await supabase.from("palpites").insert(toInsert);
      if (error) throw error;

      toast.success(`${toInsert.length} palpite(s) copiado(s) com sucesso!`);
      setShowCopyDialog(false);
      loadBolao(); // Reload to show updated palpites
    } catch {
      toast.error("Erro ao copiar palpites");
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!bolao) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <p className="text-muted-foreground">Bolão não encontrado ou você não tem acesso.</p>
        <Button onClick={() => navigate("/home")} variant="outline">Voltar para Home</Button>
      </div>
    );
  }

  const handleLeaveBolao = async () => {
    if (!user || !id) return;
    setLeaving(true);
    try {
      const { error: errPalpites } = await supabase.from("palpites").delete().eq("user_id", user.id).eq("bolao_id", id);
      if (errPalpites) throw errPalpites;
      const { error: errPart } = await supabase.from("bolao_participantes").delete().eq("user_id", user.id).eq("bolao_id", id);
      if (errPart) throw errPart;
      toast.success("Você saiu do bolão.");
      navigate("/home");
    } catch {
      toast.error("Erro ao sair do bolão.");
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDeleteBolao = async () => {
    if (!user || !id || !bolao) return;

    // Proteção: não permite excluir bolões nacionais
    if (bolao.is_nacional) {
      toast.error("Bolões nacionais não podem ser excluídos.");
      return;
    }

    // Proteção: só criador pode excluir
    if (bolao.criador_id !== user.id) {
      toast.error("Apenas o criador pode excluir este bolão.");
      return;
    }

    setDeleting(true);
    try {
      // Delete all palpites for this bolão
      await supabase.from("palpites").delete().eq("bolao_id", id);
      // Delete all participants
      await supabase.from("bolao_participantes").delete().eq("bolao_id", id);
      // Delete the bolão itself
      await supabase.from("boloes").delete().eq("id", id);
      toast.success("Bolão excluído com sucesso.");
      navigate("/home");
    } catch {
      toast.error("Erro ao excluir bolão.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
    }
  };

  const handleSaveNome = async () => {
    if (!novoNome.trim() || novoNome.trim() === bolao?.nome) {
      setEditingNome(false);
      return;
    }
    setSavingNome(true);
    try {
      const { error } = await supabase
        .from("boloes")
        .update({ nome: novoNome.trim() })
        .eq("id", id!);
      if (error) throw error;
      setBolao((prev) => prev ? { ...prev, nome: novoNome.trim() } : prev);
      toast.success("Nome do bolão atualizado!");
      setEditingNome(false);
    } catch {
      toast.error("Erro ao atualizar nome");
    } finally {
      setSavingNome(false);
    }
  };

  const toggleJogoPalpites = async (jogoId: string) => {
    if (expandedJogo === jogoId) {
      setExpandedJogo(null);
      return;
    }
    setExpandedJogo(jogoId);
    if (participantPalpites[jogoId]) return;

    setLoadingPalpites(jogoId);
    try {
      // Step 1: fetch all palpites for this game in this bolão
      const { data: palpitesData, error: palpErr } = await supabase
        .from("palpites")
        .select("placar_time_a, placar_time_b, pontos, user_id")
        .eq("bolao_id", id!)
        .eq("jogo_id", jogoId);

      if (palpErr) {
        // Fallback without pontos
        const { data: fallback } = await supabase
          .from("palpites")
          .select("placar_time_a, placar_time_b, user_id")
          .eq("bolao_id", id!)
          .eq("jogo_id", jogoId);
        
        const userIds = [...new Set((fallback || []).map((p: any) => p.user_id))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from("profiles").select("id, nome").in("id", userIds)
          : { data: [] };
        const profileMap: Record<string, string> = {};
        (profiles || []).forEach((pr: any) => { profileMap[pr.id] = pr.nome; });

        const list = (fallback || []).map((p: any) => {
          const nome = profileMap[p.user_id] || "Usuário";
          const initials = getInitials(nome);
          return { nome, avatar: initials, placar_a: p.placar_time_a, placar_b: p.placar_time_b, pontos: null, isCurrentUser: p.user_id === user?.id };
        });
        list.sort((a: any, b: any) => (b.isCurrentUser ? 1 : 0) - (a.isCurrentUser ? 1 : 0));
        setParticipantPalpites((prev) => ({ ...prev, [jogoId]: list }));
        return;
      }

      // Step 2: fetch profiles for all user_ids
      const userIds = [...new Set((palpitesData || []).map((p: any) => p.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, nome").in("id", userIds)
        : { data: [] };
      
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((pr: any) => { profileMap[pr.id] = pr.nome; });

      const list = (palpitesData || []).map((p: any) => {
        const nome = profileMap[p.user_id] || "Usuário";
        const initials = getInitials(nome);
        return {
          nome,
          avatar: initials,
          placar_a: p.placar_time_a,
          placar_b: p.placar_time_b,
          pontos: p.pontos,
          isCurrentUser: p.user_id === user?.id,
        };
      });
      list.sort((a: any, b: any) => (b.pontos ?? 0) - (a.pontos ?? 0));
      setParticipantPalpites((prev) => ({ ...prev, [jogoId]: list }));
    } catch {
    } finally {
      setLoadingPalpites(null);
    }
  };

  const now = new Date();

  // Separate jogos into sections
  const jogosAoVivo = jogos.filter((j) => j.status === "ao_vivo");
  const jogosEmAndamento = jogos.filter((j) => {
    if (j.status !== "agendado") return false;
    return new Date(j.data_hora).getTime() <= now.getTime();
  });
  const jogosProximos = jogos.filter((j) => {
    if (j.status !== "agendado") return false;
    return new Date(j.data_hora).getTime() > now.getTime();
  }).sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  // Separar jogos de hoje dos próximos dias
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const jogosHoje = jogosProximos.filter((j) => new Date(j.data_hora) <= todayEnd);
  const jogosRestantes = jogosProximos.filter((j) => new Date(j.data_hora) > todayEnd);

  const jogosEncerrados = jogos
    .filter((j) => j.status === "encerrado")
    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());

  const tema = (bolao as any)?.tema as {
    cor_primaria?: string; cor_secundaria?: string; cor_fundo?: string;
    cor_card?: string; cor_texto?: string; cor_texto_muted?: string;
    cor_borda?: string; cor_botao?: string; cor_botao_texto?: string;
    logo_empresa?: string;
  } | null;

  const temaStyle = tema ? {
    "--t-primary": tema.cor_primaria || "#16a34a",
    "--t-secondary": tema.cor_secundaria || "#000",
    "--t-bg": tema.cor_fundo || "#0A0A0A",
    "--t-card": tema.cor_card || "#1A1A1A",
    "--t-text": tema.cor_texto || "#FFF",
    "--t-muted": tema.cor_texto_muted || "#999",
    "--t-border": tema.cor_borda || tema.cor_primaria || "#333",
    "--t-btn": tema.cor_botao || tema.cor_primaria || "#16a34a",
    "--t-btn-text": tema.cor_botao_texto || "#FFF",
  } as React.CSSProperties : undefined;

  const t = !!tema;

  return (
    <div
      className={`space-y-6 animate-fade-in ${t ? "rounded-2xl p-4 -mx-4" : ""}`}
      style={t ? { ...temaStyle, backgroundColor: "var(--t-bg)", color: "var(--t-text)" } : undefined}
    >
      {xpToast && <XPToast xp={xpToast.xp} message={xpToast.msg} onDone={() => setXPToast(null)} />}
      <SEOHead
        title={bolao ? `Bolão ${bolao.nome}` : "Bolão"}
        description={bolao ? `Participe do bolão ${bolao.nome} e faça seus palpites!` : "Bolão na Copa"}
        path={`/bolao/${id}`}
        schema={bolao ? {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": `Bolão ${bolao.nome}`,
          "description": `Bolão de futebol online: ${bolao.nome}. Faça seus palpites e dispute com amigos.`,
          "url": `https://www.bolaonacopa.com.br/bolao/${id}`,
          "organizer": {
            "@type": "Organization",
            "name": "Bolão na Copa",
            "url": "https://www.bolaonacopa.com.br"
          }
        } : undefined}
      />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/home")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingNome ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNome();
                    if (e.key === "Escape") setEditingNome(false);
                  }}
                  className="h-9 text-lg font-bold bg-white border-copa-green-300 focus:border-copa-green-500"
                  maxLength={50}
                  autoFocus
                  disabled={savingNome}
                />
                <Button
                  size="sm"
                  onClick={handleSaveNome}
                  disabled={savingNome}
                  className="bg-copa-green-600 hover:bg-copa-green-700 text-white h-9 px-3 rounded-lg"
                >
                  {savingNome ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingNome(false)}
                  className="h-9 px-2"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold truncate">{bolao.nome}</h2>
                {bolao.criador_id === user?.id && !bolao.is_nacional && (
                  <button
                    onClick={() => {
                      setNovoNome(bolao.nome);
                      setEditingNome(true);
                    }}
                    className="text-muted-foreground hover:text-copa-green-600 transition-colors flex-shrink-0"
                    title="Editar nome do bolão"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Modo de Jogo */}
            <button
              onClick={() => setShowRegrasModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-copa-green-100 text-copa-green-700 rounded-full px-2.5 py-1 hover:bg-copa-green-200 transition-colors"
            >
              <Trophy className="w-3 h-3" />
              Modo de Jogo
              <ChevronRight className="w-3 h-3" />
            </button>
            {/* Botão Campeonatos */}
            <button
              onClick={() => setShowCampeonatosModal(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-muted text-muted-foreground rounded-full px-2.5 py-1 hover:bg-gray-200 transition-colors"
            >
              <Users className="w-3 h-3" />
              {campeonatosVinculados.length > 0
                ? `${campeonatosVinculados.length} Campeonato${campeonatosVinculados.length > 1 ? "s" : ""}`
                : "Campeonatos"
              }
              <ChevronRight className="w-3 h-3" />
            </button>
            <p className="text-sm text-muted-foreground">
              {totalParticipantes.toLocaleString("pt-BR")} participantes
            </p>
            {bolao.codigo_convite && (
              <>
                <span className="text-muted-foreground">•</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bolao.codigo_convite!);
                    toast.success("Código copiado!");
                  }}
                  className="flex items-center gap-1 text-sm font-mono font-bold text-copa-green-600 hover:text-copa-green-700 transition-colors"
                  title="Copiar código"
                >
                  {bolao.codigo_convite}
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {bolao.codigo_convite && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const url = Capacitor.isNativePlatform() ? STORE_URL : getInviteUrl(id!, bolao.codigo_convite!, "whatsapp");
                  const text = Capacitor.isNativePlatform()
                    ? `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nBaixe o app: ${url}`
                    : `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nÉ só acessar: ${url}`;
                  trackEvent('enviar_convite', {
                    metodo: 'whatsapp',
                    bolao_id: id || '',
                  });
                  darXP("compartilhar", 10).then((ganhou) => {
                    if (ganhou) setXPToast({ xp: 10, msg: "Resultado compartilhado!" });
                  });
                  shareViaWhatsApp(text);
                }}
                className="rounded-full h-9 w-9 border-[#25D366] text-[#25D366] hover:bg-green-50"
                title="Convidar pelo WhatsApp"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const url = Capacitor.isNativePlatform() ? STORE_URL : getInviteUrl(id!, bolao.codigo_convite!, "whatsapp");
                  const text = Capacitor.isNativePlatform()
                    ? `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nBaixe o app: ${url}`
                    : `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nÉ só acessar: ${url}`;
                  trackEvent('enviar_convite', {
                    metodo: navigator.share ? 'share_nativo' : 'copiar_link',
                    bolao_id: id || '',
                  });
                  darXP("compartilhar", 10).then((ganhou) => {
                    if (ganhou) setXPToast({ xp: 10, msg: "Resultado compartilhado!" });
                  });
                  if (navigator.share) {
                    navigator.share({ title: `Bolão: ${bolao.nome}`, text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text);
                    toast.success("Link copiado para compartilhar!");
                  }
                }}
                className="rounded-full h-9 w-9 border-copa-green-200 text-copa-green-600 hover:bg-copa-green-50"
                title="Compartilhar bolão"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {(bolao.campeonatos as any)?.logo_url && (
            <img
              src={(bolao.campeonatos as any).logo_url}
              alt=""
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-48 rounded-2xl overflow-hidden shadow-md group">
        <img
          src={
            (Capacitor.isNativePlatform() && (bolao as any).imagem_url_mobile)
              ? (bolao as any).imagem_url_mobile
              : bolao.imagem_url ||
            "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=400&fit=crop"
          }
          alt={bolao.nome}
          className="w-full h-full object-cover"
          style={{ objectPosition: (bolao as any).imagem_posicao || "center 50%" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=400&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {bolao.criador_id === user?.id && !bolao.is_nacional && (
          <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-all backdrop-blur-sm">
            {uploadingCapa ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {uploadingCapa ? "Enviando..." : "Alterar capa"}
            <input
              type="file"
              accept="image/*"
              onChange={handleCapaUpload}
              className="hidden"
              disabled={uploadingCapa}
            />
          </label>
        )}
      </div>

      {/* Editor de posição da capa */}
      {capaEditor && (
        <Dialog open={!!capaEditor} onOpenChange={(open) => { if (!open) { URL.revokeObjectURL(capaEditor.url); setCapaEditor(null); } }}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <DialogHeader className="px-5 pt-5 pb-2">
              <DialogTitle>Ajustar posição da capa</DialogTitle>
              <DialogDescription>
                Arraste a imagem para cima ou para baixo para ajustar o enquadramento.
              </DialogDescription>
            </DialogHeader>
            <div
              className="relative h-52 mx-5 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
              onMouseDown={(e) => {
                setIsDraggingCapa(true);
                setDragStartY(e.clientY);
                setDragStartPos(capaPositionY);
              }}
              onMouseMove={(e) => handleCapaDrag(e.clientY)}
              onMouseUp={() => setIsDraggingCapa(false)}
              onMouseLeave={() => setIsDraggingCapa(false)}
              onTouchStart={(e) => {
                setIsDraggingCapa(true);
                setDragStartY(e.touches[0].clientY);
                setDragStartPos(capaPositionY);
              }}
              onTouchMove={(e) => handleCapaDrag(e.touches[0].clientY)}
              onTouchEnd={() => setIsDraggingCapa(false)}
            >
              <img
                src={capaEditor.url}
                alt="Preview"
                className="w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: `center ${capaPositionY}%` }}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                ↕ Arraste para ajustar
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 pt-3">
              <span className="text-xs text-muted-foreground font-medium">Salvar para:</span>
              {(["ambos", "web", "mobile"] as const).map((opt) => (
                <button key={opt} onClick={() => setCapaTarget(opt)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${capaTarget === opt ? "bg-copa-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {opt === "ambos" ? "Web + Mobile" : opt === "web" ? "Web" : "Mobile"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-3">
              <Button
                variant="outline"
                onClick={() => { URL.revokeObjectURL(capaEditor.url); setCapaEditor(null); }}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCapa}
                disabled={uploadingCapa}
                className="bg-copa-green-600 hover:bg-copa-green-700 text-white rounded-xl"
              >
                {uploadingCapa ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {uploadingCapa ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ PROMO PAULISTÃO ═══ */}
      {id === "71851d2a-88fa-4ec4-a780-7c1e450869ef" && (
        <PromoBolaoHeader regulamentoUrl="/regulamento-bolao-paulistao.html" />
      )}

      {/* ═══ 1. RANKING ═══ */}
      <Card className="rounded-2xl shadow-sm" style={t ? { backgroundColor: "var(--t-card)", borderColor: "var(--t-border)", color: "var(--t-text)" } : undefined}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-400" />
              Ranking
            </CardTitle>
            <div className="flex items-center gap-3">
              {(rankingTab === "geral" ? ranking : rankingRodada).length > 5 && (
                <button onClick={() => { setShowFullRanking(!showFullRanking); if (!showFullRanking) triggerFeedback(); }} className="text-sm text-copa-green-500 font-medium hover:underline">
                  {showFullRanking ? "Ver menos" : "Ver ranking completo"}
                </button>
              )}
            </div>
          </div>
          {/* ── Tabs: Geral | Esta Rodada ── */}
          {ranking.length > 0 && (
            <div className="flex gap-1 mt-2 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => { setRankingTab("geral"); setShowFullRanking(false); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                  rankingTab === "geral"
                    ? "bg-white text-copa-green-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Geral
              </button>
              <button
                onClick={() => {
                  setRankingTab("rodada");
                  setShowFullRanking(false);
                  if (rankingRodada.length === 0) fetchRankingRodada();
                }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                  rankingTab === "rodada"
                    ? "bg-white text-copa-green-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Esta Semana
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {/* ── Conteúdo do ranking (Geral ou Rodada) ── */}
          {rankingTab === "rodada" && loadingRodada ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Calculando rodada...
            </div>
          ) : rankingTab === "rodada" && rankingRodada.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum palpite pontuado nesta rodada ainda.
            </p>
          ) : (rankingTab === "geral" && ranking.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ranking será atualizado após os primeiros jogos.
            </p>
          ) : (
            (showFullRanking
              ? (rankingTab === "geral" ? ranking : rankingRodada)
              : (rankingTab === "geral" ? ranking : rankingRodada).slice(0, 5)
            ).map((player) => (
              <div
                key={`${rankingTab}-${player.pos}`}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  player.isCurrentUser
                    ? "bg-copa-green-50 border border-copa-green-200"
                    : player.pos === 1
                    ? "bg-copa-gold-50 border border-copa-gold-200"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-copa-green-600 w-6 text-center">
                    {player.pos === 1 ? (
                      <Medal className="w-5 h-5 text-copa-gold-400 inline" />
                    ) : (
                      player.pos
                    )}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t ? "" : "bg-copa-green-100 text-copa-green-600"}`} style={t ? { backgroundColor: "var(--t-secondary)", color: "var(--t-primary)", border: "1px solid var(--t-border)" } : undefined}>
                    {player.avatar}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      player.isCurrentUser ? "text-copa-green-700 font-bold" : ""
                    }`}
                  >
                    {player.nome}
                    {player.isCurrentUser && (
                      <span className="text-[10px] text-copa-green-500 ml-1">
                        (você)
                      </span>
                    )}
                    {niveisRanking[player.userId || ""] > 1 && (
                      <NivelBadge nivel={niveisRanking[player.userId || ""]} size="sm" />
                    )}
                    {streaksRanking[player.userId || ""] >= 2 && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0.5">
                        🔥 {streaksRanking[player.userId || ""]}
                      </span>
                    )}
                  </span>
                </div>
                <span className={`text-sm font-bold ${t ? "" : "text-copa-green-600"}`} style={t ? { color: "var(--t-primary)" } : undefined}>
                  {player.pontos} pts
                </span>
              </div>
            ))
          )}
          {/* ═══ Mensagem motivacional contextual ═══ */}
          {(rankingTab === "geral" ? ranking : rankingRodada).length > 0 && (() => {
            const activeRanking = rankingTab === "geral" ? ranking : rankingRodada;
            const msg = getRankingMessage(activeRanking, user?.id);
            if (!msg) return null;
            return (
              <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-[13px] font-medium mt-1 ${msg.color}`}>
                <span className="text-base flex-shrink-0">{msg.emoji}</span>
                <span>{msg.text}</span>
              </div>
            );
          })()}
          {ranking.length > 0 && bolao.codigo_convite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = Capacitor.isNativePlatform() ? STORE_URL : getInviteUrl(id!, bolao.codigo_convite!, "whatsapp");
                const text = Capacitor.isNativePlatform()
                  ? `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nBaixe o app: ${url}`
                  : `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nÉ só acessar: ${url}`;
                // Analytics: Convite enviado
                trackEvent('enviar_convite', {
                  metodo: navigator.share ? 'share_nativo' : 'copiar_link',
                  bolao_id: id || '',
                });
                // Gamificação: +10 XP por compartilhar
                darXP("compartilhar", 10).then((ganhou) => {
                  if (ganhou) setXPToast({ xp: 10, msg: "Resultado compartilhado!" });
                });
                if (navigator.share) {
                  navigator.share({ title: `Bolão: ${bolao.nome}`, text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text);
                  toast.success("Link copiado para compartilhar!");
                }
              }}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${t ? "" : "bg-copa-green-50 border border-copa-green-200 text-copa-green-600 hover:bg-copa-green-100"}`}
              style={t ? { backgroundColor: "var(--t-secondary)", borderColor: "var(--t-border)", color: "var(--t-primary)", border: "1px solid var(--t-border)" } : undefined}
            >
              <Users className="w-4 h-4" /> Convide seus amigos!
            </button>
          )}
        </CardContent>
      </Card>
      {!bolao.is_nacional && (
        <EventosEspeciais
          bolaoId={id!}
          campeonatoId={bolao.campeonato_id}
          campeonatos={campeonatosVinculados}
          isCriador={bolao.criador_id === user?.id}
          userId={user?.id || ""}
        />
      )}

      {/* Banner Ad entre ranking e palpites */}

      {/* ═══ 2. PALPITES ou MATA A MATA ═══ */}
      {bolao?.modo_pontuacao === "mata_mata" ? (
        <MataMataDashboard bolaoId={id!} campeonatoId={bolao.campeonato_id} />
      ) : (
      <Card className={`rounded-2xl shadow-sm ${t ? "" : "border-copa-gold-200 bg-copa-gold-50"}`} style={t ? { backgroundColor: "var(--t-card)", borderColor: "var(--t-border)", color: "var(--t-text)" } : undefined}>
        <CardContent className="p-5">
          <div className="mb-3">
            <h3 className={`text-lg font-bold mb-2 ${t ? "" : "text-copa-green-700"}`} style={t ? { color: "var(--t-primary)" } : undefined}>
              Faça seus palpites
            </h3>
            <div className="flex items-center gap-1.5 min-w-0">
              {bolao.codigo_convite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = Capacitor.isNativePlatform() ? STORE_URL : getInviteUrl(id!, bolao.codigo_convite!, "whatsapp");
                    const text = Capacitor.isNativePlatform()
                  ? `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nBaixe o app: ${url}`
                  : `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nÉ só acessar: ${url}`;
                    // Analytics: Convite enviado
                    trackEvent('enviar_convite', {
                      metodo: navigator.share ? 'share_nativo' : 'copiar_link',
                      bolao_id: id || '',
                    });
                    // Gamificação: +10 XP por compartilhar
                    darXP("compartilhar", 10).then((ganhou) => {
                      if (ganhou) setXPToast({ xp: 10, msg: "Resultado compartilhado!" });
                    });
                    if (navigator.share) {
                      navigator.share({ title: `Bolão: ${bolao.nome}`, text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text);
                      toast.success("Link copiado para compartilhar!");
                    }
                  }}
                  className="flex-1 min-w-0 text-copa-gold-600 border-copa-gold-400 bg-copa-gold-100 hover:bg-copa-gold-200 font-semibold rounded-lg text-[11px] h-9 px-2"
                >
                  <Users className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" /> Convidar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={openCopyDialog}
                className="flex-1 min-w-0 text-copa-green-600 border-copa-green-300 hover:bg-copa-green-50 font-semibold rounded-lg text-[11px] h-9 px-2"
              >
                <Copy className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" /> Copiar
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/bolao/${id}/palpites`)}
                className="flex-1 min-w-0 bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg h-9 text-[11px] px-2"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5 ml-0.5 flex-shrink-0" />
              </Button>
            </div>
          </div>

          {/* Jogos ao vivo */}
          {jogosAoVivo.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-red-600">Ao vivo</span>
              </div>
              <div className="space-y-2">
                {jogosAoVivo.map((jogo) => (
                  <ExpandableJogoRow
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    isExpanded={expandedJogo === jogo.id}
                    onToggle={() => toggleJogoPalpites(jogo.id)}
                    participantPalpites={participantPalpites[jogo.id] || []}
                    isLoadingPalpites={loadingPalpites === jogo.id}
                    currentUserId={user?.id}
                    onNavigate={() => navigate(`/bolao/${id}/palpites?jogo=${jogo.id}`)}
                    themed={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Jogos em andamento (agendados cuja data já passou) */}
          {jogosEmAndamento.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-amber-600">Em andamento</span>
              </div>
              <div className="space-y-2">
                {jogosEmAndamento.map((jogo) => (
                  <ExpandableJogoRow
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    isExpanded={expandedJogo === jogo.id}
                    onToggle={() => toggleJogoPalpites(jogo.id)}
                    participantPalpites={participantPalpites[jogo.id] || []}
                    isLoadingPalpites={loadingPalpites === jogo.id}
                    currentUserId={user?.id}
                    onNavigate={() => navigate(`/bolao/${id}/palpites?jogo=${jogo.id}`)}
                    themed={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Jogos de hoje */}
          {jogosHoje.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-copa-gold-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-copa-gold-600">
                  Hoje
                </span>
                <span className="text-[10px] bg-copa-gold-100 text-copa-gold-600 rounded-full px-2 py-0.5 font-bold">
                  {jogosHoje.length}
                </span>
              </div>
              <div className="space-y-2">
                {jogosHoje.map((jogo) => (
                  <ExpandableJogoRow
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    isExpanded={expandedJogo === jogo.id}
                    onToggle={() => toggleJogoPalpites(jogo.id)}
                    participantPalpites={participantPalpites[jogo.id] || []}
                    isLoadingPalpites={loadingPalpites === jogo.id}
                    currentUserId={user?.id}
                    onNavigate={() => navigate(`/bolao/${id}/palpites?jogo=${jogo.id}`)}
                    highlight
                  />
                ))}
              </div>
            </div>
          )}

          {/* Próximos jogos (outros dias) */}
          {jogosRestantes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-copa-green-500 rounded-full" />
                <span className="text-xs font-semibold text-copa-green-600">
                  Próximos jogos
                </span>
              </div>
              <div className="space-y-2">
                {jogosRestantes.slice(0, 5).map((jogo) => (
                  <ExpandableJogoRow
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    isExpanded={expandedJogo === jogo.id}
                    onToggle={() => toggleJogoPalpites(jogo.id)}
                    participantPalpites={participantPalpites[jogo.id] || []}
                    isLoadingPalpites={loadingPalpites === jogo.id}
                    currentUserId={user?.id}
                    onNavigate={() => navigate(`/bolao/${id}/palpites?jogo=${jogo.id}`)}
                    themed={t}
                  />
                ))}
              </div>
            </div>
          )}

          {jogosHoje.length === 0 && jogosRestantes.length === 0 && jogosAoVivo.length === 0 && jogosEmAndamento.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum jogo agendado no momento.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {/* ═══ 4. ÚLTIMOS RESULTADOS ═══ */}
      {jogosEncerrados.length > 0 && (
        <Card className="rounded-2xl shadow-sm" style={t ? { backgroundColor: "var(--t-card)", borderColor: "var(--t-border)", color: "var(--t-text)" } : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2" style={t ? { color: "var(--t-muted)" } : undefined}>
              Últimos resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jogosEncerrados.map((jogo) => (
              <ExpandableJogoRow
                key={jogo.id}
                jogo={jogo}
                palpite={palpites[jogo.id] || null}
                now={now}
                isExpanded={expandedJogo === jogo.id}
                onToggle={() => toggleJogoPalpites(jogo.id)}
                participantPalpites={participantPalpites[jogo.id] || []}
                isLoadingPalpites={loadingPalpites === jogo.id}
                currentUserId={user?.id}
                themed={t}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ SAIR / EXCLUIR BOLÃO ═══ */}
      <div className="pt-4 border-t border-dashed border-gray-200 space-y-3">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Sair do bolão
        </button>
        {bolao.criador_id === user?.id && (
          <button
            onClick={() => { setDeleteInput(""); setShowDeleteConfirm(true); }}
            className="flex items-center gap-2 text-xs text-red-300 hover:text-red-500 transition-colors mx-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir bolão
          </button>
        )}
      </div>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">
              Sair do bolão?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Tem certeza que deseja sair de <strong>{bolao.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 rounded-xl p-3 mt-2">
            <p className="text-sm text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Atenção: todos os seus palpites e pontos neste bolão serão perdidos permanentemente.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLeaveBolao}
              disabled={leaving}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              {leaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(v) => { setShowDeleteConfirm(v); if (!v) setDeleteInput(""); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Excluir bolão
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Esta ação é <strong>irreversível</strong>. Todos os participantes, palpites e pontuações serão apagados permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 rounded-xl p-3 mt-2">
            <p className="text-sm text-red-700">
              Para confirmar, digite: <strong className="font-mono">Excluir {bolao.nome}</strong>
            </p>
          </div>
          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder={`Excluir ${bolao.nome}`}
            className="w-full h-11 px-4 rounded-xl border-2 border-red-200 focus:border-red-500 focus:outline-none text-sm mt-2"
          />
          <div className="flex gap-3 mt-3">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteBolao}
              disabled={deleting || deleteInput !== `Excluir ${bolao.nome}`}
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Palpites Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-copa-green-700">
              Copiar palpites
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Copie os palpites que você já fez em outro bolão do mesmo campeonato para este.
            </DialogDescription>
          </DialogHeader>
          {otherBoloes.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Você não participa de outro bolão com o mesmo campeonato.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {otherBoloes.map((ob) => (
                <button
                  key={ob.id}
                  disabled={copying}
                  onClick={() => copyPalpitesFrom(ob.id)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-transparent bg-muted/50 hover:bg-copa-green-50 hover:border-copa-green-200 transition-all text-left"
                >
                  <span className="text-sm font-semibold">{ob.nome}</span>
                  {copying ? (
                    <Loader2 className="w-4 h-4 animate-spin text-copa-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-copa-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RegrasModal
        regras={bolao ? MODO_REGRAS[bolao.modo_pontuacao] || null : null}
        open={showRegrasModal}
        onClose={() => setShowRegrasModal(false)}
      />

      {/* Modal Campeonatos Vinculados */}
      <Dialog open={showCampeonatosModal} onOpenChange={setShowCampeonatosModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-copa-green-500" />
              Campeonatos
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Este bolão inclui jogos dos seguintes campeonatos:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {campeonatosVinculados.length > 0 ? (
              campeonatosVinculados.map((camp) => (
                <div key={camp.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
                  {camp.logo_url ? (
                    <img src={camp.logo_url} alt="" className="w-7 h-7 object-contain flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-7 h-7 bg-copa-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-3.5 h-3.5 text-copa-green-600" />
                    </div>
                  )}
                  <span className="text-sm font-semibold">{camp.nome_popular}</span>
                </div>
              ))
            ) : bolao?.campeonatos?.nome_popular ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50">
                {(bolao.campeonatos as any)?.logo_url && (
                  <img src={(bolao.campeonatos as any).logo_url} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                )}
                <span className="text-sm font-semibold">{bolao.campeonatos.nome_popular}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum campeonato vinculado.</p>
            )}
          </div>
          {bolao && bolao.criador_id === user?.id && !bolao.is_nacional && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCampeonatosModal(false);
                setShowGerenciarCampeonatos(true);
              }}
              className="w-full mt-2 rounded-xl text-copa-green-600 border-copa-green-200 hover:bg-copa-green-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Gerenciar campeonatos
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Campeonatos */}
      {bolao && bolao.criador_id === user?.id && (
        <GerenciarCampeonatos
          bolaoId={bolao.id}
          isOpen={showGerenciarCampeonatos}
          onClose={() => setShowGerenciarCampeonatos(false)}
          onUpdated={() => loadBolao()}
        />
      )}

    </div>
  );
};

const ExpandableJogoRow = ({
  jogo,
  palpite,
  now,
  isExpanded,
  onToggle,
  participantPalpites: pList,
  isLoadingPalpites,
  currentUserId,
  onNavigate,
  highlight,
  themed,
}: {
  jogo: Jogo;
  palpite: Palpite | null;
  now: Date;
  isExpanded: boolean;
  onToggle: () => void;
  participantPalpites: any[];
  isLoadingPalpites: boolean;
  currentUserId?: string;
  onNavigate?: () => void;
  highlight?: boolean;
  themed?: boolean;
}) => {
  const isEncerrado = jogo.status === "encerrado";
  const isAoVivo = jogo.status === "ao_vivo";
  const jogoDate = new Date(jogo.data_hora);
  const started = jogoDate.getTime() <= now.getTime();
  const palpiteFechado = jogoDate.getTime() - 10 * 60 * 1000 <= now.getTime(); // 10min antes
  const hasPalpite = !!palpite;
  const pontos = palpite?.pontos ?? 0;
  const canExpand = isEncerrado || isAoVivo || started || palpiteFechado;

  // Palpite color for encerrado
  let palpiteColor = "text-gray-400";
  let pontosColor = "text-gray-400 bg-gray-100";
  if (isEncerrado && hasPalpite && pontos > 0) {
    if (palpite!.placar_time_a === jogo.placar_time_a && palpite!.placar_time_b === jogo.placar_time_b) {
      palpiteColor = "text-copa-green-600";
      pontosColor = "text-copa-green-700 bg-copa-green-100";
    } else {
      palpiteColor = "text-amber-600";
      pontosColor = "text-amber-700 bg-amber-100";
    }
  } else if (isEncerrado && hasPalpite) {
    palpiteColor = "text-red-400";
    pontosColor = "text-red-500 bg-red-50";
  }

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      themed ? ""
        : isEncerrado ? "bg-gray-50/80 border-gray-100"
        : highlight ? "bg-copa-gold-50 border-copa-gold-200 shadow-sm"
        : "bg-white border-gray-100 hover:shadow-md"
    }`} style={themed ? { backgroundColor: "var(--t-secondary)", borderColor: "var(--t-border)", color: "var(--t-text)" } : undefined}>
      {/* Main game row */}
      <div className="px-4 py-3 space-y-2">
        {/* Fase / Rodada */}
        {(jogo.fase || jogo.rodada) && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {[traduzirFase(jogo.fase), jogo.rodada].filter(Boolean).join(" • ")}
          </p>
        )}

        {/* Teams + Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {jogo.logo_time_a ? (
              <img src={jogo.logo_time_a} alt={jogo.time_a} className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />}
            <span className="text-sm font-semibold truncate">{jogo.time_a}</span>
          </div>

          <div className="flex items-center gap-1.5 mx-3 flex-shrink-0">
            {isEncerrado || isAoVivo ? (
              <div className="flex items-center gap-1">
                <span className={`text-base font-black ${isAoVivo ? "text-red-600" : ""}`}>{jogo.placar_time_a ?? 0}</span>
                <span className="text-xs text-muted-foreground font-bold">x</span>
                <span className={`text-base font-black ${isAoVivo ? "text-red-600" : ""}`}>{jogo.placar_time_b ?? 0}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground font-bold">vs</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold truncate text-right">{jogo.time_b}</span>
            {jogo.logo_time_b ? (
              <img src={jogo.logo_time_b} alt={jogo.time_b} className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />}
          </div>
        </div>

        {/* Date + Palpite + Status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {formatDataJogo(jogo.data_hora)}
          </span>
          <div className="flex items-center gap-1.5">
            {isEncerrado && hasPalpite ? (
              <>
                <span className={`text-[10px] font-semibold whitespace-nowrap ${palpiteColor}`}>
                  Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
                </span>
                <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${pontosColor}`}>
                  {pontos > 0 ? `+${pontos} pts` : "0 pts"}
                </span>
              </>
            ) : isEncerrado && !hasPalpite ? (
              <span className="text-[10px] text-gray-400">Sem palpite</span>
            ) : hasPalpite ? (
              <Badge variant="secondary" className="text-[10px] font-medium border-0 px-2 py-0.5 text-copa-green-600 bg-copa-green-100 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
              </Badge>
            ) : (isAoVivo || started) ? (
              <span className="text-[10px] text-red-400 font-semibold whitespace-nowrap">Sem palpite</span>
            ) : onNavigate ? (
              <button
                onClick={(e) => { e.stopPropagation(); onNavigate(); }}
                className="flex items-center gap-1.5 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold text-xs rounded-lg px-3 py-1.5 shadow-sm transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Fazer palpite
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Expand toggle for participant palpites */}
      {canExpand && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-gray-100 bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
        >
          <Eye className="w-3 h-3" />
          <span className="font-medium">Palpites dos participantes</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Expanded: participant palpites */}
      {isExpanded && canExpand && (
        <div className="border-t bg-muted/30 px-4 py-2 space-y-1.5">
          {isLoadingPalpites ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-copa-green-500" />
            </div>
          ) : pList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum palpite registrado.
            </p>
          ) : (
            pList.map((p: any, idx: number) => {
              const isExact = isEncerrado && p.placar_a === jogo.placar_time_a && p.placar_b === jogo.placar_time_b;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    p.isCurrentUser
                      ? "bg-copa-green-50 border border-copa-green-200"
                      : isExact
                      ? "bg-copa-gold-50"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-copa-green-100 rounded-full flex items-center justify-center text-[10px] font-bold text-copa-green-600 flex-shrink-0">
                      {p.avatar}
                    </div>
                    <span className={`text-xs font-medium ${p.isCurrentUser ? "text-copa-green-700 font-bold" : ""}`}>
                      {p.nome}
                      {p.isCurrentUser && <span className="text-[9px] text-copa-green-500 ml-1">(você)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isExact ? "text-copa-green-600" : ""}`}>
                      {p.placar_a} x {p.placar_b}
                    </span>
                    {isEncerrado && p.pontos != null && (
                      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                        p.pontos > 0
                          ? "text-copa-green-700 bg-copa-green-100"
                          : "text-gray-400 bg-gray-100"
                      }`}>
                        {p.pontos > 0 ? `+${p.pontos}` : "0"} pts
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default BolaoPage;
