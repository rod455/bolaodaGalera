import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Clock, Loader2, Calendar, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Jogo {
  id: string;
  time_a: string;
  time_b: string;
  logo_time_a: string | null;
  logo_time_b: string | null;
  placar_time_a: number | null;
  placar_time_b: number | null;
  data_hora: string;
  status: string;
  fase: string | null;
  rodada: string | null;
  campeonato_id: string;
  campeonatos?: { nome_popular: string; logo_url: string } | null;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const AoVivo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jogosAoVivo, setJogosAoVivo] = useState<Jogo[]>([]);
  const [jogosHoje, setJogosHoje] = useState<Jogo[]>([]);
  const [jogosAmanha, setJogosAmanha] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  // Map campeonato_id -> bolao_ids (user participates in)
  const [userBolaoMap, setUserBolaoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) loadJogos();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => { if (user) loadJogos(); }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const loadJogos = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const tomorrowEnd = new Date(todayEnd);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

      // Get all games for today and tomorrow
      const { data: jogos } = await supabase
        .from("jogos")
        .select("*, campeonatos(nome_popular, logo_url)")
        .gte("data_hora", todayStart.toISOString())
        .lte("data_hora", tomorrowEnd.toISOString())
        .order("data_hora", { ascending: true });

      const allJogos = (jogos as Jogo[]) || [];

      // Separate into categories
      setJogosAoVivo(allJogos.filter((j) => j.status === "ao_vivo"));

      const todayAgendados = allJogos.filter(
        (j) => j.status === "agendado" && new Date(j.data_hora) <= todayEnd
      );
      const tomorrowAgendados = allJogos.filter(
        (j) => j.status === "agendado" && new Date(j.data_hora) > todayEnd
      );
      setJogosHoje(todayAgendados);
      setJogosAmanha(tomorrowAgendados);

      // Get user's bolões to link games
      if (user) {
        const { data: participacoes } = await supabase
          .from("bolao_participantes")
          .select("bolao_id, boloes(campeonato_id)")
          .eq("user_id", user.id);

        const map: Record<string, string> = {};
        (participacoes || []).forEach((p: any) => {
          if (p.boloes?.campeonato_id) {
            map[p.boloes.campeonato_id] = p.bolao_id;
          }
        });
        setUserBolaoMap(map);
      }
    } catch (err) {
      console.error("Erro ao carregar jogos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClickJogo = (jogo: Jogo) => {
    const bolaoId = userBolaoMap[jogo.campeonato_id];
    if (bolaoId) {
      navigate(`/bolao/${bolaoId}/palpites?jogo=${jogo.id}`);
    }
  };

  const JogoCard = ({ jogo }: { jogo: Jogo }) => {
    const isLive = jogo.status === "ao_vivo";
    const hasBolao = !!userBolaoMap[jogo.campeonato_id];
    const camp = jogo.campeonatos as any;

    return (
      <div
        onClick={() => hasBolao && handleClickJogo(jogo)}
        className={`rounded-xl border px-4 py-3 space-y-2 transition-all ${
          isLive
            ? "border-red-200 bg-red-50/50 shadow-md"
            : "border-gray-100 bg-white"
        } ${hasBolao ? "cursor-pointer hover:shadow-md hover:border-copa-green-200" : ""}`}
      >
        {/* Championship + Rodada */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {camp?.logo_url && (
              <img src={camp.logo_url} alt="" className="w-4 h-4 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {camp?.nome_popular || ""}
              {jogo.rodada ? ` • ${jogo.rodada}` : ""}
            </span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-600">AO VIVO</span>
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {jogo.logo_time_a ? (
              <img src={jogo.logo_time_a} alt="" className="w-7 h-7 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-7 h-7 bg-gray-200 rounded-full flex-shrink-0" />}
            <span className="text-sm font-semibold truncate">{jogo.time_a}</span>
          </div>

          <div className="flex items-center gap-2 mx-3">
            {isLive || jogo.status === "encerrado" ? (
              <span className={`text-lg font-black ${isLive ? "text-red-600" : ""}`}>
                {jogo.placar_time_a ?? 0} x {jogo.placar_time_b ?? 0}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-bold">
                {formatHora(jogo.data_hora)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold truncate text-right">{jogo.time_b}</span>
            {jogo.logo_time_b ? (
              <img src={jogo.logo_time_b} alt="" className="w-7 h-7 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : <div className="w-7 h-7 bg-gray-200 rounded-full flex-shrink-0" />}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-copa-green-500 animate-spin" />
      </div>
    );
  }

  const noGames = jogosAoVivo.length === 0 && jogosHoje.length === 0 && jogosAmanha.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-500" />
          Jogos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe os jogos ao vivo e de hoje
        </p>
      </div>

      {/* Ao Vivo */}
      {jogosAoVivo.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              Ao Vivo
              <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 ml-1">
                {jogosAoVivo.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jogosAoVivo.map((jogo) => (
              <JogoCard key={jogo.id} jogo={jogo} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hoje */}
      {jogosHoje.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-copa-green-500" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jogosHoje.map((jogo) => (
              <JogoCard key={jogo.id} jogo={jogo} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Amanhã */}
      {jogosAmanha.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Amanhã
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jogosAmanha.map((jogo) => (
              <JogoCard key={jogo.id} jogo={jogo} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {noGames && (
        <Card className="rounded-2xl border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="font-bold text-foreground mb-1">Nenhum jogo no momento</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              Não há jogos ao vivo, agendados para hoje ou amanhã.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AoVivo;
