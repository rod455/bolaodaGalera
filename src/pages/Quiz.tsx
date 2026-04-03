import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Loader2, ChevronRight, Copy, Check, Crown, Lock, Globe, Target, Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import html2canvas from "html2canvas";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import AdRewardModal from "@/components/AdRewardModal";
import AdLoadingOverlay from "@/components/AdLoadingOverlay";
import SEOHead from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import {
  PERGUNTAS, SELECOES, calcularPerfil, encontrarSelecao,
  perfilParaPorcentagens, calcularCompatibilidade,
  type SelecaoQuiz, type Perfil,
} from "@/lib/quiz-data";
import { PLAY_STORE_URL } from "@/lib/constants";
import { shareViaWhatsApp } from "@/lib/utils";

type QuizStep = "hub" | "intro" | "pergunta" | "calculando" | "ad-gate" | "resultado";

// Quizzes futuros (Em Breve)
const FUTURE_QUIZZES = [
  { emoji: "👤", title: "Qual lenda da Copa voce seria?", desc: "Pele, Zidane, Maradona ou Ronaldo Fenomeno?", icon: Globe },
  { emoji: "🎯", title: "Qual tipo de palpiteiro voce e?", desc: "Analista, sortudo, torcedor ou o social?", icon: Target },
  { emoji: "🏟️", title: "Qual posicao voce joga na vida?", desc: "Atacante, goleiro, meia ou zagueiro?", icon: Shield },
  { emoji: "🌎", title: "Em qual pais-sede voce estaria?", desc: "EUA, Mexico ou Canada?", icon: MapPin },
];

