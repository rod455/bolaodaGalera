import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Lock, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface PalpiteDB {
  id: string;
  jogo_id: string;
  placar_time_a: number;
  placar_time_b: number;
  pontos: number | null;
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

  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (isToday) return `Hoje • ${hora}`;
  if (isTomorrow) return `Amanhã • ${hora}`;

  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} • ${capitalWeekday} • ${hora}`;
}

const Palpites = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [bolaoNome, setBolaoNome] = useState("");
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [palpitesDB, setPalpitesDB] = useState<Record<string, PalpiteDB>>({});
  const [palpitesLocal, setPalpitesLocal] = useState<Record<string, { a: number; b: number }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [faseAtiva, setFaseAtiva] = useState("Todos");
  const [fases, setFases] = useState<string[]>(["Todos"]);

  useEffect(() => {
    if (id && user) loadData();
  }, [id, user]);

  const loadData = async () => {
    try {
      // Fetch bolão with campeonato
      const { data: bolao } = await supabase
        .from("boloes")
        .select("nome, campeonato_id")
        .eq("id", id)
        .single();

      if (!bolao || !bolao.campeonato_id) {
        toast.error("Bolão não encontrado");
        navigate(`/bolao/${id}`);
        return;
      }

      setBolaoNome(bolao.nome);

      // Fetch all upcoming games (agendado) + recent encerrados
      const { data: jogosAgendados } = await supabase
        .from("jogos")
        .select("*")
        .eq("campeonato_id", bolao.campeonato_id)
        .in("status", ["agendado", "ao_vivo"])
        .order("data_hora", { ascending: true });

      const { data: jogosEncerrados } = await supabase
        .from("jogos")
        .select("*")
        .eq("campeonato_id", bolao.campeonato_id)
        .eq("status", "encerrado")
        .order("data_hora", { ascending: false })
        .limit(10);

      const allJogos = [
        ...(jogosAgendados || []),
        ...(jogosEncerrados || []).reverse(),
      ] as Jogo[];

      // Deduplicate
      const seen = new Set<string>();
      const uniqueJogos = allJogos.filter((j) => {
        if (seen.has(j.id)) return false;
        seen.add(j.id);
        return true;
      });

      setJogos(uniqueJogos);

      // Extract unique fases
      const fasesSet = new Set<string>();
      uniqueJogos.forEach((j) => {
        if (j.fase) fasesSet.add(j.fase);
        if (j.rodada) fasesSet.add(j.rodada);
      });
      setFases(["Todos", ...Array.from(fasesSet)]);

      // Load existing palpites
      if (uniqueJogos.length > 0) {
        const jogoIds = uniqueJogos.map((j) => j.id);
        const { data: existingPalpites } = await supabase
          .from("palpites")
          .select("id, jogo_id, placar_time_a, placar_time_b, pontos")
          .eq("user_id", user!.id)
          .eq("bolao_id", id!)
          .in("jogo_id", jogoIds);

        const pMap: Record<string, PalpiteDB> = {};
        const localMap: Record<string, { a: number; b: number }> = {};
        (existingPalpites || []).forEach((p: any) => {
          pMap[p.jogo_id] = p;
          localMap[p.jogo_id] = { a: p.placar_time_a, b: p.placar_time_b };
        });
        setPalpitesDB(pMap);
        setPalpitesLocal(localMap);
      }
    } catch (err) {
      console.error("Erro ao carregar palpites:", err);
      toast.error("Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  };

  const setPlacar = (jogoId: string, time: "a" | "b", valor: number) => {
    setPalpitesLocal((prev) => ({
      ...prev,
      [jogoId]: {
        a: time === "a" ? Math.max(0, valor) : prev[jogoId]?.a ?? 0,
        b: time === "b" ? Math.max(0, valor) : prev[jogoId]?.b ?? 0,
      },
    }));
  };

  const salvarPalpite = async (jogoId: string) => {
    if (!user || !id) return;
    const local = palpitesLocal[jogoId];
    if (!local && local !== undefined) return;

    const placarA = local?.a ?? 0;
    const placarB = local?.b ?? 0;

    setSalvando(jogoId);
    try {
      const existing = palpitesDB[jogoId];

      if (existing) {
        // Update
        const { error } = await supabase
          .from("palpites")
          .update({ placar_time_a: placarA, placar_time_b: placarB })
          .eq("id", existing.id);

        if (error) throw error;

        setPalpitesDB((prev) => ({
          ...prev,
          [jogoId]: { ...existing, placar_time_a: placarA, placar_time_b: placarB },
        }));
      } else {
        // Insert
        const { data, error } = await supabase
          .from("palpites")
          .insert({
            jogo_id: jogoId,
            bolao_id: id,
            user_id: user.id,
            placar_time_a: placarA,
            placar_time_b: placarB,
          })
          .select("id, jogo_id, placar_time_a, placar_time_b, pontos")
          .single();

        if (error) {
          // Check if it's the 10-min cutoff RLS error
          if (error.message?.includes("row-level security") || error.code === "42501") {
            toast.error("Palpite encerrado! Faltam menos de 10 minutos para o jogo.");
            return;
          }
          throw error;
        }

        if (data) {
          setPalpitesDB((prev) => ({ ...prev, [jogoId]: data as any }));
        }
      }

      toast.success("Palpite salvo!");
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      toast.error(err.message || "Erro ao salvar palpite");
    } finally {
      setSalvando(null);
    }
  };

  const now = new Date();

  // Filter by fase/rodada
  const jogosFiltrados =
    faseAtiva === "Todos"
      ? jogos
      : jogos.filter((j) => j.fase === faseAtiva || j.rodada === faseAtiva);

  // Separate into sections
  const jogosAbertos = jogosFiltrados.filter((j) => {
    if (j.status !== "agendado") return false;
    const diffMin = (new Date(j.data_hora).getTime() - now.getTime()) / (1000 * 60);
    return diffMin > 10;
  });

  const jogosFechados = jogosFiltrados.filter((j) => {
    if (j.status !== "agendado") return false;
    const diffMin = (new Date(j.data_hora).getTime() - now.getTime()) / (1000 * 60);
    return diffMin <= 10;
  });

  const jogosAoVivo = jogosFiltrados.filter((j) => j.status === "ao_vivo");
  const jogosEncerrados = jogosFiltrados.filter((j) => j.status === "encerrado");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-copa-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/bolao/${id}`)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Palpites</h2>
          <p className="text-sm text-muted-foreground">{bolaoNome}</p>
        </div>
      </div>

      {/* Phase Tabs */}
      {fases.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {fases.map((fase) => (
            <button
              key={fase}
              onClick={() => setFaseAtiva(fase)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                faseAtiva === fase
                  ? "bg-copa-green-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {fase}
            </button>
          ))}
        </div>
      )}

      {/* Palpites abertos */}
      {jogosAbertos.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-copa-gold-400 rounded-full" />
            <span className="text-sm font-medium text-copa-green-600">
              Próximos jogos – Palpite aberto
            </span>
          </div>
          <div className="space-y-4">
            {jogosAbertos.map((jogo) => (
              <PalpiteCard
                key={jogo.id}
                jogo={jogo}
                palpiteDB={palpitesDB[jogo.id] || null}
                localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }}
                onSetPlacar={setPlacar}
                onSalvar={salvarPalpite}
                salvando={salvando === jogo.id}
                editable
              />
            ))}
          </div>
        </>
      )}

      {/* Palpites fechados (< 10min) */}
      {jogosFechados.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Palpites encerrados
            </span>
          </div>
          <div className="space-y-4">
            {jogosFechados.map((jogo) => (
              <PalpiteCard
                key={jogo.id}
                jogo={jogo}
                palpiteDB={palpitesDB[jogo.id] || null}
                localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }}
                onSetPlacar={setPlacar}
                onSalvar={salvarPalpite}
                salvando={false}
                editable={false}
              />
            ))}
          </div>
        </>
      )}

      {/* Ao vivo */}
      {jogosAoVivo.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600">Ao vivo</span>
          </div>
          <div className="space-y-4">
            {jogosAoVivo.map((jogo) => (
              <PalpiteCard
                key={jogo.id}
                jogo={jogo}
                palpiteDB={palpitesDB[jogo.id] || null}
                localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }}
                onSetPlacar={setPlacar}
                onSalvar={salvarPalpite}
                salvando={false}
                editable={false}
              />
            ))}
          </div>
        </>
      )}

      {/* Encerrados */}
      {jogosEncerrados.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">
              Resultados
            </span>
          </div>
          <div className="space-y-4">
            {jogosEncerrados.map((jogo) => (
              <PalpiteCard
                key={jogo.id}
                jogo={jogo}
                palpiteDB={palpitesDB[jogo.id] || null}
                localPlacar={palpitesLocal[jogo.id] || { a: 0, b: 0 }}
                onSetPlacar={setPlacar}
                onSalvar={salvarPalpite}
                salvando={false}
                editable={false}
              />
            ))}
          </div>
        </>
      )}

      {jogosFiltrados.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum jogo encontrado para este filtro.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ─── PalpiteCard Component ─── */

const PalpiteCard = ({
  jogo,
  palpiteDB,
  localPlacar,
  onSetPlacar,
  onSalvar,
  salvando,
  editable,
}: {
  jogo: Jogo;
  palpiteDB: PalpiteDB | null;
  localPlacar: { a: number; b: number };
  onSetPlacar: (jogoId: string, time: "a" | "b", valor: number) => void;
  onSalvar: (jogoId: string) => void;
  salvando: boolean;
  editable: boolean;
}) => {
  const isEncerrado = jogo.status === "encerrado";
  const isAoVivo = jogo.status === "ao_vivo";
  const hasPalpite = !!palpiteDB;

  // Check if local values differ from saved
  const hasChanges =
    hasPalpite &&
    (localPlacar.a !== palpiteDB!.placar_time_a ||
      localPlacar.b !== palpiteDB!.placar_time_b);

  return (
    <Card className={`rounded-2xl shadow-sm overflow-hidden ${!editable && !isEncerrado ? "opacity-75" : ""}`}>
      {/* Header: Fase / Rodada */}
      {(jogo.fase || jogo.rodada) && (
        <div className={`px-4 py-2 border-b ${isEncerrado ? "bg-gray-50" : "bg-copa-green-50"}`}>
          <p className={`text-xs font-semibold ${isEncerrado ? "text-gray-500" : "text-copa-green-600"}`}>
            {[jogo.fase, jogo.rodada].filter(Boolean).join(" – ")}
          </p>
        </div>
      )}

      <CardContent className="p-5">
        {/* Match */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Team A */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            {jogo.logo_time_a ? (
              <img
                src={jogo.logo_time_a}
                alt={jogo.time_a}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
            )}
            <span className="text-sm font-bold text-center leading-tight">
              {jogo.time_a}
            </span>
          </div>

          {/* Score area */}
          {isEncerrado || isAoVivo ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">
                  {jogo.placar_time_a ?? "-"}
                </span>
                <span className="text-lg font-bold text-muted-foreground">x</span>
                <span className="text-2xl font-black">
                  {jogo.placar_time_b ?? "-"}
                </span>
              </div>
              {hasPalpite && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Seu palpite: {palpiteDB!.placar_time_a} x {palpiteDB!.placar_time_b}
                  </span>
                  {palpiteDB!.pontos != null && palpiteDB!.pontos > 0 && (
                    <span className="text-[10px] font-bold text-copa-green-600 bg-copa-green-100 rounded px-1">
                      +{palpiteDB!.pontos} pts
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : editable ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99"
                value={localPlacar.a}
                onChange={(e) =>
                  onSetPlacar(jogo.id, "a", parseInt(e.target.value) || 0)
                }
                className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none"
              />
              <span className="text-lg font-bold text-muted-foreground">x</span>
              <input
                type="number"
                min="0"
                max="99"
                value={localPlacar.b}
                onChange={(e) =>
                  onSetPlacar(jogo.id, "b", parseInt(e.target.value) || 0)
                }
                className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {hasPalpite ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-gray-400">
                      {palpiteDB!.placar_time_a}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">x</span>
                    <span className="text-xl font-black text-gray-400">
                      {palpiteDB!.placar_time_b}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-0.5" />
                    Palpite travado
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs">Sem palpite</span>
                </div>
              )}
            </div>
          )}

          {/* Team B */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            {jogo.logo_time_b ? (
              <img
                src={jogo.logo_time_b}
                alt={jogo.time_b}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
            )}
            <span className="text-sm font-bold text-center leading-tight">
              {jogo.time_b}
            </span>
          </div>
        </div>

        {/* Date & Status */}
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground">
            {formatDataJogo(jogo.data_hora)}
          </p>
          {editable && (
            <p
              className={`text-xs font-medium mt-1 ${
                hasPalpite ? "text-copa-green-500" : "text-copa-gold-500"
              }`}
            >
              {hasPalpite
                ? hasChanges
                  ? "Palpite alterado – salve novamente"
                  : "✓ Palpite salvo"
                : "Palpite ainda não enviado"}
            </p>
          )}
          {isEncerrado && !hasPalpite && (
            <p className="text-xs text-gray-400 mt-1">Nenhum palpite enviado</p>
          )}
        </div>

        {/* Save button (only for editable) */}
        {editable && (
          <Button
            onClick={() => onSalvar(jogo.id)}
            disabled={salvando || (hasPalpite && !hasChanges && localPlacar.a === palpiteDB!.placar_time_a)}
            className={`w-full h-11 font-bold rounded-xl ${
              hasPalpite && !hasChanges
                ? "bg-copa-green-100 text-copa-green-600 hover:bg-copa-green-200"
                : "bg-copa-green-500 hover:bg-copa-green-600 text-white"
            }`}
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {hasPalpite && !hasChanges ? "Palpite salvo" : "Salvar palpite"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default Palpites;
