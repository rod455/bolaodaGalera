import { useState, useEffect } from "react";
import {
  Zap, Plus, Trophy, Star, Target, ChevronRight, Loader2,
  X, Check, Calendar, Hash, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Jogo } from "@/lib/types";

interface EventoEspecial {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "multiplicador" | "mini_campeonato" | "desafio_jogo";
  config: any;
  ativo: boolean;
  created_at: string;
}

interface EventosEspeciaisProps {
  bolaoId: string;
  campeonatoId: string | null;
  isCriador: boolean;
  userId: string;
}

const TIPO_CONFIG = {
  multiplicador: {
    label: "Rodada Turbinada",
    desc: "Multiplique os pontos de rodadas específicas",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  mini_campeonato: {
    label: "Mini Campeonato",
    desc: "Ranking separado por um conjunto de rodadas",
    icon: Trophy,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  desafio_jogo: {
    label: "Desafio de Jogo",
    desc: "Bônus especial para quem acertar um jogo específico",
    icon: Target,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

const EventosEspeciais = ({ bolaoId, campeonatoId, isCriador, userId }: EventosEspeciaisProps) => {
  const [eventos, setEventos] = useState<EventoEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { loadEventos(); }, [bolaoId]);

  const loadEventos = async () => {
    try {
      const { data } = await supabase
        .from("eventos_especiais")
        .select("*")
        .eq("bolao_id", bolaoId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      setEventos((data as any[]) || []);
    } catch (err) { console.error("Erro ao carregar eventos:", err); }
    finally { setLoading(false); }
  };

  const deleteEvento = async (eventoId: string) => {
    try {
      await supabase.from("eventos_especiais").update({ ativo: false }).eq("id", eventoId);
      setEventos((prev) => prev.filter((e) => e.id !== eventoId));
      toast.success("Evento removido");
    } catch (err) { toast.error("Erro ao remover evento"); }
  };

  if (loading) return null;

  // Não mostra nada se não é criador e não tem eventos
  if (!isCriador && eventos.length === 0) return null;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-bold">Eventos Especiais</h3>
            {eventos.length > 0 && (
              <span className="text-[10px] font-bold bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">
                {eventos.length} {eventos.length === 1 ? "ativo" : "ativos"}
              </span>
            )}
          </div>
          {isCriador && (
            <Button size="sm" variant="outline"
              onClick={() => setShowCreateModal(true)}
              className="text-orange-600 border-orange-200 hover:bg-orange-50 font-semibold rounded-lg text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Criar
            </Button>
          )}
        </div>

        {eventos.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {isCriador ? "Crie eventos especiais para turbinar seu bolão!" : "Nenhum evento especial no momento."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {eventos.map((evento) => {
              const cfg = TIPO_CONFIG[evento.tipo];
              const Icon = cfg.icon;
              return (
                <div key={evento.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} transition-all`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block truncate">{evento.nome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {evento.tipo === "multiplicador" && `x${evento.config?.multiplicador || 2} pontos`}
                      {evento.tipo === "mini_campeonato" && `${evento.config?.rodadas?.length || 0} rodadas`}
                      {evento.tipo === "desafio_jogo" && `+${evento.config?.bonus || 0} pts bônus`}
                      {evento.config?.conta_principal ? " • Conta no geral" : " • Ranking separado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold ${cfg.color} ${cfg.bg} rounded-full px-2 py-0.5`}>
                      {cfg.label}
                    </span>
                    {isCriador && (
                      <button onClick={() => deleteEvento(evento.id)}
                        className="w-6 h-6 rounded-full hover:bg-white/80 flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal de Criação */}
      <CreateEventoModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        bolaoId={bolaoId}
        campeonatoId={campeonatoId}
        userId={userId}
        onCreated={(evento) => { setEventos((prev) => [evento, ...prev]); setShowCreateModal(false); }}
      />
    </Card>
  );
};

/* ═══ Modal de Criação de Evento ═══ */
const CreateEventoModal = ({ open, onClose, bolaoId, campeonatoId, userId, onCreated }: {
  open: boolean; onClose: () => void; bolaoId: string;
  campeonatoId: string | null; userId: string;
  onCreated: (evento: EventoEspecial) => void;
}) => {
  const [step, setStep] = useState<"tipo" | "config">("tipo");
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  // Multiplicador
  const [multiplicador, setMultiplicador] = useState(2);
  const [rodadasSelecionadas, setRodadasSelecionadas] = useState<string[]>([]);

  // Mini Campeonato
  const [miniRodadas, setMiniRodadas] = useState<string[]>([]);

  // Desafio Jogo
  const [jogoSelecionado, setJogoSelecionado] = useState<string | null>(null);
  const [bonus, setBonus] = useState(15);

  // Conta no bolão principal?
  const [contaPrincipal, setContaPrincipal] = useState(true);

  // Dados do campeonato
  const [rodadas, setRodadas] = useState<string[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (open && campeonatoId) loadCampeonatoData();
    if (!open) resetForm();
  }, [open, campeonatoId]);

  const resetForm = () => {
    setStep("tipo"); setTipoSelecionado(null); setNome("");
    setMultiplicador(2); setRodadasSelecionadas([]);
    setMiniRodadas([]); setJogoSelecionado(null); setBonus(15);
    setContaPrincipal(true);
  };

  const loadCampeonatoData = async () => {
    if (!campeonatoId) return;
    setLoadingData(true);
    try {
      const { data } = await supabase.from("jogos").select("*")
        .eq("campeonato_id", campeonatoId).order("data_hora", { ascending: true });
      const allJogos = (data || []) as Jogo[];
      setJogos(allJogos);

      const rodadaSet = new Set<string>();
      allJogos.forEach((j) => { if (j.rodada) rodadaSet.add(j.rodada); });
      const sorted = Array.from(rodadaSet).sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, "")) || 0;
        const nb = parseInt(b.replace(/\D/g, "")) || 0;
        return na - nb;
      });
      setRodadas(sorted);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const toggleRodada = (rodada: string, target: "mult" | "mini") => {
    if (target === "mult") {
      setRodadasSelecionadas((prev) =>
        prev.includes(rodada) ? prev.filter((r) => r !== rodada) : [...prev, rodada]
      );
    } else {
      setMiniRodadas((prev) =>
        prev.includes(rodada) ? prev.filter((r) => r !== rodada) : [...prev, rodada]
      );
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error("Dê um nome ao evento"); return; }
    if (!tipoSelecionado) return;

    let config: any = { conta_principal: contaPrincipal };
    if (tipoSelecionado === "multiplicador") {
      if (rodadasSelecionadas.length === 0) { toast.error("Selecione pelo menos uma rodada"); return; }
      config = { ...config, multiplicador, rodadas: rodadasSelecionadas };
    } else if (tipoSelecionado === "mini_campeonato") {
      if (miniRodadas.length < 2) { toast.error("Selecione pelo menos 2 rodadas"); return; }
      config = { ...config, rodadas: miniRodadas };
    } else if (tipoSelecionado === "desafio_jogo") {
      if (!jogoSelecionado) { toast.error("Selecione um jogo"); return; }
      config = { ...config, jogo_id: jogoSelecionado, bonus };
    }

    setCriando(true);
    try {
      const { data, error } = await supabase.from("eventos_especiais").insert({
        bolao_id: bolaoId,
        criador_id: userId,
        nome: nome.trim(),
        tipo: tipoSelecionado,
        config,
      }).select("*").single();

      if (error) throw error;
      toast.success("Evento criado!");
      onCreated(data as any);
    } catch (err: any) { console.error(err); toast.error(err.message || "Erro ao criar evento"); }
    finally { setCriando(false); }
  };

  const proximosJogos = jogos.filter((j) => j.status === "agendado" && new Date(j.data_hora) > new Date());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            {step === "tipo" ? "Criar Evento Especial" : nome || "Configurar Evento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === "tipo"
              ? "Escolha o tipo de evento para seu bolão"
              : tipoSelecionado === "multiplicador" ? "Configure o multiplicador e selecione as rodadas"
              : tipoSelecionado === "mini_campeonato" ? "Selecione as rodadas do mini campeonato"
              : "Escolha o jogo e defina o bônus"}
          </DialogDescription>
        </DialogHeader>

        {step === "tipo" ? (
          <div className="space-y-2 mt-2">
            {(Object.entries(TIPO_CONFIG) as [string, typeof TIPO_CONFIG.multiplicador][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const selected = tipoSelecionado === key;
              return (
                <div key={key}
                  onClick={() => setTipoSelecionado(key)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border-2 ${
                    selected ? `${cfg.border} ${cfg.bg}` : "border-transparent bg-muted/50 hover:bg-muted/80"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{cfg.label}</span>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? `border-current ${cfg.color} bg-current` : "border-gray-300"
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            })}
            <Button onClick={() => { if (tipoSelecionado) setStep("config"); }}
              disabled={!tipoSelecionado}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl h-11">
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2 flex-1 overflow-y-auto">
            {/* Nome do evento */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome do evento</label>
              <Input placeholder={
                tipoSelecionado === "multiplicador" ? "Ex: Rodada Dobrada R5"
                : tipoSelecionado === "mini_campeonato" ? "Ex: Mini Liga Fevereiro"
                : "Ex: Clássico Mineiro"
              } value={nome} onChange={(e) => setNome(e.target.value)}
                className="h-10 rounded-xl" />
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* ═══ MULTIPLICADOR ═══ */}
                {tipoSelecionado === "multiplicador" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Multiplicador</label>
                      <div className="flex gap-2">
                        {[2, 3, 5].map((m) => (
                          <button key={m} onClick={() => setMultiplicador(m)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              multiplicador === m
                                ? "bg-amber-500 text-white shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}>
                            x{m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Rodadas ({rodadasSelecionadas.length} selecionadas)
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                        {rodadas.map((r) => {
                          const sel = rodadasSelecionadas.includes(r);
                          return (
                            <button key={r} onClick={() => toggleRodada(r, "mult")}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                sel ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}>
                              {r.replace("Rodada ", "R")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ═══ MINI CAMPEONATO ═══ */}
                {tipoSelecionado === "mini_campeonato" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Rodadas do mini campeonato ({miniRodadas.length} selecionadas, mín. 2)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {rodadas.map((r) => {
                        const sel = miniRodadas.includes(r);
                        return (
                          <button key={r} onClick={() => toggleRodada(r, "mini")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              sel ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}>
                            {r.replace("Rodada ", "R")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ═══ DESAFIO DE JOGO ═══ */}
                {tipoSelecionado === "desafio_jogo" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Bônus por acerto</label>
                      <div className="flex gap-2">
                        {[10, 15, 20, 25].map((b) => (
                          <button key={b} onClick={() => setBonus(b)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              bonus === b
                                ? "bg-red-500 text-white shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}>
                            +{b}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Selecione o jogo</label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {proximosJogos.slice(0, 15).map((jogo) => {
                          const sel = jogoSelecionado === jogo.id;
                          return (
                            <div key={jogo.id} onClick={() => setJogoSelecionado(jogo.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${
                                sel ? "border-red-400 bg-red-50" : "border-gray-100 hover:bg-muted/50"
                              }`}>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                sel ? "border-red-500 bg-red-500" : "border-gray-300"
                              }`}>
                                {sel && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {jogo.logo_time_a && <img src={jogo.logo_time_a} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                                <span className="text-xs font-medium truncate">{jogo.time_a}</span>
                                <span className="text-[10px] text-muted-foreground">vs</span>
                                <span className="text-xs font-medium truncate">{jogo.time_b}</span>
                                {jogo.logo_time_b && <img src={jogo.logo_time_b} className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {jogo.rodada?.replace("Rodada ", "R")}
                              </span>
                            </div>
                          );
                        })}
                        {proximosJogos.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">Nenhum jogo agendado</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Conta no principal? */}
            <div onClick={() => setContaPrincipal(!contaPrincipal)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                contaPrincipal ? "border-copa-green-300 bg-copa-green-50" : "border-gray-200 bg-gray-50"
              }`}>
              <div className={`w-[20px] h-[20px] rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                contaPrincipal ? "bg-copa-green-500" : "bg-white border-2 border-gray-300"
              }`}>
                {contaPrincipal && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">Conta no bolão principal</span>
                <p className="text-[10px] text-muted-foreground">
                  {contaPrincipal
                    ? "Pontos extras serão somados ao ranking geral do bolão"
                    : "Pontos ficam 100% separados, só no ranking do evento"}
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep("tipo")} className="flex-1 rounded-xl">
                Voltar
              </Button>
              <Button onClick={handleCreate} disabled={criando || !nome.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl">
                {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Evento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventosEspeciais;
