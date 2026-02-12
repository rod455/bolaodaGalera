import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Trophy, Users, ChevronRight, Medal, Loader2, Clock,
  CheckCircle2, AlertCircle, Lock, Share2, Copy, LogOut, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Bolao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  campeonato_id: string | null;
  is_nacional: boolean;
  codigo_convite: string | null;
  campeonatos?: {
    logo_url: string;
    nome_popular: string;
  } | null;
}

interface Jogo {
  id: string;
  time_a: string;
  time_b: string;
  logo_time_a: string | null;
  logo_time_b: string | null;
  data_hora: string;
  fase: string | null;
  rodada: string | null;
  status: string;
  placar_time_a: number | null;
  placar_time_b: number | null;
}

interface Palpite {
  jogo_id: string;
  placar_time_a: number;
  placar_time_b: number;
  pontos: number | null;
}

interface RankingEntry {
  pos: number;
  nome: string;
  avatar: string;
  pontos: number;
  isCurrentUser: boolean;
}

function formatDataJogo(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (isToday) return `Hoje • ${hora}`;
  if (isTomorrow) return `Amanhã • ${hora}`;

  const diffDays = Math.floor(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7 && diffDays >= 0) {
    return `${capitalWeekday} • ${hora}`;
  }

  return `${d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  })} • ${capitalWeekday} • ${hora}`;
}

const FASE_TRADUCAO: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Oitavas de Final",
  LAST_32: "Fase Eliminatória",
  QUARTER_FINALS: "Quartas de Final",
  QUARTER_FINAL: "Quartas de Final",
  SEMI_FINALS: "Semifinal",
  SEMI_FINAL: "Semifinal",
  FINAL: "Final",
  THIRD_PLACE: "Terceiro Lugar",
  PLAYOFF: "Repescagem",
  LEAGUE_STAGE: "Liga",
  REGULAR_SEASON: "Liga",
  ROUND_OF_16: "Oitavas de Final",
  ROUND_OF_32: "Fase Eliminatória",
};

