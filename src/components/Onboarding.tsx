// ═══════════════════════════════════════════════════════
// Onboarding V2 — Simplificado: Welcome → Quick Bolão → Palpites
// Removidos: Modes, Fidelity, Invite, Done
// Estratégia: "Primeiro valor, depois pedido"
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import type { Campeonato } from "@/lib/types";
import {
  ArrowLeft, ChevronRight, ChevronDown, Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "onboarding_done";

// ── Helpers ──
const isOnboardingDone = (): boolean => {
  try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
};
const markOnboardingDone = () => {
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
};

// ── Step definitions ──
type Step = "welcome" | "quick_bolao";
const STEPS: Step[] = ["welcome", "quick_bolao"];

// ── Progress Dots ──
const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex gap-2 justify-center">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 rounded-full transition-all duration-500 ${
          i === current ? "w-8 bg-copa-green-500" : i < current ? "w-4 bg-copa-green-300" : "w-4 bg-gray-200"
        }`}
      />
    ))}
  </div>
);

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png";

// ═══════════════════════════════════════════════════════
// Step 1: Welcome (simplificado — 5 segundos)
// ═══════════════════════════════════════════════════════
const WelcomeStep = ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) => (
  <div className="min-h-screen flex flex-col bg-gradient-to-br from-copa-green-600 via-copa-green-700 to-copa-green-900 relative overflow-hidden"
    style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))" }}>
    <div className="absolute top-20 -right-10 w-40 h-40 bg-copa-gold-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-40 -left-10 w-32 h-32 bg-copa-green-400/20 rounded-full blur-2xl" />

    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <img src={LOGO_URL} alt="Bolão na Copa" className="w-24 h-24 object-contain mb-6 drop-shadow-lg" />
      <h1 className="text-3xl font-black text-white text-center leading-tight">
        Bolão na Copa
      </h1>
      <p className="text-copa-green-100 text-center mt-4 text-base leading-relaxed px-4">
        Faça palpites nos jogos com seus amigos.{"\n"}Quem acerta mais, lidera o ranking.
      </p>

      <div className="flex items-center gap-4 mt-8">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🎯</span>
          <span className="text-[11px] text-copa-green-200 font-medium">Palpite</span>
        </div>
        <ChevronRight className="w-4 h-4 text-copa-green-300/50" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">📊</span>
          <span className="text-[11px] text-copa-green-200 font-medium">Ranking</span>
        </div>
        <ChevronRight className="w-4 h-4 text-copa-green-300/50" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏆</span>
          <span className="text-[11px] text-copa-green-200 font-medium">Conquiste</span>
        </div>
      </div>
    </div>

    <div className="px-6 pb-8">
      <Button onClick={onNext} className="w-full h-14 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-base rounded-xl shadow-lg shadow-copa-gold-400/20">
        Criar meu bolão agora
      </Button>
      <p className="text-copa-green-200/60 text-center text-xs mt-2.5">Leva menos de 30 segundos</p>
      <button onClick={onSkip} className="w-full mt-1 text-copa-green-200/40 text-[11px] hover:text-copa-green-200/70 transition-colors">
        Pular e ir para a Home
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
// Step 2: Quick Bolão (formulário mínimo)
// ═══════════════════════════════════════════════════════
const QuickBolaoStep = ({
  onCreated, onBack, onSkip,
}: {
  onCreated: (bolaoId: string) => void;
  onBack: () => void;
  onSkip: () => void;
}) => {
  const { user } = useAuth();
  const [bolaoName, setBolaoName] = useState("");
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [selectedChamp, setSelectedChamp] = useState<string>("");
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [selectedMode, setSelectedMode] = useState("casual");

  // Modos: só mostrar os gratuitos por padrão
  const QUICK_MODES = [
    { id: "casual", name: "Casual", emoji: "🎮", desc: "Acerte vencedor ou placar e some pontos" },
    { id: "mata_mata", name: "Mata a Mata", emoji: "⚔️", desc: "Escolha um time por rodada. Errou? Eliminado!" },
    { id: "placar_correto", name: "Placar Correto", emoji: "🎯", desc: "Só vale ponto se acertar o placar exato" },
  ];

  useEffect(() => {
    supabase.from("campeonatos").select("id, nome_popular, logo_url, tipo")
      .then(({ data }) => {
        const camps = (data as Campeonato[]) || [];
        setCampeonatos(camps);
        // Pré-selecionar o campeonato mais popular (estadual > nacional > copa)
        const estadual = camps.find((c) => c.tipo === "estadual");
        const nacional = camps.find((c) => c.tipo === "nacional");
        const firstPick = estadual || nacional || camps[0];
        if (firstPick?.id) setSelectedChamp(firstPick.id);
        setLoadingCamps(false);
      });
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleCreate = async () => {
    if (!user || !bolaoName.trim() || !selectedChamp) return;
    setCreating(true);
    try {
      // Garantir profile existe
      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      if (!profile) {
        await supabase.from("profiles").upsert(
          { id: user.id, nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Usuário", email: user.email || "" },
          { onConflict: "id" }
        );
      }

      const codigo = generateCode();
      const isMataMata = selectedMode === "mata_mata";
      const descFinal = isMataMata ? "mata_mata:20" : null;

      const { data: newBolao, error } = await supabase.from("boloes").insert({
        nome: bolaoName.trim(),
        descricao: descFinal,
        codigo_convite: codigo,
        criador_id: user.id,
        campeonato_id: selectedChamp,
        modo_pontuacao: selectedMode,
        regras_ativas: isMataMata ? ["mata_mata"] : ["vencedor", "placar_exato", "saldo_gols"],
        is_publico: false,
        is_nacional: false,
      }).select("id").single();

      if (error) throw error;

      // Inserir na tabela de relação N:N
      await supabase.from("bolao_campeonatos").insert({
        bolao_id: newBolao.id,
        campeonato_id: selectedChamp,
      });

      // Entrar no bolão como participante
      await supabase.from("bolao_participantes").insert({
        bolao_id: newBolao.id,
        user_id: user.id,
      });

      trackEvent("onboarding_bolao_criado", {
        bolao_id: newBolao.id,
        bolao_name: bolaoName.trim(),
        modo: selectedMode,
        campeonato: selectedChamp,
      });

      toast.success(`Bolão criado! Código: ${codigo}`);
      onCreated(newBolao.id);
    } catch (err: any) {
      console.error("Erro ao criar bolão:", err);
      toast.error(err.message || "Erro ao criar bolão");
    } finally {
      setCreating(false);
    }
  };

  const isValid = bolaoName.trim().length >= 3 && selectedChamp;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-black">Crie seu bolão</h2>
          <p className="text-xs text-muted-foreground">Rápido e fácil — 3 campos</p>
        </div>
      </div>

      {/* 1. Nome do Bolão */}
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-gray-700">Nome do bolão</label>
        <input
          type="text"
          placeholder="Ex: Bolão da Família, Bolão do Trabalho..."
          value={bolaoName}
          onChange={(e) => setBolaoName(e.target.value)}
          maxLength={40}
          className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-copa-green-500 focus:outline-none text-sm font-medium"
          autoFocus
        />
      </div>

      {/* 2. Campeonato (pré-selecionado) */}
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-gray-700">Campeonato</label>
        {loadingCamps ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {campeonatos.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChamp(c.id!)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  selectedChamp === c.id
                    ? "border-copa-green-500 bg-copa-green-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                {c.logo_url && (
                  <img src={c.logo_url} alt="" className="w-7 h-7 object-contain flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <span className="text-sm font-semibold flex-1 truncate">{c.nome_popular}</span>
                {selectedChamp === c.id && (
                  <span className="text-copa-green-500 text-xs font-bold">Selecionado</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Modo (Casual pré-selecionado, com "ver mais" discreto) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Modo de jogo</label>
          <button
            onClick={() => setShowMoreModes(!showMoreModes)}
            className="text-[11px] text-copa-green-600 hover:text-copa-green-700 font-medium flex items-center gap-0.5"
          >
            {showMoreModes ? "Ocultar" : "Ver modos"}
            <ChevronDown className={`w-3 h-3 transition-transform ${showMoreModes ? "rotate-180" : ""}`} />
          </button>
        </div>

        {!showMoreModes ? (
          // Modo Casual pré-selecionado — mostrar resumo compacto
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-copa-green-500 bg-copa-green-50">
            <span className="text-xl">🎮</span>
            <div className="flex-1">
              <span className="text-sm font-bold">Casual</span>
              <span className="text-[11px] text-muted-foreground ml-1.5">Recomendado</span>
            </div>
            <span className="text-copa-green-500 text-[10px] font-bold bg-copa-green-100 px-2 py-0.5 rounded-full">Grátis</span>
          </div>
        ) : (
          // Lista expandida de modos
          <div className="space-y-2">
            {QUICK_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  selectedMode === mode.id
                    ? "border-copa-green-500 bg-copa-green-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className="text-xl">{mode.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{mode.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{mode.desc}</p>
                </div>
              </button>
            ))}
            <p className="text-[10px] text-muted-foreground text-center">
              Modos Premium e PRO disponíveis na tela de criação completa
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="space-y-2 pt-2">
        <ProgressDots current={1} total={2} />
        <Button
          onClick={handleCreate}
          disabled={!isValid || creating}
          className="w-full h-12 bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl disabled:opacity-50"
        >
          {creating ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</>
          ) : (
            <>Criar bolão e palpitar</>
          )}
        </Button>
        <button onClick={onSkip} className="w-full text-muted-foreground text-[11px] hover:text-foreground transition-colors">
          Pular e ir para a Home
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Skip Confirm Modal (simplificado)
// ═══════════════════════════════════════════════════════
const SkipConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl">
      <h3 className="font-bold text-base">Pular configuração?</h3>
      <p className="text-sm text-muted-foreground mt-2">
        Você pode criar bolões depois pela tela principal. Deseja pular?
      </p>
      <div className="mt-4 space-y-2">
        <Button onClick={onCancel} className="w-full bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl">
          Continuar criando bolão
        </Button>
        <button onClick={onConfirm} className="w-full text-sm text-muted-foreground hover:text-foreground">
          Sim, pular
        </button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
// MAIN: Onboarding Component
// ═══════════════════════════════════════════════════════
interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const goNext = () => {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    trackEvent("onboarding_step", { from: STEPS[step], to: STEPS[nextStep], direction: "next" });
    setStep(nextStep);
  };
  const goBack = () => {
    const prevStep = Math.max(step - 1, 0);
    trackEvent("onboarding_step", { from: STEPS[step], to: STEPS[prevStep], direction: "back" });
    setStep(prevStep);
  };

  const trySkip = () => setShowSkipConfirm(true);
  const confirmSkip = () => {
    setShowSkipConfirm(false);
    trackEvent("onboarding_skip", { skipped_at_step: STEPS[step] });
    markOnboardingDone();
    onComplete();
  };
  const cancelSkip = () => setShowSkipConfirm(false);

  const handleBolaoCreated = (bolaoId: string) => {
    trackEvent("onboarding_completo", { criou_bolao: true, bolao_id: bolaoId });
    markOnboardingDone();
    // Finaliza o onboarding e redireciona DIRETO para os palpites com flag firstTime
    onComplete();
    setTimeout(() => {
      navigate(`/bolao/${bolaoId}/palpites?firstTime=true`);
    }, 150);
  };

  const renderStep = () => {
    switch (STEPS[step]) {
      case "welcome":
        return <WelcomeStep onNext={goNext} onSkip={trySkip} />;
      case "quick_bolao":
        return <QuickBolaoStep onCreated={handleBolaoCreated} onBack={goBack} onSkip={trySkip} />;
      default:
        return null;
    }
  };

  const isFullscreenStep = STEPS[step] === "welcome";

  return (
    <div className="min-h-screen bg-white">
      {isFullscreenStep ? (
        renderStep()
      ) : (
        <div className="max-w-lg mx-auto px-4 py-6" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))" }}>
          {renderStep()}
        </div>
      )}
      {showSkipConfirm && <SkipConfirmModal onConfirm={confirmSkip} onCancel={cancelSkip} />}
    </div>
  );
};

export { isOnboardingDone, markOnboardingDone };
export default Onboarding;
