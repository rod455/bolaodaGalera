import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Trophy, Users, ChevronRight, Medal, Loader2, Clock,
  CheckCircle2, AlertCircle, Lock, Share2, Copy, LogOut, Trash2, Eye, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RegrasModal from "@/components/RegrasModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EventosEspeciais from "@/components/EventosEspeciais";
import type { Bolao, Jogo, Palpite, RankingEntry } from "@/lib/types";
import { MODO_LABELS, MODO_REGRAS } from "@/lib/constants";
import { formatDataJogo, traduzirFase, getInitials } from "@/lib/formatters";

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

const BolaoPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [bolao, setBolao] = useState<Bolao | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({});
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
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

  useEffect(() => {
    if (id && user) loadBolao();
    // Auto-refresh every 60 seconds for live score updates
    const interval = setInterval(() => { if (id && user) loadBolao(); }, 60000);
    return () => clearInterval(interval);
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

      // Fetch upcoming + recent games (limit 5 upcoming, 3 recent)
      if (bolaoData.campeonato_id) {
        const now = new Date();

        // Próximos jogos (agendados no futuro)
        const { data: proximos } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "agendado")
          .gte("data_hora", now.toISOString())
          .order("data_hora", { ascending: true })
          .limit(5);

        // Jogos agendados que já começaram (data_hora passed but status not yet updated)
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const { data: emAndamento } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "agendado")
          .lt("data_hora", now.toISOString())
          .gte("data_hora", twoHoursAgo.toISOString())
          .order("data_hora", { ascending: true });

        // Jogos recentes (encerrados, últimos 5)
        const { data: recentes } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "encerrado")
          .order("data_hora", { ascending: false })
          .limit(5);

        // Jogos ao vivo
        const { data: aoVivo } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
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
            .eq("user_id", user!.id)
            .eq("bolao_id", id!)
            .in("jogo_id", jogoIds);

          let palpitesList = userPalpites;
          if (palpError) {
            // Fallback without pontos column
            const { data: fallback } = await supabase
              .from("palpites")
              .select("jogo_id, placar_time_a, placar_time_b")
              .eq("user_id", user!.id)
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

      // Fetch ranking (top 10)
      const { data: participantes } = await supabase
        .from("bolao_participantes")
        .select("user_id, pontuacao_total, posicao_ranking, profiles(nome, avatar_url)")
        .eq("bolao_id", id!)
        .order("pontuacao_total", { ascending: false })
        .limit(10);

      const rankingList: RankingEntry[] = (participantes || []).map(
        (p: any, idx: number) => {
          const nome = p.profiles?.nome || "Usuário";
          return {
            pos: p.posicao_ranking || idx + 1,
            nome,
            avatar: getInitials(nome),
            pontos: p.pontuacao_total || 0,
            isCurrentUser: p.user_id === user!.id,
          };
        }
      );
      setRanking(rankingList);
    } catch (err) {
      console.error("Erro ao carregar bolão:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCopyDialog = async () => {
    if (!user || !bolao) return;
    // Find other bolões the user participates in with the same campeonato
    const { data: participacoes } = await supabase
      .from("bolao_participantes")
      .select("bolao_id, boloes(id, nome, campeonato_id)")
      .eq("user_id", user.id);

    const others = (participacoes || [])
      .filter((p: any) => p.boloes && p.boloes.id !== id && p.boloes.campeonato_id === bolao.campeonato_id)
      .map((p: any) => ({ id: p.boloes.id, nome: p.boloes.nome, campeonato_id: p.boloes.campeonato_id }));

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
    } catch (err: any) {
      console.error("Erro ao copiar palpites:", err);
      toast.error("Erro ao copiar palpites");
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!bolao) return null;

  const handleLeaveBolao = async () => {
    if (!user || !id) return;
    setLeaving(true);
    try {
      await supabase.from("palpites").delete().eq("user_id", user.id).eq("bolao_id", id);
      await supabase.from("bolao_participantes").delete().eq("user_id", user.id).eq("bolao_id", id);
      toast.success("Você saiu do bolão.");
      navigate("/home");
    } catch (err: any) {
      console.error("Erro ao sair:", err);
      toast.error("Erro ao sair do bolão.");
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDeleteBolao = async () => {
    if (!user || !id || !bolao) return;
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
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
      toast.error("Erro ao excluir bolão.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
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
        console.error("Erro ao buscar palpites:", palpErr);
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
    } catch (err) {
      console.error("Erro ao carregar palpites:", err);
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

  return (
    <div className="space-y-6 animate-fade-in">
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
          <h2 className="text-2xl font-bold truncate">{bolao.nome}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowRegrasModal(true)}
              className="flex items-center gap-1 text-[10px] font-bold bg-copa-green-100 text-copa-green-700 rounded-full px-2 py-0.5 hover:bg-copa-green-200 transition-colors"
            >
              {MODO_LABELS[bolao.modo_pontuacao] || bolao.modo_pontuacao}
              <Info className="w-3 h-3" />
            </button>
            {bolao.campeonatos?.nome_popular && (
              <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                {bolao.campeonatos.nome_popular}
              </span>
            )}
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const url = `${window.location.origin}/entrar?codigo=${bolao.codigo_convite}`;
                const text = `🏆 Entra no meu bolão "${bolao.nome}"!\n\nCódigo: ${bolao.codigo_convite}\n\nÉ só acessar: ${url}`;
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
      <div className="relative h-48 rounded-2xl overflow-hidden shadow-md">
        <img
          src={
            bolao.imagem_url ||
            "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=400&fit=crop"
          }
          alt={bolao.nome}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=400&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* ═══ 1. RANKING ═══ */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-400" />
              Ranking
            </CardTitle>
            {ranking.length > 5 && (
              <button className="text-sm text-copa-green-500 font-medium hover:underline">
                Ver ranking completo
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ranking será atualizado após os primeiros jogos.
            </p>
          ) : (
            ranking.slice(0, 5).map((player) => (
              <div
                key={player.pos}
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
                  <div className="w-8 h-8 bg-copa-green-100 rounded-full flex items-center justify-center text-xs font-bold text-copa-green-600">
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
                  </span>
                </div>
                <span className="text-sm font-bold text-copa-green-600">
                  {player.pontos} pts
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ═══ 1.5 EVENTOS ESPECIAIS ═══ */}
      <EventosEspeciais
        bolaoId={id!}
        campeonatoId={bolao.campeonato_id}
        isCriador={bolao.criador_id === user?.id}
        userId={user?.id || ""}
      />

      {/* ═══ 2. PALPITES - Próximos jogos clicáveis ═══ */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-200 bg-copa-gold-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-copa-green-700">
              Faça seus palpites
            </h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={openCopyDialog}
                className="text-copa-green-600 border-copa-green-300 hover:bg-copa-green-50 font-semibold rounded-lg text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/bolao/${id}/palpites`)}
                className="bg-copa-green-500 hover:bg-copa-green-600 text-white font-semibold rounded-lg"
              >
                Ver todos <ChevronRight className="w-4 h-4 ml-1" />
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
                    isExpanded={false}
                    onToggle={() => {}}
                    participantPalpites={[]}
                    isLoadingPalpites={false}
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
                    isExpanded={false}
                    onToggle={() => {}}
                    participantPalpites={[]}
                    isLoadingPalpites={false}
                    currentUserId={user?.id}
                    onNavigate={() => navigate(`/bolao/${id}/palpites?jogo=${jogo.id}`)}
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

      {/* ═══ 4. ÚLTIMOS RESULTADOS ═══ */}
      {jogosEncerrados.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-muted-foreground">
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
      isEncerrado ? "bg-gray-50/80 border-gray-100"
        : highlight ? "bg-copa-gold-50 border-copa-gold-200 shadow-sm"
        : "bg-white border-gray-100 hover:shadow-md"
    }`}>
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
                <span className={`text-[10px] font-semibold ${palpiteColor}`}>
                  Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
                </span>
                <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${pontosColor}`}>
                  {pontos > 0 ? `+${pontos} pts` : "0 pts"}
                </span>
              </>
            ) : isEncerrado && !hasPalpite ? (
              <span className="text-[10px] text-gray-400">Sem palpite</span>
            ) : hasPalpite ? (
              <Badge variant="secondary" className="text-[10px] font-medium border-0 px-2 py-0.5 text-copa-green-600 bg-copa-green-100">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
              </Badge>
            ) : onNavigate ? (
              <Badge
                variant="secondary"
                className="text-[10px] font-medium border-0 px-2 py-0.5 text-amber-600 bg-amber-50 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              >
                <Clock className="w-3 h-3 mr-1" />
                Fazer palpite
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Badge>
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
