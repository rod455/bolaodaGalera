import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Trophy, Users, ChevronRight, Medal, Loader2, Clock,
  CheckCircle2, AlertCircle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Bolao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  campeonato_id: string | null;
  is_nacional: boolean;
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
          const { data: userPalpites } = await supabase
            .from("palpites")
            .select("jogo_id, placar_time_a, placar_time_b, pontos")
            .eq("user_id", user!.id)
            .eq("bolao_id", id!)
            .in("jogo_id", jogoIds);

          const palpiteMap: Record<string, Palpite> = {};
          (userPalpites || []).forEach((p: any) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-copa-green-500 animate-spin" />
      </div>
    );
  }

  if (!bolao) return null;

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
          <p className="text-sm text-muted-foreground">
            {totalParticipantes.toLocaleString("pt-BR")} participantes
          </p>
        </div>
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

      {/* Jogos ao vivo */}
      {jogosAoVivo.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600">Ao vivo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jogosAoVivo.map((jogo) => (
              <JogoRow
                key={jogo.id}
                jogo={jogo}
                palpite={palpites[jogo.id] || null}
                now={now}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Próximos jogos */}
      {jogosProximos.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-copa-green-500 rounded-full animate-pulse" />
              Próximos jogos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jogosProximos.map((jogo) => (
              <JogoRow
                key={jogo.id}
                jogo={jogo}
                palpite={palpites[jogo.id] || null}
                now={now}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Jogos encerrados */}
      {jogosEncerrados.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-muted-foreground">
              Últimos resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jogosEncerrados.map((jogo) => (
              <JogoRow
                key={jogo.id}
                jogo={jogo}
                palpite={palpites[jogo.id] || null}
                now={now}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {jogos.length === 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum jogo disponível no momento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fazer Palpites CTA */}
      <Card className="rounded-2xl shadow-sm border-copa-gold-200 bg-copa-gold-50">
        <CardContent className="p-5">
          <h3 className="text-lg font-bold text-copa-green-700 mb-1">
            Faça seus palpites
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Veja e edite seus palpites futuros ou confira os já realizados
          </p>
          <Button
            onClick={() => navigate(`/bolao/${id}/palpites`)}
            className="w-full h-11 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl"
          >
            Ir para palpites
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-400" />
              Ranking
            </CardTitle>
            {ranking.length > 3 && (
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
    </div>
  );
};

/* ─── JogoRow Component ─── */

const JogoRow = ({
  jogo,
  palpite,
  now,
}: {
  jogo: Jogo;
  palpite: Palpite | null;
  now: Date;
}) => {
  const status = getStatusInfo(jogo, palpite, now);
  const StatusIcon = status.icon;
  const isEncerrado = jogo.status === "encerrado";

  return (
    <div
      className={`rounded-xl px-4 py-3 space-y-2 ${
        isEncerrado ? "bg-gray-50/80" : "bg-muted/50"
      }`}
    >
      {/* Fase / Rodada */}
      {(jogo.fase || jogo.rodada) && (
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {[jogo.fase, jogo.rodada].filter(Boolean).join(" • ")}
        </p>
      )}

      {/* Teams row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {jogo.logo_time_a ? (
            <img
              src={jogo.logo_time_a}
              alt={jogo.time_a}
              className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
          <span className="text-sm font-semibold truncate">{jogo.time_a}</span>
        </div>

        {/* Score / Palpite display */}
        <div className="flex items-center gap-1.5 mx-3 flex-shrink-0">
          {isEncerrado ? (
            <div className="flex items-center gap-1">
              <span className="text-base font-black">
                {jogo.placar_time_a}
              </span>
              <span className="text-xs text-muted-foreground font-bold">x</span>
              <span className="text-base font-black">
                {jogo.placar_time_b}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground font-bold">
              vs
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold truncate text-right">
            {jogo.time_b}
          </span>
          {jogo.logo_time_b ? (
            <img
              src={jogo.logo_time_b}
              alt={jogo.time_b}
              className="w-6 h-6 object-contain flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Date + Status + Palpite */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {formatDataJogo(jogo.data_hora)}
        </span>
        <div className="flex items-center gap-1.5">
          {palpite && jogo.status !== "encerrado" && (
            <span className="text-[10px] font-bold text-copa-green-700 bg-copa-green-100 rounded-md px-1.5 py-0.5">
              Seu palpite: {palpite.placar_time_a} x {palpite.placar_time_b}
            </span>
          )}
          {palpite && jogo.status === "encerrado" && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
              Palpite: {palpite.placar_time_a} x {palpite.placar_time_b}
            </span>
          )}
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium border-0 px-2 py-0.5 ${status.color}`}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default BolaoPage;
