import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fases = ["Todos", "Fase de Grupos", "Oitavas", "Quartas", "Semi", "Final"];

const jogosMock = [
  {
    id: "p1",
    timeA: "Brasil",
    timeB: "Argentina",
    bandeiraA: "🇧🇷",
    bandeiraB: "🇦🇷",
    data: "15/12/2026 - 16:00",
    fase: "Fase de Grupos",
    rodada: "Rodada 1",
    status: "pendente",
  },
  {
    id: "p2",
    timeA: "França",
    timeB: "Alemanha",
    bandeiraA: "🇫🇷",
    bandeiraB: "🇩🇪",
    data: "15/12/2026 - 19:00",
    fase: "Fase de Grupos",
    rodada: "Rodada 1",
    status: "pendente",
  },
  {
    id: "p3",
    timeA: "Espanha",
    timeB: "Portugal",
    bandeiraA: "🇪🇸",
    bandeiraB: "🇵🇹",
    data: "16/12/2026 - 16:00",
    fase: "Fase de Grupos",
    rodada: "Rodada 2",
    status: "pendente",
  },
];

const Palpites = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [faseAtiva, setFaseAtiva] = useState("Todos");
  const [palpites, setPalpites] = useState<Record<string, { a: number; b: number }>>({});
  const [salvos, setSalvos] = useState<Set<string>>(new Set());

  const jogosFiltrados = faseAtiva === "Todos" ? jogosMock : jogosMock.filter((j) => j.fase === faseAtiva);

  const setPlacar = (jogoId: string, time: "a" | "b", valor: number) => {
    setPalpites((prev) => ({
      ...prev,
      [jogoId]: {
        a: time === "a" ? Math.max(0, valor) : prev[jogoId]?.a || 0,
        b: time === "b" ? Math.max(0, valor) : prev[jogoId]?.b || 0,
      },
    }));
  };

  const salvarPalpite = (jogoId: string) => {
    // TODO: Save to Supabase
    setSalvos((prev) => new Set(prev).add(jogoId));
    toast.success("Palpite salvo!");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/bolao/${id}`)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Palpites</h2>
          <p className="text-sm text-muted-foreground">Copa do Mundo 2026</p>
        </div>
      </div>

      {/* Phase Tabs */}
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

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-copa-gold-400 rounded-full" />
        <span className="text-sm font-medium text-copa-green-600">Próximos jogos – Palpite aberto</span>
      </div>

      {/* Games */}
      <div className="space-y-4">
        {jogosFiltrados.map((jogo) => {
          const palpite = palpites[jogo.id] || { a: 0, b: 0 };
          const isSalvo = salvos.has(jogo.id);

          return (
            <Card key={jogo.id} className="rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-copa-green-50 px-4 py-2 border-b">
                <p className="text-xs font-semibold text-copa-green-600">
                  {jogo.fase} – {jogo.rodada}
                </p>
              </div>
              <CardContent className="p-5">
                {/* Match */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Team A */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-3xl">{jogo.bandeiraA}</span>
                    <span className="text-sm font-bold text-center">{jogo.timeA}</span>
                  </div>

                  {/* Score inputs */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={palpite.a}
                      onChange={(e) => setPlacar(jogo.id, "a", parseInt(e.target.value) || 0)}
                      className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none"
                    />
                    <span className="text-lg font-bold text-muted-foreground">x</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={palpite.b}
                      onChange={(e) => setPlacar(jogo.id, "b", parseInt(e.target.value) || 0)}
                      className="w-12 h-12 text-center text-xl font-black border-2 border-copa-green-200 rounded-xl bg-white focus:border-copa-green-500 focus:outline-none"
                    />
                  </div>

                  {/* Team B */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-3xl">{jogo.bandeiraB}</span>
                    <span className="text-sm font-bold text-center">{jogo.timeB}</span>
                  </div>
                </div>

                {/* Date & Status */}
                <div className="text-center mb-4">
                  <p className="text-xs text-muted-foreground">{jogo.data}</p>
                  <p className={`text-xs font-medium mt-1 ${isSalvo ? "text-copa-green-500" : "text-copa-gold-500"}`}>
                    {isSalvo ? "✓ Palpite salvo" : "Palpite ainda não enviado"}
                  </p>
                </div>

                {/* Save button */}
                <Button
                  onClick={() => salvarPalpite(jogo.id)}
                  className={`w-full h-11 font-bold rounded-xl ${
                    isSalvo
                      ? "bg-copa-green-100 text-copa-green-600 hover:bg-copa-green-200"
                      : "bg-copa-green-500 hover:bg-copa-green-600 text-white"
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSalvo ? "Palpite salvo" : "Salvar palpite"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Palpites;
