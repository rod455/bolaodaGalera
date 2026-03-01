// ═══════════════════════════════════════════════════════
// MataMataDashboard — Dashboard principal do modo Mata a Mata
// Exibe status do ciclo, sobreviventes, e permite fazer escolha
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Skull, Shield, Trophy, Users, ChevronRight, Loader2,
  Target, Clock, History, Crown, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getInitials } from "@/lib/formatters";
import MataMataPick from "./MataMataPick";

interface Props {
  bolaoId: string;
  campeonatoId: string | null;
}

interface Ciclo {
  id: string;
  ciclo_numero: number;
  rodada_atual: number;
  status: string;
  pontos_iniciais: number;
  vencedor_id: string | null;
  pontos_vencedor: number | null;
}

interface Participante {
  user_id: string;
  nome: string;
  status: string;
  eliminado_na_rodada: number | null;
  pontos_ganhos: number;
}

interface Escolha {
  rodada: number;
  time_escolhido: string;
  resultado: string | null;
  jogo_id: string;
}

const MataMataDashboard = ({ bolaoId, campeonatoId }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [minhasEscolhas, setMinhasEscolhas] = useState<Escolha[]>([]);
  const [meuStatus, setMeuStatus] = useState<string>("vivo");
  const [showPick, setShowPick] = useState(false);
  const [rodadaAtual, setRodadaAtual] = useState<string | null>(null);
  const [jaEscolheuRodada, setJaEscolheuRodada] = useState(false);
  const [historicoCiclos, setHistoricoCiclos] = useState<Ciclo[]>([]);
  const [rankingGeral, setRankingGeral] = useState<{ user_id: string; nome: string; pontos_total: number }[]>([]);

  useEffect(() => {
    if (bolaoId && user) loadData();
  }, [bolaoId, user]);

  const loadData = async () => {
    try {
      // 0. Buscar pontos_iniciais configurados no bolão (guardado na descrição como "mata_mata:XX")
      let pontosConfig = 20;
      const { data: bolaoData } = await supabase
        .from("boloes")
        .select("descricao")
        .eq("id", bolaoId)
        .single();
      if (bolaoData?.descricao?.startsWith("mata_mata:")) {
        const parsed = parseInt(bolaoData.descricao.split(":")[1]);
        if (!isNaN(parsed) && parsed > 0) pontosConfig = parsed;
      }

      // 1. Buscar ciclo ativo
      let { data: cicloAtivo } = await supabase
        .from("mata_mata_ciclos")
        .select("*")
        .eq("bolao_id", bolaoId)
        .eq("status", "ativo")
        .order("ciclo_numero", { ascending: false })
        .limit(1)
        .single();

      // Se não existe ciclo ativo, criar o primeiro
      if (!cicloAtivo) {
        cicloAtivo = await criarNovoCiclo(1, pontosConfig);
      }

      if (!cicloAtivo) {
        setLoading(false);
        return;
      }

      setCiclo(cicloAtivo);

      // 2. Buscar participantes do ciclo
      const { data: parts } = await supabase
        .from("mata_mata_participantes")
        .select("user_id, status, eliminado_na_rodada, pontos_ganhos")
        .eq("ciclo_id", cicloAtivo.id);

      // Buscar nomes
      const userIds = (parts || []).map((p: any) => p.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, nome").in("id", userIds)
        : { data: [] };

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p.nome; });

      const partsList: Participante[] = (parts || []).map((p: any) => ({
        ...p,
        nome: profileMap[p.user_id] || "Usuário",
      }));

      setParticipantes(partsList);

      // Meu status
      const meuPart = partsList.find((p) => p.user_id === user?.id);
      setMeuStatus(meuPart?.status || "vivo");

      // 3. Buscar minhas escolhas neste ciclo
      const { data: escolhas } = await supabase
        .from("mata_mata_escolhas")
        .select("rodada, time_escolhido, resultado, jogo_id")
        .eq("ciclo_id", cicloAtivo.id)
        .eq("user_id", user!.id)
        .order("rodada", { ascending: true });

      setMinhasEscolhas((escolhas || []) as Escolha[]);

      // 4. Verificar se já escolheu na rodada atual
      const jaEscolheu = (escolhas || []).some(
        (e: any) => e.rodada === cicloAtivo.rodada_atual
      );
      setJaEscolheuRodada(jaEscolheu);

      // 5. Descobrir a rodada atual do campeonato
      if (campeonatoId) {
        const { data: jogosRodada } = await supabase
          .from("jogos")
          .select("rodada")
          .eq("campeonato_id", campeonatoId)
          .eq("status", "agendado")
          .order("data_hora", { ascending: true })
          .limit(1);

        if (jogosRodada && jogosRodada.length > 0) {
          setRodadaAtual(jogosRodada[0].rodada);
        }
      }

      // 6. Histórico de ciclos
      const { data: historico } = await supabase
        .from("mata_mata_ciclos")
        .select("*")
        .eq("bolao_id", bolaoId)
        .eq("status", "finalizado")
        .order("ciclo_numero", { ascending: false })
        .limit(5);

      setHistoricoCiclos((historico || []) as Ciclo[]);

      // 7. Ranking geral (soma pontos de todos os ciclos)
      const { data: todosParticipantes } = await supabase
        .from("mata_mata_participantes")
        .select("user_id, pontos_ganhos, mata_mata_ciclos!inner(bolao_id)")
        .eq("mata_mata_ciclos.bolao_id", bolaoId);

      const pontosMap: Record<string, number> = {};
      (todosParticipantes || []).forEach((p: any) => {
        pontosMap[p.user_id] = (pontosMap[p.user_id] || 0) + (p.pontos_ganhos || 0);
      });

      const rankingList = Object.entries(pontosMap)
        .map(([uid, pts]) => ({
          user_id: uid,
          nome: profileMap[uid] || "Usuário",
          pontos_total: pts,
        }))
        .sort((a, b) => b.pontos_total - a.pontos_total);

      setRankingGeral(rankingList);

    } catch (err) {
      console.error("Erro ao carregar mata-mata:", err);
    } finally {
      setLoading(false);
    }
  };

  const criarNovoCiclo = async (numero: number, pontosIniciais: number = 20) => {
    try {
      // Criar ciclo
      const { data: novoCiclo, error } = await supabase
        .from("mata_mata_ciclos")
        .insert({
          bolao_id: bolaoId,
          ciclo_numero: numero,
          rodada_atual: 1,
          status: "ativo",
          pontos_iniciais: pontosIniciais,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Inscrever todos os participantes do bolão
      const { data: bolaoParticipantes } = await supabase
        .from("bolao_participantes")
        .select("user_id")
        .eq("bolao_id", bolaoId);

      if (bolaoParticipantes && bolaoParticipantes.length > 0) {
        const inserts = bolaoParticipantes.map((bp: any) => ({
          ciclo_id: novoCiclo.id,
          user_id: bp.user_id,
          status: "vivo",
          pontos_ganhos: 0,
        }));

        await supabase.from("mata_mata_participantes").insert(inserts);
      }

      return novoCiclo;
    } catch (err) {
      console.error("Erro ao criar ciclo:", err);
      return null;
    }
  };

  const handlePickDone = () => {
    setShowPick(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-copa-green-500" />
      </div>
    );
  }

  if (!ciclo) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-10 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Erro ao carregar o Mata a Mata.</p>
        </CardContent>
      </Card>
    );
  }

  const vivos = participantes.filter((p) => p.status === "vivo");
  const eliminados = participantes.filter((p) => p.status === "eliminado");
  const pontosEmJogo = Math.max(0, ciclo.pontos_iniciais - ciclo.rodada_atual + 1);
  const timesUsados = minhasEscolhas.map((e) => e.time_escolhido);

  // Tela de escolha
  if (showPick && ciclo && campeonatoId) {
    return (
      <MataMataPick
        cicloId={ciclo.id}
        rodada={ciclo.rodada_atual}
        campeonatoId={campeonatoId}
        rodadaCampeonato={rodadaAtual}
        timesUsados={timesUsados}
        onBack={() => setShowPick(false)}
        onPicked={handlePickDone}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="rounded-2xl overflow-hidden">
        <div className={`px-4 py-3 ${meuStatus === "vivo" ? "bg-gradient-to-r from-copa-green-500 to-copa-green-600" : "bg-gradient-to-r from-gray-500 to-gray-600"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {meuStatus === "vivo" ? (
                <Shield className="w-5 h-5 text-white" />
              ) : (
                <Skull className="w-5 h-5 text-white" />
              )}
              <span className="text-white font-bold text-sm">
                {meuStatus === "vivo" ? "Você está vivo!" : "Você foi eliminado"}
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              Temporada {ciclo.ciclo_numero}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-copa-green-600">{vivos.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Vivos</p>
            </div>
            <div>
              <p className="text-2xl font-black text-red-500">{eliminados.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Eliminados</p>
            </div>
            <div>
              <p className="text-2xl font-black text-copa-gold-500">{pontosEmJogo}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Pontos em jogo</p>
            </div>
          </div>

          {/* Botão de ação */}
          {meuStatus === "vivo" && !jaEscolheuRodada && (
            <Button
              onClick={() => setShowPick(true)}
              className="w-full mt-4 h-12 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl text-base"
            >
              <Target className="w-5 h-5 mr-2" />
              Fazer minha escolha — Rodada {ciclo.rodada_atual}
            </Button>
          )}

          {meuStatus === "vivo" && jaEscolheuRodada && (
            <div className="mt-4 bg-copa-green-50 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-copa-green-700">
                ✅ Escolha feita para a Rodada {ciclo.rodada_atual}
              </p>
              {minhasEscolhas.length > 0 && (
                <p className="text-xs text-copa-green-600 mt-1">
                  Você apostou no <strong>{minhasEscolhas[minhasEscolhas.length - 1]?.time_escolhido}</strong>
                </p>
              )}
            </div>
          )}

          {meuStatus === "eliminado" && (
            <div className="mt-4 bg-red-50 rounded-xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-red-700">
                Eliminado na Rodada {participantes.find((p) => p.user_id === user?.id)?.eliminado_na_rodada || "?"}
              </p>
              <p className="text-xs text-red-500 mt-1">
                Aguarde o fim desta temporada para voltar ao jogo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minhas Escolhas (histórico) */}
      {minhasEscolhas.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-copa-green-500" />
              Minhas Escolhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {minhasEscolhas.map((escolha) => (
              <div
                key={escolha.rodada}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  escolha.resultado === "vitoria"
                    ? "bg-copa-green-50 border border-copa-green-200"
                    : escolha.resultado === "derrota" || escolha.resultado === "empate"
                    ? "bg-red-50 border border-red-200"
                    : "bg-muted/50 border border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-6">R{escolha.rodada}</span>
                  <span className="text-sm font-semibold">{escolha.time_escolhido}</span>
                </div>
                <span
                  className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                    escolha.resultado === "vitoria"
                      ? "bg-copa-green-100 text-copa-green-700"
                      : escolha.resultado === "derrota"
                      ? "bg-red-100 text-red-700"
                      : escolha.resultado === "empate"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {escolha.resultado === "vitoria"
                    ? "✅ Vitória"
                    : escolha.resultado === "derrota"
                    ? "❌ Derrota"
                    : escolha.resultado === "empate"
                    ? "⚠️ Empate"
                    : "⏳ Pendente"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sobreviventes */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-copa-green-500" />
            Sobreviventes ({vivos.length}/{participantes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {vivos.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                <div className="w-7 h-7 rounded-full bg-copa-green-100 flex items-center justify-center text-[10px] font-bold text-copa-green-700">
                  {getInitials(p.nome)}
                </div>
                <span className={`text-sm font-medium flex-1 ${p.user_id === user?.id ? "text-copa-green-700 font-bold" : ""}`}>
                  {p.nome} {p.user_id === user?.id && "(você)"}
                </span>
                <Shield className="w-3.5 h-3.5 text-copa-green-500" />
              </div>
            ))}
            {eliminados.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Eliminados</p>
                {eliminados.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-50">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {getInitials(p.nome)}
                    </div>
                    <span className="text-sm text-muted-foreground flex-1">
                      {p.nome} {p.user_id === user?.id && "(você)"}
                    </span>
                    <span className="text-[10px] text-red-400">R{p.eliminado_na_rodada}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ranking Geral */}
      {rankingGeral.length > 0 && rankingGeral.some((r) => r.pontos_total > 0) && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-copa-gold-400" />
              Ranking Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {rankingGeral.filter((r) => r.pontos_total > 0).map((r, i) => (
                <div
                  key={r.user_id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                    r.user_id === user?.id ? "bg-copa-green-50" : ""
                  }`}
                >
                  <span className="text-xs font-black text-muted-foreground w-5 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                  </span>
                  <span className={`text-sm flex-1 ${r.user_id === user?.id ? "font-bold text-copa-green-700" : "font-medium"}`}>
                    {r.nome}
                  </span>
                  <span className="text-sm font-black text-copa-gold-500">{r.pontos_total} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regras resumidas */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Cada rodada, escolha 1 time para apostar na vitória",
            "Se o time vencer, você sobrevive",
            "Se perder ou empatar, você é eliminado",
            "Não pode repetir time já escolhido",
            `Último sobrevivente marca ${pontosEmJogo} pontos`,
            "Depois, recomeça uma nova temporada",
          ].map((regra, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-copa-green-500 font-bold text-xs mt-0.5">{i + 1}.</span>
              <span className="text-xs text-muted-foreground">{regra}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default MataMataDashboard;
