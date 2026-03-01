// ═══════════════════════════════════════════════════════
// MataMataPick — Tela de escolha de time (Mata a Mata)
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import {
  ArrowLeft, Loader2, Shield, Lock, Check, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Jogo } from "@/lib/types";
import { formatDataJogo } from "@/lib/formatters";

interface Props {
  cicloId: string;
  rodada: number;
  campeonatoId: string;
  rodadaCampeonato: string | null;
  timesUsados: string[];
  onBack: () => void;
  onPicked: () => void;
}

const MataMataPick = ({
  cicloId, rodada, campeonatoId, rodadaCampeonato, timesUsados, onBack, onPicked,
}: Props) => {
  const { user } = useAuth();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ time: string; jogoId: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    loadJogos();
  }, [campeonatoId, rodadaCampeonato]);

  const loadJogos = async () => {
    try {
      // Buscar a próxima rodada com jogos agendados
      let query = supabase
        .from("jogos")
        .select("*")
        .eq("campeonato_id", campeonatoId)
        .eq("status", "agendado")
        .order("data_hora", { ascending: true });

      if (rodadaCampeonato) {
        query = query.eq("rodada", rodadaCampeonato);
      }

      const { data } = await query;

      // Se não achou jogos na rodada específica, buscar qualquer agendado
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from("jogos")
          .select("*")
          .eq("campeonato_id", campeonatoId)
          .eq("status", "agendado")
          .order("data_hora", { ascending: true })
          .limit(20);
        setJogos((fallback || []) as Jogo[]);
      } else {
        setJogos(data as Jogo[]);
      }
    } catch (err) {
      console.error("Erro ao carregar jogos:", err);
    } finally {
      setLoading(false);
    }
  };

  const isTimeUsado = (time: string) => timesUsados.includes(time);

  const handleSelect = (time: string, jogoId: string) => {
    if (isTimeUsado(time)) {
      toast.error(`Você já usou ${time} em rodada anterior`);
      return;
    }
    setSelected(selected?.time === time ? null : { time, jogoId });
  };

  const handleConfirmar = async () => {
    if (!selected || !user) return;

    setConfirmando(true);
    try {
      const { error } = await supabase.from("mata_mata_escolhas").insert({
        ciclo_id: cicloId,
        user_id: user.id,
        rodada,
        time_escolhido: selected.time,
        jogo_id: selected.jogoId,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Você já fez sua escolha para esta rodada!");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Você apostou no ${selected.time}! Boa sorte! 🍀`);
      onPicked();
    } catch (err: any) {
      console.error("Erro ao salvar escolha:", err);
      toast.error(err.message || "Erro ao salvar escolha");
    } finally {
      setConfirmando(false);
    }
  };

  const now = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-copa-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-black">Mata a Mata</h2>
          <p className="text-sm text-muted-foreground">
            Rodada {rodada} — Escolha um time para vencer
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Atenção:</p>
            <p className="text-xs text-amber-600">
              Toque no time que vai <strong>vencer</strong>. Se ele perder, você será eliminado. Empate mantém você no jogo!
              Times já usados ficam bloqueados.
            </p>
          </div>
        </div>
      </div>

      {/* Times usados */}
      {timesUsados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Já usados:</span>
          {timesUsados.map((t) => (
            <span key={t} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 line-through">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Jogos */}
      {jogos.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum jogo disponível para esta rodada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jogos.map((jogo) => {
            const minUntilGame = (new Date(jogo.data_hora).getTime() - now.getTime()) / (1000 * 60);
            const isLocked = minUntilGame <= 10;
            const timeAUsado = isTimeUsado(jogo.time_a);
            const timeBUsado = isTimeUsado(jogo.time_b);
            const selectedA = selected?.time === jogo.time_a && selected?.jogoId === jogo.id;
            const selectedB = selected?.time === jogo.time_b && selected?.jogoId === jogo.id;

            return (
              <Card key={jogo.id} className={`rounded-2xl overflow-hidden ${isLocked ? "opacity-50" : ""}`}>
                {jogo.rodada && (
                  <div className="px-4 py-1.5 bg-copa-green-50 border-b">
                    <p className="text-[10px] font-semibold text-copa-green-600">
                      {jogo.rodada} • {formatDataJogo(jogo.data_hora)}
                    </p>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Time A */}
                    <button
                      disabled={isLocked || timeAUsado}
                      onClick={() => !isLocked && !timeAUsado && handleSelect(jogo.time_a, jogo.id)}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selectedA
                          ? "border-copa-green-500 bg-copa-green-50 shadow-md"
                          : timeAUsado
                          ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                          : "border-gray-200 hover:border-copa-green-300 cursor-pointer"
                      }`}
                    >
                      {jogo.logo_time_a ? (
                        <img src={jogo.logo_time_a} alt={jogo.time_a} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : <div className="w-10 h-10 bg-gray-200 rounded-full" />}
                      <span className="text-xs font-bold text-center leading-tight">{jogo.time_a}</span>
                      {selectedA && <Check className="w-4 h-4 text-copa-green-500" />}
                      {timeAUsado && <Lock className="w-3 h-3 text-gray-400" />}
                    </button>

                    <span className="text-sm font-bold text-muted-foreground">VS</span>

                    {/* Time B */}
                    <button
                      disabled={isLocked || timeBUsado}
                      onClick={() => !isLocked && !timeBUsado && handleSelect(jogo.time_b, jogo.id)}
                      className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selectedB
                          ? "border-copa-green-500 bg-copa-green-50 shadow-md"
                          : timeBUsado
                          ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                          : "border-gray-200 hover:border-copa-green-300 cursor-pointer"
                      }`}
                    >
                      {jogo.logo_time_b ? (
                        <img src={jogo.logo_time_b} alt={jogo.time_b} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : <div className="w-10 h-10 bg-gray-200 rounded-full" />}
                      <span className="text-xs font-bold text-center leading-tight">{jogo.time_b}</span>
                      {selectedB && <Check className="w-4 h-4 text-copa-green-500" />}
                      {timeBUsado && <Lock className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>

                  {isLocked && (
                    <p className="text-center text-[10px] text-red-400 mt-2">
                      <Lock className="w-3 h-3 inline mr-0.5" /> Encerrado (faltam menos de 10min)
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Botão confirmar */}
      {selected && (
        <div className="sticky bottom-4 z-10">
          <Button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="w-full h-13 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold text-base rounded-xl shadow-lg"
          >
            {confirmando ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmando...</>
            ) : (
              <><Shield className="w-5 h-5 mr-2" /> Confirmar: {selected.time}</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MataMataPick;
