import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Loader2, ChevronRight, Copy, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
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

type QuizStep = "intro" | "pergunta" | "calculando" | "ad-gate" | "resultado";

const Quiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plano } = useUserPlan();
  const { showAd, adLoading, resolveWebAd, needsAd } = useRewardedAd();

  const [step, setStep] = useState<QuizStep>("intro");
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

  const handleShare = useCallback((canal: string) => {
    if (!selecao || !user) return;
    const nome = user.user_metadata?.nome || user.email?.split("@")[0] || "Alguém";
    const texto = `${selecao.bandeira} ${nome} fez o quiz e é ${selecao.nome} na Copa 2026!\n\nDescubra qual das 48 seleções você seria:\n👉 bolaonacopa.com.br/quiz-selecao`;

    trackEvent("quiz_share", { quiz_id: "quiz_selecao", resultado: selecao.id, canal });

    if (canal === "whatsapp") {
      const encoded = encodeURIComponent(texto);
      if (Capacitor.isNativePlatform()) {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_system");
      } else if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        window.location.href = `whatsapp://send?text=${encoded}`;
      } else {
        window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
      }
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
        navigator.share({ title: `Quiz: ${selecao.titulo}`, text: texto }).catch(() => {});
      } else {
        navigator.clipboard.writeText(texto);
        toast.success("Link copiado para compartilhar!");
      }
    }
  }, [selecao, user]);

  const handleRefazer = () => {
    setStep("intro");
    setPerguntaIdx(0);
    setRespostas([]);
    setSelecao(null);
    setPerfil(null);
    setAnimBars(false);
  };

  // ═══ TELA: INTRO ═══
  if (step === "intro") {
    return (
      <div className="space-y-6 animate-fade-in">
        <SEOHead title="Quiz: Qual seleção da Copa 2026 você seria?" noindex />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">Quiz</h2>
        </div>

        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center gap-2 bg-copa-gold-50 border border-copa-gold-200 rounded-full px-4 py-1.5 text-xs font-bold text-copa-gold-600">
            ⚽ 48 seleções · Copa 2026
          </div>

          <h1 className="text-3xl font-black leading-tight">
            Qual seleção<br />
            <span className="text-copa-gold-500">você seria?</span>
          </h1>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            10 perguntas revelam qual das <strong>48 seleções</strong> da Copa 2026 combina com o seu jeito de jogar.
          </p>
        </div>

        {/* Preview das perguntas */}
        <div className="space-y-2">
          {PERGUNTAS.slice(0, 3).map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              <div className="w-7 h-7 bg-copa-gold-100 border border-copa-gold-300 rounded-full flex items-center justify-center text-xs font-bold text-copa-gold-600">
                {i + 1}
              </div>
              <span className="text-sm text-muted-foreground flex-1">{p.texto}</span>
              <span className="text-sm opacity-40">{i === 0 ? "🔓" : "🔒"}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 opacity-50">
            <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">+7</div>
            <span className="text-sm text-muted-foreground">mais perguntas...</span>
            <span className="text-sm opacity-30">🔒</span>
          </div>
        </div>

        {/* Seleções possíveis */}
        <div className="text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Seu resultado pode ser qualquer uma →
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SELECOES.slice(0, 8).map((s) => (
              <span key={s.id} className="text-xs bg-muted/50 border border-border rounded-full px-2.5 py-1 font-medium">
                {s.bandeira} {s.nome}
              </span>
            ))}
            <span className="text-xs bg-muted/30 border border-border rounded-full px-2.5 py-1 font-medium text-muted-foreground">
              +40 possíveis
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2">
          {user ? (
            <Button onClick={handleStart} className="w-full max-w-xs mx-auto h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black text-base rounded-xl shadow-lg">
              Começar o Quiz ⚽
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth?modo=cadastro")} className="w-full max-w-xs mx-auto h-13 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black text-base rounded-xl shadow-lg">
              Criar conta para jogar ⚽
            </Button>
          )}
          {!isPremium && user && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Grátis com anúncio · <button onClick={() => navigate("/planos")} className="text-copa-gold-500 font-bold underline">Premium sem anúncios</button>
            </p>
          )}
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
          <div className="flex -space-x-1.5">
            {["M", "J", "A", "R"].map((l, i) => (
              <div key={i} className="w-6 h-6 bg-copa-green-100 rounded-full flex items-center justify-center text-[10px] font-bold text-copa-green-600 border-2 border-background">{l}</div>
            ))}
          </div>
          <span><strong className="text-copa-gold-500">+3.800 pessoas</strong> já fizeram o quiz</span>
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

  // ═══ TELA: RESULTADO ═══
  if (step === "resultado" && selecao && perfil) {
    const barras = perfilParaPorcentagens(perfil);
    const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Você";

    return (
      <div className="space-y-6 animate-fade-in pb-6" ref={resultRef}>
        <SEOHead title={selecao.titulo} noindex />

        {/* Chip topo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-muted/50 border border-border rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-copa-gold-400 animate-pulse" />
            {userName} descobriu sua seleção
          </div>
        </div>

        {/* Bandeira + Nome */}
        <div className="text-center space-y-2">
          <span className="text-[100px] leading-none block" style={{ filter: "drop-shadow(0 0 40px rgba(22,163,74,0.4))" }}>
            {selecao.bandeira}
          </span>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Você é</p>
          <h1 className="text-5xl font-black text-copa-gold-500 leading-none">
            {selecao.nome.toUpperCase()}
          </h1>
        </div>

        {/* Compatibilidade */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs text-muted-foreground">compatibilidade</span>
          <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-copa-green-500 to-copa-gold-400 rounded-full transition-all duration-1000"
              style={{ width: animBars ? `${compatPct}%` : "0%" }} />
          </div>
          <span className="text-sm font-black text-copa-gold-500">{compatPct}%</span>
        </div>

        {/* Descrição */}
        <p className="text-center text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {selecao.desc}
        </p>

        {/* Barras de perfil */}
        <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Seu perfil de jogo</p>
          {barras.map((b) => (
            <div key={b.dim} className="grid grid-cols-[80px_1fr_36px] items-center gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">{b.icone} {b.label}</span>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ backgroundColor: b.cor, width: animBars ? `${b.pct}%` : "0%" }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono text-right">{b.pct}%</span>
            </div>
          ))}
        </div>

        {/* Compartilhar */}
        <div className="text-center space-y-3">
          <h3 className="text-lg font-bold">
            E seus amigos,<br />qual seria <span className="text-copa-gold-500">a seleção deles?</span>
          </h3>
          <p className="text-xs text-muted-foreground">Manda pro grupo e vê quem discorda do resultado</p>
        </div>

        {/* WhatsApp */}
        <Button onClick={() => handleShare("whatsapp")}
          className="w-full h-12 bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-base">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Enviar para amigos no WhatsApp
        </Button>

        {/* Copiar + Compartilhar */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => handleShare("copiar")}
            className="h-11 rounded-xl text-xs font-bold">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
          <Button variant="outline" onClick={() => handleShare("share")}
            className="h-11 rounded-xl text-xs font-bold">
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>

        {/* Entrar no bolão / Refazer */}
        <div className="space-y-2 pt-2">
          <Button onClick={() => navigate("/home")}
            className="w-full h-12 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold rounded-xl">
            Entrar no Bolão da Copa 2026 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <button onClick={handleRefazer} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            Refazer o quiz
          </button>
        </div>

        {/* Outras seleções */}
        <div className="text-center pt-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Outros resultados possíveis</p>
          <div className="flex flex-wrap justify-center gap-1">
            {SELECOES.filter(s => s.id !== selecao.id).slice(0, 10).map((s) => (
              <span key={s.id} className="text-lg">{s.bandeira}</span>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-1">+37</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Quiz;