// Dias ate a Copa (11 Jun 2026)
const COPA_DATE = new Date("2026-06-11T00:00:00Z");
const getDaysUntilCopa = () => Math.max(0, Math.ceil((COPA_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

const Quiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plano } = useUserPlan();
  const { showAd, adLoading, resolveWebAd, needsAd } = useRewardedAd();

  const [step, setStep] = useState<QuizStep>("hub");
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [selecao, setSelecao] = useState<SelecaoQuiz | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [compatPct, setCompatPct] = useState(0);
  const [animBars, setAnimBars] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Premium/Pro pula o ad
  const isPremium = plano === "premium" || plano === "premium_pro";

  const handleStart = () => {
    trackEvent("quiz_start", { quiz_id: "quiz_selecao" });
    setStep("pergunta");
    setPerguntaIdx(0);
    setRespostas([]);
  };

  const handleResposta = (opcaoIdx: number) => {
    const novasRespostas = [...respostas, opcaoIdx];
    setRespostas(novasRespostas);

    if (novasRespostas.length >= PERGUNTAS.length) {
      // Todas respondidas → calcular
      setStep("calculando");
      const p = calcularPerfil(novasRespostas);
      const s = encontrarSelecao(p);
      setPerfil(p);
      setSelecao(s);
      setCompatPct(calcularCompatibilidade(p, s));

      trackEvent("quiz_complete", { quiz_id: "quiz_selecao", resultado: s.id });

      setTimeout(() => {
        if (isPremium) {
          setStep("resultado");
          setTimeout(() => setAnimBars(true), 500);
        } else {
          setStep("ad-gate");
        }
      }, 2000);
    } else {
      setPerguntaIdx(novasRespostas.length);
    }
  };

  const handleAdGate = async () => {
    if (needsAd) {
      trackEvent("quiz_ad_shown", { quiz_id: "quiz_selecao" });
      const adResult = await showAd("quiz");
      if (!adResult) return;
    }
    setStep("resultado");
    setTimeout(() => setAnimBars(true), 500);
  };

  const [sharing, setSharing] = useState(false);

  // Gera imagem do card de resultado e compartilha
  const generateAndShare = useCallback(async (canal: string) => {
    if (!selecao || !user) return;
    const nome = user.user_metadata?.nome || user.email?.split("@")[0] || "Alguem";
    const texto = `${selecao.bandeira} ${nome} fez o Quiz na Copa e e ${selecao.nome} na Copa 2026!\n\nDescubra qual das 48 selecoes voce seria:\n👉 bolaonacopa.com.br/quiz-selecao`;

    trackEvent("quiz_share", { quiz_id: "quiz_selecao", resultado: selecao.id, canal });

    // Tentar gerar imagem do card
    let imageFile: File | null = null;
    const cardEl = resultRef.current;
    if (cardEl) {
      try {
        setSharing(true);
        const canvas = await html2canvas(cardEl, {
          backgroundColor: "#071410",
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          imageFile = new File([blob], `quiz-${selecao.id}.png`, { type: "image/png" });
        }
      } catch {
        // Fallback: compartilha sem imagem
      } finally {
        setSharing(false);
      }
    }

    if (canal === "whatsapp") {
      // No nativo com imagem, usar Share plugin
      if (Capacitor.isNativePlatform() && imageFile) {
        try {
          const { Filesystem } = await import("@capacitor/filesystem");
          const { Share } = await import("@capacitor/share");
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(imageFile!);
          });
          const saved = await Filesystem.writeFile({
            path: `quiz-${selecao.id}.png`,
            data: base64,
            directory: 1, // Cache
          });
          await Share.share({ title: selecao.titulo, text: texto, url: saved.uri, dialogTitle: "Compartilhar resultado" });
          return;
        } catch {
          // Fallback para texto
        }
      }
      // Web: compartilhar com imagem via Web Share API se disponivel
      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({ title: selecao.titulo, text: texto, files: [imageFile] });
          return;
        } catch {
          // Fallback para texto
        }
      }
      shareViaWhatsApp(texto);
    } else if (canal === "copiar") {
      navigator.clipboard.writeText(texto).then(() => {
        setCopied(true);
        toast.success("Texto copiado!");
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        toast.success("Texto copiado!");
      });
    } else if (canal === "share") {
      if (navigator.share) {
        const shareData: ShareData = { title: `Quiz na Copa: ${selecao.titulo}`, text: texto };
        if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
          shareData.files = [imageFile];
        }
        navigator.share(shareData).catch(() => {});
      } else {
        navigator.clipboard.writeText(texto);
        toast.success("Link copiado para compartilhar!");
      }
    }
  }, [selecao, user]);

  const handleRefazer = () => {
    setStep("hub");
    setPerguntaIdx(0);
    setRespostas([]);
    setSelecao(null);
    setPerfil(null);
    setAnimBars(false);
  };

  // ═══ TELA: HUB (Escolha de Quizzes) ═══
  if (step === "hub") {
    const diasCopa = getDaysUntilCopa();
    return (
      <div className="space-y-6 animate-fade-in">
        <SEOHead
          title="Quiz na Copa — Qual selecao da Copa 2026 voce seria?"
          description="Responda 10 perguntas e descubra qual das 48 selecoes da Copa do Mundo 2026 combina com voce. Quiz na Copa — gratis!"
          path="/quiz"
          keywords="quiz copa do mundo, quiz selecao, quiz futebol, bolao na copa quiz"
        />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">Quiz na Copa</h2>
        </div>

        {/* Quiz principal: Selecao */}
        <div
          onClick={() => setStep("intro")}
          className="relative overflow-hidden rounded-2xl cursor-pointer group bg-gradient-to-br from-copa-green-700 via-copa-green-800 to-copa-green-900 p-6 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-copa-gold-400/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              ⚽ 48 selecoes · Copa 2026
            </div>
            <h3 className="text-2xl font-black leading-tight">
              Qual selecao<br />
              <span className="text-copa-gold-400">voce seria?</span>
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              10 perguntas revelam qual das <strong className="text-white">48 selecoes</strong> combina com seu jeito de jogar.
            </p>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="flex -space-x-1">
                {SELECOES.slice(0, 5).map((s) => (
                  <span key={s.id} className="text-sm">{s.bandeira}</span>
                ))}
              </div>
              <span>+43 selecoes possiveis</span>
            </div>
            <Button className="mt-2 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black rounded-xl shadow-lg group-hover:scale-[1.02] transition-transform">
              Comecar o Quiz <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Countdown Copa */}
        {diasCopa > 0 && (
          <div className="flex items-center justify-center gap-2 bg-copa-gold-50 border border-copa-gold-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-copa-gold-700">
            🏆 <strong>Copa comeca em {diasCopa} dias.</strong> Faca o quiz e entre no bolao antes de comecar!
          </div>
        )}

        {/* Outros quizzes (Em Breve) */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">
            Outros quizzes disponiveis no app
          </p>
          <div className="space-y-2">
            {FUTURE_QUIZZES.map((q, i) => (
              <div key={i} className="flex items-center gap-3 bg-muted/40 border border-border rounded-xl px-4 py-3 opacity-70">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {q.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{q.desc}</p>
                </div>
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA Baixar app */}
        {!Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent) && (
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener"
            className="flex items-center justify-center gap-2 w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black rounded-xl shadow-lg text-sm transition-colors">
            <ChevronRight className="w-4 h-4" />
            <ChevronRight className="w-4 h-4 -ml-3" />
            Quero todos os quizzes — Baixar gratis
          </a>
        )}

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
          <div className="flex -space-x-1.5">
            {["M", "J", "A", "R"].map((l, i) => (
              <div key={i} className="w-6 h-6 bg-copa-green-100 rounded-full flex items-center justify-center text-[10px] font-bold text-copa-green-600 border-2 border-background">{l}</div>
            ))}
          </div>
          <span><strong className="text-copa-gold-500">+5.400 quizzes</strong> respondidos hoje</span>
        </div>
      </div>
    );
  }

  // ═══ TELA: INTRO (antes de comecar o quiz seleção) ═══
  if (step === "intro") {
    return (
      <div className="space-y-6 animate-fade-in">
        <SEOHead title="Quiz na Copa — Qual selecao voce seria?" noindex />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("hub")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">Quiz na Copa</h2>
        </div>

        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center gap-2 bg-copa-gold-50 border border-copa-gold-200 rounded-full px-4 py-1.5 text-xs font-bold text-copa-gold-600">
            ⚽ 48 selecoes · Copa 2026
          </div>

          <h1 className="text-3xl font-black leading-tight">
            Qual selecao<br />
            <span className="text-copa-gold-500">voce seria?</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            10 perguntas revelam qual das <strong>48 selecoes</strong> da Copa 2026 combina com o seu jeito de jogar.
          </p>
        </div>

        {/* Preview das perguntas */}
        <div className="space-y-2">
          {PERGUNTAS.slice(0, 4).map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              <div className="w-7 h-7 bg-copa-gold-100 border border-copa-gold-300 rounded-full flex items-center justify-center text-xs font-bold text-copa-gold-600">
                {i + 1}
              </div>
              <span className="text-sm text-muted-foreground flex-1">{p.texto}</span>
              <span className="text-sm opacity-40">{i === 0 ? "🔓" : "🔒"}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 opacity-50">
            <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">+6</div>
            <span className="text-sm text-muted-foreground">mais perguntas exclusivas no app</span>
            <span className="text-sm opacity-30">🔒</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          {user ? (
            <Button onClick={handleStart} className="w-full max-w-xs mx-auto h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black text-base rounded-xl shadow-lg">
              Comecar o Quiz ⚽
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth?modo=cadastro")} className="w-full max-w-xs mx-auto h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black text-base rounded-xl shadow-lg">
              Criar conta para jogar ⚽
            </Button>
          )}
          {!isPremium && user && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Gratis com anuncio · <button onClick={() => navigate("/planos")} className="text-copa-gold-500 font-bold underline">Premium sem anuncios</button>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ═══ TELA: PERGUNTA ═══
  if (step === "pergunta") {
    const pergunta = PERGUNTAS[perguntaIdx];
    const progresso = ((perguntaIdx) / PERGUNTAS.length) * 100;

    return (
      <div className="space-y-5 animate-fade-in" key={perguntaIdx}>
        <SEOHead title={`Quiz — Pergunta ${perguntaIdx + 1}/10`} noindex />

        {/* Header com progresso */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Pergunta {perguntaIdx + 1} de {PERGUNTAS.length}</span>
            <span className="text-xs font-bold text-copa-gold-500">{Math.round(progresso)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-copa-green-500 to-copa-gold-400 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }} />
          </div>
        </div>

        {/* Pergunta */}
        <h2 className="text-lg font-bold leading-snug">{pergunta.texto}</h2>

        {/* Opções */}
        <div className="space-y-2.5">
          {pergunta.opcoes.map((opcao, i) => (
            <button
              key={i}
              onClick={() => handleResposta(i)}
              className="w-full flex items-center gap-3 bg-white border-2 border-gray-100 hover:border-copa-green-300 hover:bg-copa-green-50/50 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-xl flex-shrink-0">{opcao.icone}</span>
              <span className="text-sm font-medium leading-snug">{opcao.texto}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ═══ TELA: CALCULANDO ═══
  if (step === "calculando") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <SEOHead title="Calculando sua seleção..." noindex />
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-copa-gold-100 flex items-center justify-center animate-pulse">
            <span className="text-4xl">⚽</span>
          </div>
          <Loader2 className="w-24 h-24 text-copa-green-500 animate-spin absolute -top-2 -left-2" />
        </div>
        <h2 className="text-xl font-bold mb-2">Calculando sua seleção...</h2>
        <p className="text-sm text-muted-foreground">Analisando suas respostas entre 48 seleções</p>

        {/* Animação de seleções passando */}
        <div className="mt-6 flex gap-2 animate-pulse">
          {SELECOES.slice(0, 5).map((s, i) => (
            <span key={i} className="text-2xl" style={{ animationDelay: `${i * 200}ms` }}>{s.bandeira}</span>
          ))}
        </div>
      </div>
    );
  }

  // ═══ TELA: AD GATE ═══
  if (step === "ad-gate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
        <SEOHead title="Sua seleção está pronta!" noindex />
        <AdRewardModal open={showAdModal} onComplete={resolveWebAd} message="Assista para ver seu resultado" />
        {adLoading && <AdLoadingOverlay />}

        <div className="w-16 h-16 rounded-full bg-copa-gold-100 border-2 border-copa-gold-300 flex items-center justify-center">
          <span className="text-3xl">🔐</span>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1">Sua seleção está pronta!</h2>
          <p className="text-sm text-muted-foreground">Assista um vídeo curto para revelar o resultado</p>
        </div>

        <Button onClick={handleAdGate} className="w-full max-w-xs h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black rounded-xl shadow-lg">
          Revelar minha seleção ⚽
        </Button>

        <button onClick={() => navigate("/planos")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-copa-gold-500 transition-colors">
          <Crown className="w-3.5 h-3.5" />
          Premium: sem anúncios em todos os quizzes
        </button>
      </div>
    );
  }

  // ═══ TELA: RESULTADO (Dark visual) ═══
  if (step === "resultado" && selecao && perfil) {
    const barras = perfilParaPorcentagens(perfil);
    const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Voce";
    const diasCopa = getDaysUntilCopa();

    return (
      <div className="animate-fade-in pb-6">
        <SEOHead title={`Quiz na Copa — ${selecao.titulo}`} noindex />

        {/* ── Card capturavel (dark bg) ── */}
        <div ref={resultRef} className="rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(180deg, #071410 0%, #0d2818 40%, #071410 100%)",
          position: "relative",
        }}>
          {/* Campo de futebol sutil no fundo */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,0.3) 58px,rgba(255,255,255,0.3) 59px), repeating-linear-gradient(0deg,transparent,transparent 58px,rgba(255,255,255,0.3) 58px,rgba(255,255,255,0.3) 59px)",
          }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/10 rounded-full" />

          <div className="relative z-10 px-5 py-8 space-y-5">
            {/* Chip topo */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-semibold text-white/60">
                <div className="w-2 h-2 rounded-full bg-copa-gold-400 animate-pulse" />
                {userName.toUpperCase()} DESCOBRIU SUA SELECAO
              </div>
            </div>

            {/* Bandeira + Nome */}
            <div className="text-center space-y-1">
              <span className="text-[80px] leading-none block" style={{ filter: "drop-shadow(0 0 40px rgba(22,163,74,0.4))" }}>
                {selecao.bandeira}
              </span>
              <p className="text-xs font-black text-copa-gold-400 uppercase tracking-[0.3em]">voce e</p>
              <h1 className="text-5xl font-black text-white leading-none tracking-tight" style={{ textShadow: "0 0 40px rgba(250,204,21,0.3)" }}>
                {selecao.nome.toUpperCase()}
              </h1>
            </div>

            {/* Compatibilidade */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs text-white/40">compatibilidade</span>
              <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-copa-green-500 to-copa-gold-400 rounded-full transition-all duration-1000"
                  style={{ width: animBars ? `${compatPct}%` : "0%" }} />
              </div>
              <span className="text-sm font-black text-copa-gold-400">{compatPct}%</span>
            </div>

            {/* Descricao */}
            <p className="text-center text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
              {selecao.desc}
            </p>

            {/* Barras de perfil */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Seu perfil de jogo</p>
              {barras.map((b) => (
                <div key={b.dim} className="grid grid-cols-[80px_1fr_36px] items-center gap-2.5">
                  <span className="text-xs font-medium text-white/60">{b.icone} {b.label}</span>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ backgroundColor: b.cor, width: animBars ? `${b.pct}%` : "0%" }} />
                  </div>
                  <span className="text-[10px] text-white/40 font-mono text-right">{b.pct}%</span>
                </div>
              ))}
              <p className="text-[9px] text-white/20 text-right">total: 100%</p>
            </div>

            {/* Footer do card */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-white/30 pt-2">
              <span>⚽ bolaonacopa.com.br/quiz</span>
            </div>
          </div>
        </div>

        {/* ── Social stats (fora do card) ── */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground py-3 flex-wrap">
          <span>⚽ <strong>+5.400</strong> quizzes hoje</span>
          {diasCopa > 0 && <span>🏆 Copa em <strong>{diasCopa}</strong> dias</span>}
        </div>

        {/* ── Compartilhar ── */}
        <div className="space-y-4 mt-2">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black leading-tight">
              E seus amigos,<br />qual seria <span className="text-copa-gold-500">a selecao deles?</span>
            </h3>
            <p className="text-xs text-muted-foreground">Manda pro grupo e ve quem vai ser a Argentina 👀</p>
          </div>

          {/* WhatsApp */}
          <Button onClick={() => generateAndShare("whatsapp")} disabled={sharing}
            className="w-full h-12 bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-base">
            {sharing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            )}
            Enviar para amigos no WhatsApp
          </Button>

          {/* Copiar + Compartilhar */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => generateAndShare("copiar")}
              className="h-11 rounded-xl text-xs font-bold">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
            <Button variant="outline" onClick={() => generateAndShare("share")} disabled={sharing}
              className="h-11 rounded-xl text-xs font-bold">
              {sharing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Share2 className="w-4 h-4 mr-1" />}
              Compartilhar
            </Button>
          </div>

          {/* Entrar no bolao / Refazer */}
          <div className="space-y-2 pt-2">
            <Button onClick={() => navigate("/home")}
              className="w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black rounded-xl shadow-lg">
              Fazer meu quiz — Entrar no Bolao <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <button onClick={handleRefazer} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
              Refazer o quiz
            </button>
          </div>

          {/* Outras selecoes */}
          <div className="text-center pt-2">
            <h3 className="text-lg font-black leading-tight mb-1">
              Qual selecao<br /><span className="text-copa-gold-500">os seus amigos seriam?</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-3">47 resultados possiveis. Pode ser qualquer selecao das 48 da Copa 2026.</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              <span className="text-xs bg-copa-green-100 border border-copa-green-300 rounded-full px-2.5 py-1 font-bold text-copa-green-700">
                {selecao.bandeira} {selecao.nome} — voce
              </span>
              {SELECOES.filter(s => s.id !== selecao.id).slice(0, 6).map((s) => (
                <span key={s.id} className="text-xs bg-muted/50 border border-border rounded-full px-2.5 py-1 font-medium text-muted-foreground">
                  {s.bandeira} {s.nome}
                </span>
              ))}
              <span className="text-xs bg-muted/30 border border-border rounded-full px-2.5 py-1 text-muted-foreground">+41</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Quiz;