function traduzirFase(fase: string | null): string | null {
  if (!fase) return null;
  return FASE_TRADUCAO[fase] || FASE_TRADUCAO[fase.toUpperCase()] || fase;
}

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
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [otherBoloes, setOtherBoloes] = useState<{ id: string; nome: string; campeonato_id: string | null }[]>([]);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (id && user) loadBolao();
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

        // Próximos jogos (agendados)
        const { data: proximos } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "agendado")
          .gte("data_hora", now.toISOString())
          .order("data_hora", { ascending: true })
          .limit(5);

        // Jogos recentes (encerrados, últimos 3)
        const { data: recentes } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "encerrado")
          .order("data_hora", { ascending: false })
          .limit(3);

        // Jogos ao vivo
        const { data: aoVivo } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", bolaoData.campeonato_id)
          .eq("status", "ao_vivo");

        const allJogos = [
          ...(aoVivo || []),
          ...(proximos || []),
          ...(recentes || []).reverse(),
        ] as Jogo[];

        // Remove duplicates
        const seen = new Set<string>();
        const uniqueJogos = allJogos.filter((j) => {
          if (seen.has(j.id)) return false;
          seen.add(j.id);
          return true;
        });

        setJogos(uniqueJogos);

        // Fetch user palpites for these games
        if (uniqueJogos.length > 0) {
          const jogoIds = uniqueJogos.map((j) => j.id);
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
          const initials = nome
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
          return {
            pos: p.posicao_ranking || idx + 1,
            nome,
            avatar: initials,
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-copa-green-500 animate-spin" />
      </div>
    );
  }

  if (!bolao) return null;

  const handleLeaveBolao = async () => {
    if (!user || !id) return;
    setLeaving(true);
    try {
      // Delete palpites first
      await supabase.from("palpites").delete().eq("user_id", user.id).eq("bolao_id", id);
      // Remove from participants
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

  const now = new Date();

  // Separate jogos into sections
  const jogosAoVivo = jogos.filter((j) => j.status === "ao_vivo");
  const jogosProximos = jogos.filter((j) => j.status === "agendado");
  const jogosEncerrados = jogos.filter((j) => j.status === "encerrado");

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
          <div className="flex items-center gap-2">
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
                  <JogoRowClickable
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    onClick={() => navigate(`/bolao/${id}/palpites`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Próximos jogos */}
          {jogosProximos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-copa-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-copa-green-600">
                  Próximos jogos
                </span>
              </div>
              <div className="space-y-2">
                {jogosProximos.slice(0, 5).map((jogo) => (
                  <JogoRowClickable
                    key={jogo.id}
                    jogo={jogo}
                    palpite={palpites[jogo.id] || null}
                    now={now}
                    onClick={() => navigate(`/bolao/${id}/palpites`)}
                  />
                ))}
              </div>
            </div>
          )}

          {jogosProximos.length === 0 && jogosAoVivo.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum jogo agendado no momento.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══ 3. ÚLTIMOS RESULTADOS ═══ */}
      {jogosEncerrados.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-muted-foreground">
              Últimos resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jogosEncerrados.map((jogo) => (
              <ResultadoRow
                key={jogo.id}
                jogo={jogo}
                palpite={palpites[jogo.id] || null}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ SAIR DO BOLÃO ═══ */}
      <div className="pt-4 border-t border-dashed border-gray-200">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Sair do bolão
        </button>
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
    </div>
  );
};

/* ─── JogoRowClickable: Próximos jogos - clicável, leva para palpites ─── */

const JogoRowClickable = ({
  jogo,
  palpite,
  now,
  onClick,
}: {
  jogo: Jogo;
  palpite: Palpite | null;
  now: Date;
  onClick: () => void;
}) => {
  const jogoDate = new Date(jogo.data_hora);
  const diffMin = (jogoDate.getTime() - now.getTime()) / (1000 * 60);
  const isLocked = diffMin <= 10;
  const hasPalpite = !!palpite;

  return (
    <div
      onClick={onClick}
      className="rounded-xl bg-white border border-gray-100 px-4 py-3 space-y-2 cursor-pointer hover:shadow-md hover:border-copa-green-200 transition-all"
    >
      {/* Fase / Rodada */}
      {(jogo.fase || jogo.rodada) && (
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {[traduzirFase(jogo.fase), jogo.rodada].filter(Boolean).join(" • ")}
        </p>
      )}

      {/* Teams row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {jogo.logo_time_a ? (
            <img src={jogo.logo_time_a} alt={jogo.time_a} className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
          <span className="text-sm font-semibold truncate">{jogo.time_a}</span>
        </div>

        <span className="text-[10px] text-muted-foreground font-bold mx-3">vs</span>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">{jogo.time_b}</span>
          {jogo.logo_time_b ? (
            <img src={jogo.logo_time_b} alt={jogo.time_b} className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Date + Status */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {formatDataJogo(jogo.data_hora)}
        </span>
        <div className="flex items-center gap-1.5">
          {hasPalpite ? (
            <Badge variant="secondary" className="text-[10px] font-medium border-0 px-2 py-0.5 text-copa-green-600 bg-copa-green-100">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
            </Badge>
          ) : isLocked ? (
            <Badge variant="secondary" className="text-[10px] font-medium border-0 px-2 py-0.5 text-gray-500 bg-gray-100">
              <Lock className="w-3 h-3 mr-1" />
              Encerrado
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] font-medium border-0 px-2 py-0.5 text-amber-600 bg-amber-50">
              <Clock className="w-3 h-3 mr-1" />
              Fazer palpite
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── ResultadoRow: Jogos encerrados com placar, palpite e pontos ─── */

const ResultadoRow = ({
  jogo,
  palpite,
}: {
  jogo: Jogo;
  palpite: Palpite | null;
}) => {
  const hasPalpite = !!palpite;
  const pontos = palpite?.pontos ?? 0;

  // Determine if palpite was exact, partial or wrong
  let palpiteColor = "text-gray-400";
  let pontosColor = "text-gray-400 bg-gray-100";
  if (hasPalpite && pontos > 0) {
    // Check if exact match
    if (
      palpite!.placar_time_a === jogo.placar_time_a &&
      palpite!.placar_time_b === jogo.placar_time_b
    ) {
      palpiteColor = "text-copa-green-600";
      pontosColor = "text-copa-green-700 bg-copa-green-100";
    } else {
      palpiteColor = "text-amber-600";
      pontosColor = "text-amber-700 bg-amber-100";
    }
  } else if (hasPalpite) {
    palpiteColor = "text-red-400";
    pontosColor = "text-red-500 bg-red-50";
  }

  return (
    <div className="rounded-xl bg-gray-50/80 px-4 py-3 space-y-2">
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
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
          <span className="text-sm font-semibold truncate">{jogo.time_a}</span>
        </div>

        <div className="flex items-center gap-1 mx-3 flex-shrink-0">
          <span className="text-base font-black">{jogo.placar_time_a}</span>
          <span className="text-xs text-muted-foreground font-bold">x</span>
          <span className="text-base font-black">{jogo.placar_time_b}</span>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">{jogo.time_b}</span>
          {jogo.logo_time_b ? (
            <img src={jogo.logo_time_b} alt={jogo.time_b} className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Date + Palpite + Pontos */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {formatDataJogo(jogo.data_hora)}
        </span>
        <div className="flex items-center gap-1.5">
          {hasPalpite ? (
            <>
              <span className={`text-[10px] font-semibold ${palpiteColor}`}>
                Palpite: {palpite!.placar_time_a} x {palpite!.placar_time_b}
              </span>
              <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${pontosColor}`}>
                {pontos > 0 ? `+${pontos} pts` : "0 pts"}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-gray-400">Sem palpite</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BolaoPage;
