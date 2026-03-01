// ═══════════════════════════════════════════════════════
// Onboarding — Exibido para novos usuários sem bolões
// ═══════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { trackEvent } from "@/lib/analytics";
import { useUserPlan } from "@/hooks/useUserPlan";
import { MODO_LABELS, MODO_REGRAS, MODOS_PONTUACAO } from "@/lib/constants";
import type { Campeonato } from "@/lib/types";
import {
  ArrowLeft, ChevronRight, Crown, Info, Lock, Share2,
  Copy, Check, Loader2, X, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import AdRewardModal from "@/components/AdRewardModal";

const ONBOARDING_KEY = "onboarding_done";

// ── Helpers ──
const isOnboardingDone = (): boolean => {
  try { return localStorage.getItem(ONBOARDING_KEY) === "true"; } catch { return false; }
};
const markOnboardingDone = () => {
  try { localStorage.setItem(ONBOARDING_KEY, "true"); } catch {}
};

// ── Step definitions ──
type Step = "welcome" | "modes" | "fidelity" | "create_bolao" | "invite_friends" | "done";
const STEPS: Step[] = ["welcome", "modes", "fidelity", "create_bolao", "invite_friends", "done"];

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
// Step 1: Welcome
// ═══════════════════════════════════════════════════════
const WelcomeStep = ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) => (
  <div className="min-h-screen flex flex-col bg-gradient-to-br from-copa-green-600 via-copa-green-700 to-copa-green-900 relative overflow-hidden"
    style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))" }}>
    <div className="absolute top-20 -right-10 w-40 h-40 bg-copa-gold-400/10 rounded-full blur-3xl" />
    <div className="absolute bottom-40 -left-10 w-32 h-32 bg-copa-green-400/20 rounded-full blur-2xl" />

    <div className="text-center pt-4 px-8">
      <p className="text-copa-green-200/50 text-xs font-medium tracking-widest uppercase">Configuração inicial</p>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <img src={LOGO_URL} alt="Bolão na Copa" className="w-20 h-20 object-contain mb-5 drop-shadow-lg" />
      <h1 className="text-2xl font-black text-white text-center leading-tight">
        Bem-vindo ao<br />
        <span className="text-copa-gold-400">Bolão na Copa!</span>
      </h1>
      <p className="text-copa-green-100 text-center mt-3 text-sm leading-relaxed px-2">
        Faça palpites, dispute com amigos e concorra a prêmios exclusivos nos maiores campeonatos do Brasil e do mundo!
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {["🎯 Palpites", "🏆 Rankings", "💰 Prêmios", "👥 Amigos"].map((f) => (
          <span key={f} className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/10">
            {f}
          </span>
        ))}
      </div>
    </div>

    <div className="px-6 pb-8">
      <Button onClick={onNext} className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-base rounded-xl shadow-lg">
        Vamos começar! 🚀
      </Button>
      <p className="text-copa-green-200/60 text-center text-xs mt-2">Configuração rápida · 1 minuto</p>
      <button onClick={onSkip} className="w-full mt-1 text-copa-green-200/40 text-[11px] hover:text-copa-green-200/70 transition-colors">
        Pular onboarding →
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
// Step 2: Game Modes
// ═══════════════════════════════════════════════════════
const ModesStep = ({ onNext, onBack, onSkip }: { onNext: () => void; onBack: () => void; onSkip: () => void }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  // 0 = destaca Casual (fechado) → toque para abrir
  // 1 = Casual aberto, lendo regras → botão "Entendi" aparece
  // 2 = transição → destaca Fanático (fechado)
  // 3 = Fanático aberto, lendo regras → botão "Entendi"
  // 4 = tudo liberado

  const modes = [
    { id: "casual", name: "Casual", emoji: "🎮", tag: "Grátis", tagColor: "bg-copa-green-100 text-copa-green-700", free: true },
    { id: "mata_mata", name: "Mata a Mata", emoji: "💀", tag: "Novo!", tagColor: "bg-red-100 text-red-600", free: true },
    { id: "placar_correto", name: "Placar Correto", emoji: "🎯", tag: "Grátis", tagColor: "bg-copa-green-100 text-copa-green-700", free: true },
    { id: "amador", name: "Amador", emoji: "⚡", tag: "Premium", tagColor: "bg-copa-gold-100 text-copa-gold-700", free: false },
    { id: "vencedor_ou_nada", name: "Vencedor ou Nada", emoji: "🏅", tag: "Premium", tagColor: "bg-copa-gold-100 text-copa-gold-700", free: false },
    { id: "profissional", name: "Profissional", emoji: "🏟️", tag: "PRO", tagColor: "bg-copa-green-600 text-white", free: false },
    { id: "fanatico", name: "Torcedor Fanático", emoji: "🔥", tag: "PRO", tagColor: "bg-copa-green-600 text-white", free: false },
  ];

  const highlightId = tutorialStep <= 1 ? "casual" : tutorialStep <= 3 ? "fanatico" : null;
  const isTutorial = tutorialStep < 4;

  const handleModeClick = (modeId: string) => {
    if (tutorialStep === 0 && modeId === "casual") {
      setExpanded("casual");
      setTutorialStep(1);
    } else if (tutorialStep === 2 && modeId === "fanatico") {
      setExpanded("fanatico");
      setTutorialStep(3);
    } else if (tutorialStep >= 4) {
      setExpanded(expanded === modeId ? null : modeId);
    }
  };

  const handleEntendi = () => {
    if (tutorialStep === 1) {
      // Fecha Casual com transição suave antes de destacar Fanático
      setExpanded(null);
      setTransitioning(true);
      setTimeout(() => {
        setTransitioning(false);
        setTutorialStep(2);
      }, 600);
    } else if (tutorialStep === 3) {
      // Fecha Fanático e libera tudo
      setExpanded(null);
      setTutorialStep(4);
    }
  };

  const tooltipText = 
    tutorialStep === 0 ? "👆 Toque no Casual para ver como funciona" :
    tutorialStep === 1 ? "👀 Este é o modo mais simples! Veja as regras abaixo" :
    transitioning ? "✅ Ótimo! Agora vamos ver o modo mais completo..." :
    tutorialStep === 2 ? "🔥 Agora toque no Torcedor Fanático para comparar" :
    tutorialStep === 3 ? "👀 Este é o modo mais completo! Compare as regras" :
    null;

  return (
    <div className="space-y-4 animate-fade-in relative">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-black">Modos de Jogo</h2>
          <p className="text-xs text-muted-foreground">Conheça os modos de pontuação</p>
        </div>
      </div>

      {tooltipText && (
        <div className={`text-white text-xs font-semibold px-4 py-2.5 rounded-xl text-center transition-all duration-300 ${
          transitioning ? "bg-copa-green-500" :
          tutorialStep === 1 || tutorialStep === 3 ? "bg-copa-gold-500" : 
          "bg-copa-green-600 animate-pulse"
        }`}>
          {tooltipText}
        </div>
      )}

      {isTutorial && (
        <div className="fixed inset-0 bg-black/40 pointer-events-none" style={{ zIndex: 10 }} />
      )}

      <div className="space-y-2 relative" style={{ zIndex: isTutorial ? 20 : "auto" }}>
        {modes.map((mode) => {
          const regras = MODO_REGRAS[mode.id];
          const isHighlighted = highlightId === mode.id;
          const isClickable = (!isTutorial || isHighlighted) && !transitioning;
          // Quando expandido no tutorial, não deixar fechar clicando no card (só pelo botão Entendi)
          const shouldHandleClick = isClickable && !(isTutorial && expanded === mode.id);

          return (
            <div
              key={mode.id}
              onClick={() => shouldHandleClick && handleModeClick(mode.id)}
              className={`rounded-xl border p-3 transition-all duration-300 ${
                isHighlighted && !transitioning
                  ? "bg-white border-copa-green-500 shadow-lg shadow-copa-green-200 ring-2 ring-copa-green-400 cursor-pointer"
                  : isTutorial || transitioning
                  ? "bg-gray-100 border-gray-200 opacity-30 pointer-events-none"
                  : "bg-white border-gray-200 cursor-pointer hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">{mode.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{mode.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mode.tagColor}`}>{mode.tag}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{regras?.descricao}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded === mode.id ? "rotate-90" : ""}`} />
              </div>
              {expanded === mode.id && regras && (
                <div className="mt-2 bg-muted/50 rounded-lg p-2.5 space-y-1 animate-fade-in">
                  {regras.regras.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className={r.acerto ? "text-copa-green-700" : "text-muted-foreground"}>
                        {r.acerto ? "✓" : "✗"} {r.texto}
                      </span>
                      <span className="font-bold">{r.pontos}</span>
                    </div>
                  ))}
                  {isTutorial && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEntendi(); }}
                      className="w-full mt-3 py-2 bg-copa-green-600 hover:bg-copa-green-700 text-white text-xs font-bold rounded-lg active:scale-95 transition-all"
                    >
                      ✓ Entendi, continuar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 pt-2 relative" style={{ zIndex: 30 }}>
        <ProgressDots current={1} total={5} />
        <Button onClick={onNext} disabled={isTutorial} className="w-full h-11 bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl disabled:opacity-40">
          Entendi os modos →
        </Button>
        <button onClick={onSkip} className="w-full text-muted-foreground text-[11px] hover:text-foreground transition-colors">
          Pular onboarding →
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Step 3: Fidelity / Referral
// ═══════════════════════════════════════════════════════
const FidelityStep = ({ onNext, onBack, onSkip }: { onNext: () => void; onBack: () => void; onSkip: () => void }) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
      <div>
        <h2 className="text-xl font-black">Premium Grátis! 🎁</h2>
        <p className="text-xs text-copa-gold-600 font-semibold">Convide amigos e ganhe benefícios</p>
      </div>
    </div>

    {/* How it works */}
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="font-bold text-sm">Como funciona?</h3>
      {[
        { icon: "📤", title: "Compartilhe seu código", desc: "Envie seu link exclusivo para amigos" },
        { icon: "👤", title: "Amigos se cadastram", desc: "Quando criam conta pelo seu link, conta como indicação" },
        { icon: "🎉", title: "Ganhe recompensas!", desc: "Desbloqueie Premium grátis por cada amigo" },
      ].map((s) => (
        <div key={s.title} className="flex gap-3">
          <div className="w-9 h-9 bg-copa-green-100 rounded-lg flex items-center justify-center text-base flex-shrink-0">{s.icon}</div>
          <div>
            <p className="font-bold text-xs">{s.title}</p>
            <p className="text-[11px] text-muted-foreground">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Reward tiers */}
    <div className="bg-copa-gold-50 border border-copa-gold-200 rounded-xl p-4 space-y-2">
      <h3 className="font-bold text-sm">🏅 Recompensas</h3>
      {[
        { friends: 1, reward: "7 dias de Premium", color: "bg-copa-green-500" },
        { friends: 3, reward: "30 dias de Premium", color: "bg-copa-gold-400" },
        { friends: 5, reward: "Premium por 3 meses!", color: "bg-orange-400" },
        { friends: 10, reward: "Premium PRO por 1 ano! 🔥", color: "bg-copa-green-700" },
      ].map((tier) => (
        <div key={tier.friends} className="flex items-center gap-3 p-2.5 bg-white rounded-lg">
          <div className={`w-8 h-8 ${tier.color} rounded-lg flex items-center justify-center text-white font-black text-xs`}>
            {tier.friends}
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground">{tier.friends} {tier.friends === 1 ? "amigo" : "amigos"}</p>
            <p className="font-bold text-xs">{tier.reward}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="space-y-2 pt-2">
      <ProgressDots current={2} total={5} />
      <Button onClick={onNext} className="w-full h-11 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-bold rounded-xl">
        Quero ganhar Premium! 🎁
      </Button>
      <button onClick={onSkip} className="w-full text-muted-foreground text-[11px] hover:text-foreground transition-colors">
        Pular onboarding →
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════
// Step 4: Create First Bolão
// ═══════════════════════════════════════════════════════
const CreateBolaoStep = ({
  onNext, onBack, onSkip,
}: {
  onNext: (bolaoId: string, bolaoName: string, bolaoCode: string) => void;
  onBack: () => void;
  onSkip: () => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bolaoName, setBolaoName] = useState("");
  const [selectedMode, setSelectedMode] = useState("casual");
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [selectedChamps, setSelectedChamps] = useState<Set<string>>(new Set());
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [creating, setCreating] = useState(false);
  const [premiumModal, setPremiumModal] = useState<string | null>(null);
  const { plano: userPlano } = useUserPlan();

  useEffect(() => {
    supabase.from("campeonatos").select("id, nome_popular, logo_url, tipo").then(({ data }) => {
      setCampeonatos((data as Campeonato[]) || []);
      setLoadingCamps(false);
    });
  }, []);

  const modes = [
    { id: "casual", name: "Casual", emoji: "🎮", tag: "Grátis", tagColor: "bg-copa-green-100 text-copa-green-700", plano: "free" },
    { id: "mata_mata", name: "Mata a Mata", emoji: "💀", tag: "Novo!", tagColor: "bg-red-100 text-red-600", plano: "free" },
    { id: "placar_correto", name: "Placar Correto", emoji: "🎯", tag: "Grátis", tagColor: "bg-copa-green-100 text-copa-green-700", plano: "free" },
    { id: "amador", name: "Amador", emoji: "⚡", tag: "Premium", tagColor: "bg-copa-gold-100 text-copa-gold-700", plano: "premium" },
    { id: "vencedor_ou_nada", name: "Vencedor ou Nada", emoji: "🏅", tag: "Premium", tagColor: "bg-copa-gold-100 text-copa-gold-700", plano: "premium" },
    { id: "profissional", name: "Profissional", emoji: "🏟️", tag: "PRO", tagColor: "bg-copa-green-600 text-white", plano: "premium_pro" },
    { id: "fanatico", name: "Torcedor Fanático", emoji: "🔥", tag: "PRO", tagColor: "bg-copa-green-600 text-white", plano: "premium_pro" },
  ];

  const canUseMode = (plano: string) => {
    if (plano === "free") return true;
    if (plano === "premium") return userPlano === "premium" || userPlano === "premium_pro";
    if (plano === "premium_pro") return userPlano === "premium_pro";
    return false;
  };

  const handleSelectMode = (mode: typeof modes[0]) => {
    if (!canUseMode(mode.plano)) {
      setPremiumModal(mode.tag);
    } else {
      setSelectedMode(mode.id);
    }
  };

  const toggleChamp = (id: string) => {
    setSelectedChamps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user || !bolaoName || selectedChamps.size === 0) return;
    setCreating(true);
    try {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      const regrasAtivas = selectedMode === "mata_mata"
        ? ["mata_mata"]
        : MODO_REGRAS[selectedMode]?.regras.filter((r) => r.acerto).map((r) => r.texto) || [];

      const { data: newBolao, error } = await supabase.from("boloes").insert({
        nome: bolaoName,
        codigo_convite: codigo,
        criador_id: user.id,
        campeonato_id: [...selectedChamps][0],
        modo_pontuacao: selectedMode,
        regras_ativas: regrasAtivas,
        is_publico: false,
        is_nacional: false,
      }).select("id").single();

      if (error) throw error;

      // Inserir campeonatos N:N
      const campInserts = [...selectedChamps].map((cId) => ({ bolao_id: newBolao.id, campeonato_id: cId }));
      await supabase.from("bolao_campeonatos").insert(campInserts);

      // Inserir criador como participante
      await supabase.from("bolao_participantes").insert({ bolao_id: newBolao.id, user_id: user.id });

      toast.success(`Bolão criado! Código: ${codigo}`);
      onNext(newBolao.id, bolaoName, codigo);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar bolão");
    } finally {
      setCreating(false);
    }
  };

  const isValid = bolaoName.trim() && selectedChamps.size > 0 && selectedMode;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-black">Crie seu 1º bolão!</h2>
          <p className="text-xs text-muted-foreground">Monte um grupo privado para disputar com amigos</p>
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className="text-sm font-bold mb-1.5 block">Nome do bolão</label>
        <input
          type="text"
          placeholder='ex: "Bolão dos Amigos"'
          value={bolaoName}
          onChange={(e) => setBolaoName(e.target.value)}
          className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-copa-green-500 outline-none text-sm font-medium bg-white transition-colors"
        />
      </div>

      {/* Modo */}
      <div>
        <label className="text-sm font-bold mb-2 block">Modo de Jogo</label>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectMode(m)}
              className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all ${
                selectedMode === m.id ? "border-copa-green-500 bg-copa-green-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-base">{m.emoji}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${m.tagColor}`}>{m.tag}</span>
              </div>
              <span className="font-bold text-[11px] mt-1">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Campeonatos */}
      <div>
        <label className="text-sm font-bold mb-2 block">Campeonatos</label>
        {loadingCamps ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-copa-green-500" /></div>
        ) : (
          <div className="space-y-1.5">
            {campeonatos.map((c) => {
              const emojiMap: Record<string, string> = {
                "paulistão": "🏴",
                "mineiro": "⛰️",
                "brasileirão": "🇧🇷",
                "copa do brasil": "🏆",
                "copa do mundo": "🌍",
                "champions": "⭐",
                "libertadores": "🏅",
              };
              const key = Object.keys(emojiMap).find((k) => (c.nome_popular || "").toLowerCase().includes(k));
              const emoji = key ? emojiMap[key] : "⚽";

              return (
                <button
                  key={c.id}
                  onClick={() => toggleChamp(c.id!)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    selectedChamps.has(c.id!) ? "border-copa-green-500 bg-copa-green-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">
                    {c.logo_url ? <img src={c.logo_url} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = emoji; }} /> : emoji}
                  </div>
                  <span className="flex-1 text-left font-semibold text-xs">{c.nome_popular}</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    selectedChamps.has(c.id!) ? "border-copa-green-500 bg-copa-green-500" : "border-gray-300"
                  }`}>
                    {selectedChamps.has(c.id!) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {premiumModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 text-center shadow-xl max-w-sm w-full">
            <div className="w-14 h-14 bg-copa-gold-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Crown className="w-7 h-7 text-copa-gold-500" />
            </div>
            <h3 className="font-black text-lg">Modo {premiumModal}</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Este modo está disponível para assinantes do plano <strong>{premiumModal}</strong>.
            </p>
            <div className="mt-4 space-y-2">
              <Button onClick={() => { setPremiumModal(null); navigate("/planos"); }} className="w-full bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-bold rounded-xl">
                👑 Ver planos
              </Button>
              <button onClick={() => setPremiumModal(null)} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Escolher outro modo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2">
        <ProgressDots current={3} total={5} />
        <Button
          onClick={handleCreate}
          disabled={!isValid || creating}
          className="w-full h-11 bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl disabled:opacity-50"
        >
          {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</> : "Criar bolão →"}
        </Button>
        <button onClick={onSkip} className="w-full text-muted-foreground text-[11px] hover:text-foreground transition-colors">
          Pular onboarding →
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Step 5: Invite Friends
// ═══════════════════════════════════════════════════════
const InviteFriendsStep = ({
  onNext, onBack, onSkip, bolaoName, bolaoCode, userCode,
}: {
  onNext: () => void; onBack: () => void; onSkip: () => void;
  bolaoName: string; bolaoCode: string; userCode: string;
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const referralLink = `https://bolaonacopa.com.br/auth?ref=${userCode}`;
  const whatsappText = [
    `🏆 Vem jogar no Bolão na Copa!`,
    bolaoName ? `\nCriei o bolão "${bolaoName}" e quero te desafiar!` : "",
    `\nFaça seus palpites nos jogos do Paulistão, Brasileirão e mais.`,
    bolaoCode ? `\n\n📋 Código do bolão: ${bolaoCode}` : "",
    `\n🔗 Crie sua conta: ${referralLink}`,
    `\nMeu código de indicação: ${userCode}`,
  ].join("");

  const handleWhatsApp = () => {
    setShared(true);
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(referralLink);
    setLinkCopied(true);
    setShared(true);
    toast.success("Link copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-black">Convide 3 amigos!</h2>
          <p className="text-xs text-muted-foreground">Bolão fica melhor com mais gente</p>
        </div>
      </div>

      {/* Progress to reward */}
      <div className="bg-copa-gold-50 border border-copa-gold-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">🎁 Progresso para Premium grátis</span>
          <span className="text-sm font-bold text-copa-gold-600">0/3</span>
        </div>
        <div className="w-full h-2.5 bg-copa-gold-200 rounded-full overflow-hidden">
          <div className="h-full bg-copa-gold-400 rounded-full" style={{ width: "0%" }} />
        </div>
        <p className="text-[11px] text-copa-gold-700 mt-2">
          Quando 3 amigos se cadastrarem pelo seu link, você ganha 7 dias de Premium!
        </p>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 p-4 bg-green-500 rounded-xl text-white active:scale-95 transition-transform shadow-sm">
          <span className="text-xl">💬</span>
          <span className="text-xs font-bold">WhatsApp</span>
        </button>
        <button onClick={handleCopy} className={`flex flex-col items-center gap-2 p-4 rounded-xl active:scale-95 transition-all ${linkCopied ? "bg-copa-green-100 border-2 border-copa-green-400" : "bg-white border-2 border-gray-200"}`}>
          <span className="text-xl">{linkCopied ? "✅" : "🔗"}</span>
          <span className={`text-xs font-bold ${linkCopied ? "text-copa-green-600" : "text-gray-700"}`}>{linkCopied ? "Copiado!" : "Copiar Link"}</span>
        </button>
      </div>

      {/* Link preview */}
      {shared && (
        <div className="bg-copa-green-50 border border-copa-green-200 rounded-xl p-3">
          <p className="text-[10px] text-copa-green-600 font-semibold uppercase tracking-wider mb-1.5">Seu link de convite</p>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-copa-green-200">
            <span className="text-[11px] text-gray-600 font-mono truncate flex-1">{referralLink}</span>
            <button onClick={handleCopy} className="text-copa-green-600 text-xs font-bold flex-shrink-0">
              {linkCopied ? "✓" : "📋"}
            </button>
          </div>
        </div>
      )}

      {/* How it counts */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <h4 className="font-bold text-xs">📋 Como funciona?</h4>
        {[
          "Envie seu link via WhatsApp ou copie",
          "Seu amigo cria uma conta pelo seu link",
          "A indicação é contabilizada automaticamente!",
        ].map((text, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <span className="font-bold mt-0.5">{i + 1}.</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <ProgressDots current={4} total={5} />
        <Button
          onClick={handleWhatsApp}
          className="w-full h-11 bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl"
        >
          💬 Convidar agora
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          className="w-full h-11 border-gray-300 text-gray-600 font-semibold rounded-xl"
        >
          Convidar mais tarde →
        </Button>
        <button onClick={onSkip} className="w-full text-muted-foreground text-[11px] hover:text-foreground transition-colors">
          Pular onboarding →
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Step 6: Done
// ═══════════════════════════════════════════════════════
const DoneStep = ({
  onFinish, bolaoId, bolaoName,
}: {
  onFinish: () => void; bolaoId: string; bolaoName: string;
}) => {
  const navigate = useNavigate();
  const { showAd, needsAd, resolveWebAd } = useRewardedAd();
  const [showAdModal, setShowAdModal] = useState(false);

  const handlePalpites = async () => {
    // 1) Mostrar ad ANTES de desmontar o portal
    if (needsAd) {
      try {
        await showAd("onboarding_palpites");
      } catch (e) {
        console.warn("Ad failed, continuing:", e);
      }
    }

    // 2) Salvar destino antes de desmontar
    const destination = bolaoId ? `/bolao/${bolaoId}/palpites` : "/home";

    // 3) Finalizar onboarding (desmonta o portal)
    onFinish();

    // 4) Navegar com delay para garantir desmontagem limpa
    setTimeout(() => {
      navigate(destination);
    }, 150);
  };

  const handleGoHome = () => {
    onFinish();
    setTimeout(() => navigate("/home"), 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-copa-green-600 via-copa-green-700 to-copa-green-900 overflow-hidden relative animate-fade-in"
      style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 1.5rem))" }}>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <img src={LOGO_URL} alt="Bolão na Copa" className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
        <div className="text-5xl mb-4">🎊</div>
        <h1 className="text-2xl font-black text-white text-center">Tudo pronto!</h1>
        <p className="text-copa-green-100 text-center mt-3 text-sm px-4 leading-relaxed">
          {bolaoName
            ? `Seu bolão "${bolaoName}" está criado! Agora faça seus palpites e acompanhe o ranking.`
            : "Agora é só fazer seus palpites e acompanhar o ranking!"}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-6 w-full">
          {[
            { label: "Bolão criado", value: bolaoId ? "1" : "0", emoji: "⚽" },
            { label: "Amigos", value: "—", emoji: "👥" },
            { label: "Campeonatos", value: "—", emoji: "🏆" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center border border-white/10">
              <span className="text-xl">{s.emoji}</span>
              <p className="text-white font-black text-lg mt-0.5">{s.value}</p>
              <p className="text-copa-green-200 text-[9px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8 space-y-2">
        <Button onClick={handlePalpites} className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-base rounded-xl shadow-lg">
          Fazer meus palpites 🎯
        </Button>
        <button
          onClick={handleGoHome}
          className="w-full text-copa-green-200 text-sm font-medium hover:text-white transition-colors"
        >
          Ir para a Home
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Skip Confirmation Modal
// ═══════════════════════════════════════════════════════
const SkipConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl p-6 text-center shadow-xl max-w-sm w-full">
      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <span className="text-xl">⚠️</span>
      </div>
      <h3 className="font-black text-lg">Pular configuração?</h3>
      <p className="text-muted-foreground text-sm mt-2">
        Tem certeza que deseja pular o onboarding? Você pode perder dicas importantes sobre modos de jogo e como ganhar Premium grátis!
      </p>
      <div className="mt-4 space-y-2">
        <Button onClick={onCancel} className="w-full bg-copa-green-600 hover:bg-copa-green-700 text-white font-bold rounded-xl">
          Continuar configuração
        </Button>
        <button onClick={onConfirm} className="w-full text-sm text-muted-foreground hover:text-foreground">
          Sim, pular mesmo assim
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
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [createdBolaoId, setCreatedBolaoId] = useState("");
  const [createdBolaoName, setCreatedBolaoName] = useState("");
  const [createdBolaoCode, setCreatedBolaoCode] = useState("");

  const userCode = user?.id?.substring(0, 8).toUpperCase() || "REF";

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

  const handleBolaoCreated = (bolaoId: string, name: string, code: string) => {
    setCreatedBolaoId(bolaoId);
    setCreatedBolaoName(name);
    setCreatedBolaoCode(code);
    trackEvent("onboarding_bolao_criado", { bolao_id: bolaoId, bolao_name: name });
    goNext();
  };

  const handleFinish = () => {
    trackEvent("onboarding_completo", { criou_bolao: !!createdBolaoId });
    markOnboardingDone();
    onComplete();
  };

  const renderStep = () => {
    switch (STEPS[step]) {
      case "welcome":
        return <WelcomeStep onNext={goNext} onSkip={trySkip} />;
      case "modes":
        return <ModesStep onNext={goNext} onBack={goBack} onSkip={trySkip} />;
      case "fidelity":
        return <FidelityStep onNext={goNext} onBack={goBack} onSkip={trySkip} />;
      case "create_bolao":
        return <CreateBolaoStep onNext={handleBolaoCreated} onBack={goBack} onSkip={trySkip} />;
      case "invite_friends":
        return (
          <InviteFriendsStep
            onNext={goNext}
            onBack={goBack}
            onSkip={trySkip}
            bolaoName={createdBolaoName}
            bolaoCode={createdBolaoCode}
            userCode={userCode}
          />
        );
      case "done":
        return <DoneStep onFinish={handleFinish} bolaoId={createdBolaoId} bolaoName={createdBolaoName} />;
      default:
        return null;
    }
  };

  const isFullscreenStep = STEPS[step] === "welcome" || STEPS[step] === "done";

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
