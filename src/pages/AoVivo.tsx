import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Radio, Clock, Loader2, Calendar, Trophy, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Jogo } from "@/lib/types";
import { formatHora } from "@/lib/formatters";
import SEOHead from "@/components/SEOHead";


const AoVivo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jogosAoVivo, setJogosAoVivo] = useState<Jogo[]>([]);
  const [jogosEmAndamento, setJogosEmAndamento] = useState<Jogo[]>([]);
  const [jogosHoje, setJogosHoje] = useState<Jogo[]>([]);
  const [jogosAmanha, setJogosAmanha] = useState<Jogo[]>([]);
  const [jogosEncerradosHoje, setJogosEncerradosHoje] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [userBolaoMap, setUserBolaoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    if (user) loadJogos().catch(() => {});
    const interval = setInterval(() => {
      if (user && active) {
        triggerLiveSync().catch(() => {});
        loadJogos().catch(() => {});
        setLastRefresh(new Date());
      }
    }, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // Trigger the Edge Function to update live scores in Supabase
  const triggerLiveSync = async () => {
    try {
      await supabase.functions.invoke('sync-live-scores');
    } catch {
      // Silently fail - edge function may not be deployed yet
    }
  };

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

      // Ao vivo (status ao_vivo)
      setJogosAoVivo(allJogos.filter((j) => j.status === "ao_vivo"));

      // Em andamento (agendado mas data_hora já passou)
      setJogosEmAndamento(
        allJogos.filter((j) => j.status === "agendado" && new Date(j.data_hora) <= now)
      );

      // Agendados hoje (futuro)
      setJogosHoje(
        allJogos.filter(
          (j) => j.status === "agendado" && new Date(j.data_hora) > now && new Date(j.data_hora) <= todayEnd
        )
      );

      // Agendados amanhã
      setJogosAmanha(
        allJogos.filter(
          (j) => j.status === "agendado" && new Date(j.data_hora) > todayEnd
        )
      );

      // Encerrados hoje
      setJogosEncerradosHoje(
        allJogos.filter((j) => j.status === "encerrado")
      );

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
      toast.error("Erro ao carregar jogos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClickJogo = (jogo: Jogo) => {
    const bolaoId = userBolaoMap[jogo.campeonato_id];
    if (bolaoId) {
      navigate(`/bolao/${bolaoId}`);
    }
  };

  const JogoCard = ({ jogo, type }: { jogo: Jogo; type: "ao_vivo" | "em_andamento" | "agendado" | "encerrado" }) => {
    const hasBolao = !!userBolaoMap[jogo.campeonato_id];
    const camp = jogo.campeonatos as any;

    return (
      <div
        onClick={() => hasBolao && handleClickJogo(jogo)}
        className={`rounded-xl border px-4 py-3 space-y-2 transition-all ${
          type === "ao_vivo"
            ? "border-red-200 bg-red-50/50 shadow-md"
            : type === "em_andamento"
            ? "border-amber-200 bg-amber-50/50 shadow-md"
            : type === "encerrado"
            ? "border-gray-100 bg-gray-50/50"
            : "border-gray-100 bg-white"
        } ${hasBolao ? "cursor-pointer hover:shadow-md" : ""}`}
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
          {type === "ao_vivo" && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-600">AO VIVO</span>
            </div>
          )}
          {type === "em_andamento" && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-amber-600">EM ANDAMENTO</span>
            </div>
          )}
          {type === "encerrado" && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400">ENCERRADO</span>
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
            {type === "ao_vivo" || type === "encerrado" ? (
              <span className={`text-lg font-black ${type === "ao_vivo" ? "text-red-600" : ""}`}>
                {jogo.placar_time_a ?? 0} x {jogo.placar_time_b ?? 0}
              </span>
            ) : type === "em_andamento" ? (
              <span className="text-xs text-amber-600 font-bold">
                {formatHora(jogo.data_hora)}
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
    return <LoadingSpinner />;
  }

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await triggerLiveSync();
    await loadJogos();
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  const noGames = jogosAoVivo.length === 0 && jogosEmAndamento.length === 0 && jogosHoje.length === 0 && jogosAmanha.length === 0 && jogosEncerradosHoje.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <SEOHead
        title="Placares Ao Vivo — Brasileirão, Copa do Mundo e mais"
        description="Acompanhe placares ao vivo do Brasileirão, Copa do Mundo 2026, Champions League e outros campeonatos em tempo real. Atualização automática a cada minuto."
        path="/ao-vivo"
        keywords="placares ao vivo, resultado futebol hoje, placar brasileirão ao vivo, jogos de hoje"
      />
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500" />
            Jogos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe os jogos ao vivo e de hoje
            <span className="text-[10px] ml-2 text-muted-foreground/60">
              Atualizado {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="mt-1 p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          title="Atualizar placares"
        >
          <RefreshCw className={`w-5 h-5 text-copa-green-600 ${refreshing ? "animate-spin" : ""}`} />
        </button>
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
              <JogoCard key={jogo.id} jogo={jogo} type="ao_vivo" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Em andamento */}
      {jogosEmAndamento.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              Em andamento
              <span className="text-xs bg-amber-100 text-amber-600 rounded-full px-2 py-0.5 ml-1">
                {jogosEmAndamento.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jogosEmAndamento.map((jogo) => (
              <JogoCard key={jogo.id} jogo={jogo} type="em_andamento" />
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
              <JogoCard key={jogo.id} jogo={jogo} type="agendado" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Encerrados hoje */}
      {jogosEncerradosHoje.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4" />
              Encerrados hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jogosEncerradosHoje.map((jogo) => (
              <JogoCard key={jogo.id} jogo={jogo} type="encerrado" />
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
              <JogoCard key={jogo.id} jogo={jogo} type="agendado" />
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
