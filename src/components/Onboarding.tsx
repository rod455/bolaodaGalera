// src/components/Onboarding.tsx
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
const WelcomeStep = ({
  onNext,
  onSkip,
  onSkipDirect,
}: {
  onNext: () => void;
  onSkip: () => void;
  onSkipDirect: () => void;
}) => (
  <div className="min-h-screen flex flex-col bg-gradient-to-br from-copa-green-600 via-copa-green-700 to-copa-green-900 relative overflow-hidden"
    style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))" }}>
    <div className="absolute top-20 -right-10 w-40 h-40 bg-copa-gold-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-40 -left-10 w-32 h-32 bg-copa-green-400/20 rounded-full blur-2xl" />

    {/* Botão Pular — canto superior direito, discreto */}
    <div className="absolute top-4 right-4" style={{ top: "max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))" }}>
      <button
        onClick={onSkipDirect}
        className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors text-xs font-medium px-2 py-1 rounded-full"
      >
        Pular
        <X className="w-3 h-3" />
      </button>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <img src={LOGO_URL} alt="Bolão na Copa" className="w-24 h-24 object-contain mb-6 drop-shadow-lg" />
      <h1 className="text-3xl font-black text-white text-center leading-tight">
        Bolão na Copa
      </h1>
      <p className="text-copa-green-100 text-center mt-4 text-base leading-relaxed px-4">
        Faça palpites nos jogos com seus amigos.{"\n"}Quem acerta mais, lidera o ranking.
      </p>

      <div className="mt-10 w-full max-w-xs space-y-3">
        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
          <span className="text-2xl">🏆</span>
          <p className="text-white text-sm font-medium">Crie bolões e convide amigos</p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
          <span className="text-2xl">⚽</span>
          <p className="text-white text-sm font-medium">Palpite em qualquer campeonato</p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
          <span className="text-2xl">📊</span>
          <p className="text-white text-sm font-medium">Ranking automático em tempo real</p>
        </div>
      </div>
    </div>

    <div className="px-8 pb-10 space-y-3">
      <Button
        onClick={onNext}
        className="w-full h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-900 font-black text-base rounded-xl shadow-lg"
      >
        Criar meu bolão agora
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
      <button
        onClick={onSkip}
        className="w-full text-white/50 hover:text-white/70 text-xs transition-colors py-1"
      >
        Já tenho um código de convite
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
// Step 2: Quick Bolão Creation
// ═══════════════════════════════════════════════════════
const QUICK_MODES = [
  { id: "casual", emoji: "🎮", name: "Casual", desc: "Resultado + placar exato" },
  { id: "profissional", emoji: "🧠", name: "Profissional", desc: "Inclui gols por time" },
  { id: "amador", emoji: "😄", name: "Amador", desc: "Só o resultado importa" },
];

const QuickBolaoStep = ({
  onCreated,
  onBack,
  onSkip,
}: {
  onCreated: (id: string) => void;
  onBack: () => void;
  onSkip: () => void;
}) => {
  const { user } = useAuth();
  const [bolaoName, setBolaoName] = useState("");
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [selectedChamp, setSelectedChamp] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState("casual");
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showMoreModes, setShowMoreModes] = useState(false);

  useEffect(() => {
    const loadCamps = async () => {
      setLoadingCamps(true);
      try {
        const { data } = await supabase
          .from("campeonatos")
          .select("id, nome_popular, logo_url, ativo")
          .eq("ativo", true)
          .order("nome_popular");
        if (data && data.length > 0) {
          setCampeonatos(data);
          setSelectedChamp(data[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar campeonatos:", err);
      } finally {
        setLoadingCamps(false);
      }
    };
    loadCamps();
  }, []);

  const handleCreate = async () => {
    if (!user || !bolaoName.trim() || !selectedChamp) return;
    setCreating(true);
    try {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: newBolao, error } = await supabase
        .from("boloes")
        .insert({
          nome: bolaoName.trim(),
          campeonato_id: selectedChamp,
          modo: selectedMode,
          criador_id: user.id,
          codigo_convite: codigo,
          is_publico: false,
        })
        .select()
        .single();
      if (error) throw error;
      if (!newBolao) throw new Error("Bolão não criado");

      await supabase.from("bolao_campeonatos").insert({
        bolao_id: newBolao.id,
        campeonato_id: selectedChamp,
      });

      await supabase.from("bolao_participantes").insert({
        bolao_id: newBolao.id,
        user_id: user.id,
      });

      toast.success(`Bolão "${bolaoName.trim()}" criado!\nCódigo: ${codigo}`);
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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-copa-green-500 bg-copa-green-50">
            <span className="text-xl">🎮</span>
            <div className="flex-1">
              <span className="text-sm font-bold">Casual</span>
              <span className="text-[11px] text-muted-foreground ml-1.5">Recomendado</span>
            </div>
            <span className="text-copa-green-500 text-[10px] font-bold bg-copa-green-100 px-2 py-0.5 rounded-full">Grátis</span>
          </div>
        ) : (
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

  // Pular com confirmação (usado no QuickBolaoStep)
  const trySkip = () => setShowSkipConfirm(true);

  // Pular direto, sem modal (usado no botão "Pular" do WelcomeStep)
  const directSkip = () => {
    trackEvent("onboarding_skip", { skipped_at_step: STEPS[step], method: "direct" });
    markOnboardingDone();
    onComplete();
  };

  const confirmSkip = () => {
    setShowSkipConfirm(false);
    trackEvent("onboarding_skip", { skipped_at_step: STEPS[step], method: "modal" });
    markOnboardingDone();
    onComplete();
  };
  const cancelSkip = () => setShowSkipConfirm(false);

  const handleBolaoCreated = (bolaoId: string) => {
    trackEvent("onboarding_completo", { criou_bolao: true, bolao_id: bolaoId });
    markOnboardingDone();
    onComplete();
    setTimeout(() => {
      navigate(`/bolao/${bolaoId}/palpites?firstTime=true`);
    }, 150);
  };

  const renderStep = () => {
    switch (STEPS[step]) {
      case "welcome":
        return <WelcomeStep onNext={goNext} onSkip={trySkip} onSkipDirect={directSkip} />;
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
