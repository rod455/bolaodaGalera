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

  const handleVoltar = () => {
    if (perguntaIdx > 0) {
      const novasRespostas = respostas.slice(0, -1);
      setRespostas(novasRespostas);
      setPerguntaIdx(perguntaIdx - 1);
    } else {
      setStep("intro");
    }
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
    if (!selecao) return;
    const nome = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Alguem";
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
      const url = "https://www.bolaonacopa.com.br/quiz-selecao";
      try {
        if (navigator.share) {
          const shareData: ShareData = { title: `Quiz na Copa: ${selecao.titulo}`, text: texto, url };
          if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            shareData.files = [imageFile];
          }
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(`${texto}\n${url}`);
          toast.success("Link copiado para compartilhar!");
        }
      } catch (err: any) {
        // AbortError = usuario cancelou, nao e erro real
        if (err?.name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(`${texto}\n${url}`);
            toast.success("Link copiado para compartilhar!");
          } catch {
            toast.error("Nao foi possivel compartilhar");
          }
        }
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

        {/* Quiz principal: Selecao — hero completo dentro do card */}
        <div className="relative overflow-hidden rounded-2xl text-white shadow-xl"
          style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 30%, #15803d 70%, #14532d 100%)" }}>
          {/* Grid sutil */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.5) 60px,rgba(255,255,255,.5) 61px), repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,.5) 60px,rgba(255,255,255,.5) 61px)",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(22,163,74,.35) 0%,transparent 65%)" }} />

          <div className="relative z-10 flex flex-col items-center text-center px-5 py-10 space-y-5">
            {/* Logo */}
            <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
              alt="Bolao na Copa" className="w-16 h-16 rounded-2xl"
              style={{ boxShadow: "0 0 30px rgba(250,204,21,.3)" }} />

            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              ⚽ 48 selecoes · Copa 2026
            </div>

            <h3 className="leading-[0.88]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem,10vw,5rem)", textShadow: "0 4px 24px rgba(0,0,0,.4)" }}>
              Qual selecao<br />
              <span style={{ color: "#facc15" }}>voce seria?</span>
            </h3>

            <p className="max-w-[420px] leading-relaxed" style={{ fontSize: "clamp(.88rem,2.5vw,1rem)", color: "rgba(255,255,255,.72)" }}>
              10 perguntas revelam qual das <strong className="text-white">48 selecoes</strong> da Copa 2026 combina com o seu jeito de jogar. Pode ser uma surpresa — ou exatamente o que voce esperava.
            </p>

            {/* Preview perguntas */}
            <div className="w-full max-w-[440px] space-y-2">
              {PERGUNTAS.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-left rounded-xl px-3.5 py-2.5"
                  style={{ background: "rgba(255,255,255,.048)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(250,204,21,.14)", border: "1.5px solid rgba(250,204,21,.38)", color: "#facc15" }}>
                    {i + 1}
                  </div>
                  <span className="text-[13px] font-medium flex-1" style={{ color: "rgba(255,255,255,.82)" }}>{p.texto}</span>
                  <span className="text-sm opacity-40 flex-shrink-0">{i === 0 ? "🔓" : "🔒"}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 opacity-40"
                style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)" }}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ color: "rgba(255,255,255,.3)" }}>+6</div>
                <span className="text-[13px]" style={{ color: "rgba(255,255,255,.25)" }}>mais perguntas exclusivas</span>
                <span className="text-sm opacity-25 flex-shrink-0 ml-auto">🔒</span>
              </div>
            </div>

            {/* CTA */}
            <button onClick={handleStart}
              className="w-full max-w-[330px] flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98] mt-2"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              Comecar o Quiz <ChevronRight className="w-5 h-5" />
            </button>
            {!isPremium && (
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,.38)" }}>
                Gratis com anuncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anuncios</button>
              </p>
            )}

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="flex">
                {["M", "J", "A", "R", "+"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold -ml-1 first:ml-0"
                    style={{ background: "#15803d", border: "2px solid #14532d" }}>{l}</div>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
                <strong style={{ color: "#facc15" }}>+5.400</strong> quizzes hoje
              </span>
            </div>
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

  // ═══ TELA: INTRO (landing page dark — visual da quiz-selecao.html) ═══
  if (step === "intro") {
    const diasCopa = getDaysUntilCopa();
    const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png";
    const PREVIEW_SELECOES = [
      { bandeira: "🇧🇷", nome: "Brasil" }, { bandeira: "🇩🇪", nome: "Alemanha" },
      { bandeira: "🇦🇷", nome: "Argentina", blur: true }, { bandeira: "🇫🇷", nome: "Franca", blur: true },
      { bandeira: "🇪🇸", nome: "Espanha", blur: true }, { bandeira: "🇵🇹", nome: "Portugal", blur: true },
      { bandeira: "🇲🇦", nome: "Marrocos", blur: true }, { bandeira: "🇯🇵", nome: "Japao", blur: true },
      { bandeira: "🇺🇾", nome: "Uruguai", blur: true }, { bandeira: "🇳🇱", nome: "Holanda", blur: true },
      { bandeira: "🇲🇽", nome: "Mexico", blur: true }, { bandeira: "🇨🇴", nome: "Colombia", blur: true },
      { bandeira: "🇧🇪", nome: "Belgica", blur: true }, { bandeira: "🇰🇷", nome: "Coreia do Sul", blur: true },
    ];

    return (
      <div className="animate-fade-in -mx-4 -mt-6" style={{ background: "#14532d", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
        <SEOHead
          title="Quiz na Copa — Qual selecao da Copa 2026 voce seria?"
          description="Responda 10 perguntas e descubra qual das 48 selecoes da Copa do Mundo 2026 combina com seu estilo de jogo."
          path="/quiz"
          keywords="quiz copa do mundo, quiz selecao, quiz futebol, bolao na copa quiz"
        />
        {/* Grid sutil no fundo */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.018) 60px,rgba(255,255,255,.018) 61px), repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,.018) 60px,rgba(255,255,255,.018) 61px)",
        }} />

        <div className="relative z-10">
          {/* ── HERO ── */}
          <section className="min-h-screen flex flex-col items-center justify-center px-5 py-9 text-center"
            style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(22,163,74,.38) 0%,transparent 68%)" }}>

            {/* Botao voltar */}
            <button onClick={() => setStep("hub")}
              className="absolute top-4 left-4 p-2 rounded-full text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors z-20"
              style={{ top: "max(1rem, env(safe-area-inset-top, 1rem))" }}>
              <ArrowLeft className="w-5 h-5" />
            </button>

            <img src={LOGO_URL} alt="Bolao na Copa" className="w-[72px] h-[72px] rounded-2xl mb-5"
              style={{ boxShadow: "0 0 40px rgba(250,204,21,.3)", animation: "pulse 3s ease-in-out infinite" }} />

            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              ⚽ 48 selecoes · Copa 2026
            </div>

            <h1 className="leading-[0.88] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.8rem,11vw,6.5rem)", textShadow: "0 4px 28px rgba(0,0,0,.45)" }}>
              Qual selecao<br />
              <span style={{ color: "#facc15" }}>voce seria?</span>
            </h1>

            <p className="max-w-[480px] mx-auto mt-3 leading-relaxed" style={{ fontSize: "clamp(.95rem,2.8vw,1.15rem)", color: "rgba(255,255,255,.72)" }}>
              10 perguntas revelam qual das <strong className="text-white">48 selecoes</strong> da Copa 2026 combina com o seu jeito de jogar. Pode ser uma surpresa — ou exatamente o que voce esperava.
            </p>

            {/* Preview perguntas */}
            <div className="w-full max-w-[460px] mt-10 space-y-2.5">
              {PERGUNTAS.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-left rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,.048)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(250,204,21,.14)", border: "1.5px solid rgba(250,204,21,.38)", color: "#facc15" }}>
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium flex-1" style={{ color: "rgba(255,255,255,.82)" }}>{p.texto}</span>
                  <span className="text-sm opacity-40 flex-shrink-0">{i === 0 ? "🔓" : "🔒"}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 opacity-45"
                style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.04)" }}>
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold opacity-40"
                  style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.4)" }}>+6</div>
                <span className="text-sm" style={{ color: "rgba(255,255,255,.3)" }}>mais perguntas exclusivas</span>
                <span className="text-sm opacity-30 flex-shrink-0 ml-auto">🔒</span>
              </div>
            </div>

            {/* Resultados desfocados */}
            <div className="w-full max-w-[460px] mt-9">
              <p className="text-[11px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: "rgba(255,255,255,.38)", letterSpacing: "2px" }}>
                Seu resultado pode ser qualquer uma dessas →
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PREVIEW_SELECOES.map((s, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,.065)", border: "1px solid rgba(255,255,255,.09)",
                      color: "rgba(255,255,255,.78)", filter: (s as any).blur ? "blur(5px)" : "none",
                      userSelect: (s as any).blur ? "none" : "auto",
                    }}>
                    {s.bandeira} {s.nome}
                  </span>
                ))}
                <span className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", filter: "blur(5px)" }}>
                  +33 possiveis
                </span>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="w-full max-w-[460px] mt-10 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(250,204,21,.1)", border: "2px solid rgba(250,204,21,.28)" }}>
                🔐
              </div>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,.65)" }}>O resultado esta esperando por voce</p>
              <h2 className="text-2xl mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Descubra agora<br /><span style={{ color: "#facc15" }}>100% gratis</span>
              </h2>
              <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,.45)" }}>
                Quiz completo · 48 selecoes possiveis · bolao da Copa 2026
              </p>
              <button onClick={handleStart}
                className="w-full max-w-[330px] mx-auto flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
                ⚽ Comecar o Quiz — Gratis
              </button>
              {!isPremium && (
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,.38)" }}>
                  Gratis com anuncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anuncios</button>
                </p>
              )}
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 mt-7">
              <div className="flex">
                {["M", "J", "A", "R", "+"].map((l, i) => (
                  <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold -ml-1.5 first:ml-0"
                    style={{ background: "#15803d", border: "2px solid #14532d", color: "#fff" }}>{l}</div>
                ))}
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.58)" }}>
                <strong style={{ color: "#facc15" }}>+5.400 pessoas</strong> ja fizeram o quiz hoje
              </p>
            </div>
          </section>

          {/* ── STATS STRIP ── */}
          <div className="flex items-center justify-center gap-4 flex-wrap py-3.5 px-5 text-xs"
            style={{ background: "rgba(250,204,21,.07)", borderTop: "1px solid rgba(250,204,21,.15)", borderBottom: "1px solid rgba(250,204,21,.15)", color: "rgba(255,255,255,.6)" }}>
            <span>⚽ <strong style={{ color: "#facc15" }}>48 selecoes</strong> possiveis</span>
            <span>🎯 <strong style={{ color: "#facc15" }}>10 perguntas</strong> precisas</span>
            <span>🔥 <strong style={{ color: "#facc15" }}>100% gratis</strong></span>
            <span>📊 <strong style={{ color: "#facc15" }}>Ranking</strong> ao vivo no bolao</span>
          </div>

          {/* ── POR QUE FAZER ── */}
          <section className="max-w-[500px] mx-auto px-5 py-12 text-center">
            <h2 className="mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.8rem,6vw,3rem)" }}>
              Por que fazer<br /><span style={{ color: "#facc15" }}>o quiz?</span>
            </h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: "rgba(255,255,255,.6)" }}>
              Nao e so curiosidade. E uma forma de descobrir seu estilo de jogo — e de desafiar seus amigos do bolao.
            </p>
            <div className="grid grid-cols-2 gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {[
                { ico: "🌍", t: "48 selecoes reais", s: "Todas as selecoes classificadas para a Copa 2026." },
                { ico: "🎯", t: "Algoritmo de perfil", s: "Suas respostas criam um perfil unico. Nao tem como 'acertar'." },
                { ico: "💬", t: "Compartilhe o resultado", s: "Envie para o grupo do bolao e veja quem discorda." },
                { ico: "🏆", t: "Entre no bolao", s: "Apos o quiz, entre no bolao da Copa e palpite em todos os 104 jogos." },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-4 text-left"
                  style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.075)" }}>
                  <div className="text-2xl mb-2">{c.ico}</div>
                  <p className="text-sm font-bold mb-1">{c.t}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,.5)" }}>{c.s}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── URGENCIA ── */}
          {diasCopa > 0 && (
            <div className="max-w-[460px] mx-auto mb-5 px-5">
              <div className="rounded-xl px-4 py-3.5 text-center text-sm"
                style={{ background: "rgba(220,38,38,.12)", border: "1px solid rgba(220,38,38,.25)", color: "rgba(255,200,200,.85)" }}>
                <strong style={{ color: "#fca5a5" }}>⏰ Copa comeca em {diasCopa} dias.</strong> Faca o quiz agora e entre no bolao antes de comecar!
              </div>
            </div>
          )}

          {/* ── OUTROS QUIZZES ── */}
          <section className="max-w-[500px] mx-auto px-5 pb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-center mb-4" style={{ color: "rgba(255,255,255,.28)", letterSpacing: "2px" }}>
              Outros quizzes disponiveis no app
            </p>
            <div className="space-y-2.5">
              {FUTURE_QUIZZES.map((q, i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 cursor-pointer transition-colors hover:border-[rgba(250,204,21,.28)]"
                  style={{ background: "rgba(255,255,255,.038)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <span className="text-3xl flex-shrink-0">{q.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{q.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,.45)" }}>{q.desc}</p>
                  </div>
                  <span className="text-lg opacity-30 flex-shrink-0">🔒</span>
                </div>
              ))}
            </div>

            {/* CTA bottom */}
            <button onClick={handleStart}
              className="w-full flex items-center justify-center gap-3 mt-6 py-4 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              ⚽ Comecar o Quiz — Gratis
            </button>
          </section>

          {/* ── FOOTER ── */}
          <footer className="text-center py-6 text-xs" style={{ color: "rgba(255,255,255,.22)", borderTop: "1px solid rgba(255,255,255,.045)" }}>
            © 2026 Bolao na Copa · <a href="/privacidade.html" style={{ color: "rgba(255,255,255,.3)" }}>Privacidade</a> · <a href="/home" style={{ color: "rgba(255,255,255,.3)" }}>Abrir no navegador</a>
          </footer>
        </div>

        {/* CSS para animacao de pulse do logo */}
        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(250,204,21,.2); }
            50% { box-shadow: 0 0 55px rgba(250,204,21,.55); }
          }
        `}</style>
      </div>
    );
  }

  // ═══ TELA: PERGUNTA (paleta dark) ═══
  if (step === "pergunta") {
    const pergunta = PERGUNTAS[perguntaIdx];
    const progresso = ((perguntaIdx) / PERGUNTAS.length) * 100;

    return (
      <div className="animate-fade-in -mx-4 -mt-6" key={perguntaIdx} style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        {/* Grid sutil */}
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: "repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px), repeating-linear-gradient(0deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px)",
        }} />

        <div className="relative z-10 max-w-lg mx-auto px-5 py-8 space-y-6">
          <SEOHead title={`Quiz na Copa — Pergunta ${perguntaIdx + 1}/10`} noindex />

          {/* Voltar + Progresso */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={handleVoltar}
                className="p-1.5 rounded-full transition-colors hover:bg-white/10"
                style={{ color: "rgba(255,255,255,.5)" }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,.5)" }}>
                    Pergunta {perguntaIdx + 1} de {PERGUNTAS.length}
                  </span>
                  <span className="text-xs font-bold" style={{ color: "#facc15" }}>{Math.round(progresso)}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progresso}%`, background: "linear-gradient(90deg, #15803d, #facc15)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Pergunta */}
          <h2 className="text-xl font-bold leading-snug">{pergunta.texto}</h2>

          {/* Opcoes — sem emojis, key unica por pergunta+opcao para evitar ghost selection */}
          <div className="space-y-2.5">
            {pergunta.opcoes.map((opcao, i) => (
              <button
                key={`${perguntaIdx}-${i}`}
                onClick={() => handleResposta(i)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(250,204,21,.08)"; e.currentTarget.style.borderColor = "rgba(250,204,21,.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}
              >
                <span className="text-sm font-medium leading-snug" style={{ color: "rgba(255,255,255,.85)" }}>{opcao.texto}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══ TELA: CALCULANDO (dark) ═══
  if (step === "calculando") {
    return (
      <div className="animate-fade-in -mx-4 -mt-6 flex flex-col items-center justify-center text-center" style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        <SEOHead title="Calculando sua selecao..." noindex />
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse" style={{ background: "rgba(250,204,21,.1)" }}>
            <span className="text-4xl">⚽</span>
          </div>
          <Loader2 className="w-24 h-24 animate-spin absolute -top-2 -left-2" style={{ color: "#15803d" }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Calculando sua selecao...</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Analisando suas respostas entre 48 selecoes</p>
        <div className="mt-6 flex gap-2 animate-pulse">
          {SELECOES.slice(0, 5).map((s, i) => (
            <span key={i} className="text-2xl" style={{ animationDelay: `${i * 200}ms` }}>{s.bandeira}</span>
          ))}
        </div>
      </div>
    );
  }

  // ═══ TELA: AD GATE (dark) ═══
  if (step === "ad-gate") {
    return (
      <div className="animate-fade-in -mx-4 -mt-6 flex flex-col items-center justify-center text-center space-y-6" style={{ background: "#071410", color: "#fff", minHeight: "100vh", padding: "48px 20px" }}>
        <SEOHead title="Sua selecao esta pronta!" noindex />
        <AdRewardModal open={showAdModal} onComplete={resolveWebAd} message="Assista para ver seu resultado" />
        {adLoading && <AdLoadingOverlay />}

        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(250,204,21,.1)", border: "2px solid rgba(250,204,21,.28)" }}>
          <span className="text-3xl">🔐</span>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1">Sua selecao esta pronta!</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Assista um video curto para revelar o resultado</p>
        </div>

        <button onClick={handleAdGate}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: "#facc15", color: "#071410", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
          Revelar minha selecao ⚽
        </button>

        <button onClick={() => navigate("/planos")} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,.4)" }}>
          <Crown className="w-3.5 h-3.5" />
          Premium: sem anuncios em todos os quizzes
        </button>
      </div>
    );
  }

  // ═══ TELA: RESULTADO (estilo quiz-resultado.html) ═══
  if (step === "resultado" && selecao && perfil) {
    const barras = perfilParaPorcentagens(perfil);
    const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Voce";
    const diasCopa = getDaysUntilCopa();
    const WPP_SVG = <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

    return (
      <div className="animate-fade-in -mx-4 -mt-6" style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        <SEOHead title={`Quiz na Copa — ${selecao.titulo}`} noindex />

        {/* Campo de futebol no fundo */}
        <div className="fixed inset-0 z-0 overflow-hidden" style={{
          background: "radial-gradient(ellipse at 50% 100%, rgba(0,156,59,.28) 0%, transparent 55%), radial-gradient(ellipse at 50% 0%, rgba(0,39,118,.18) 0%, transparent 50%)",
        }}>
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px), repeating-linear-gradient(0deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px)",
          }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full" style={{ border: "1px solid rgba(255,255,255,.05)" }} />
        </div>

        <div className="relative z-10">
          {/* ══ HERO ══ */}
          <section className="flex flex-col items-center px-5 py-12 text-center">

            {/* Card capturavel */}
            <div ref={resultRef} className="w-full max-w-[400px] flex flex-col items-center">

              {/* Chip */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-8"
                style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#facc15", boxShadow: "0 0 8px rgba(250,204,21,.7)" }} />
                {userName} descobriu sua selecao
              </div>

              {/* Bandeira */}
              <span className="block leading-none mb-4" style={{ fontSize: "clamp(90px,24vw,140px)", filter: "drop-shadow(0 0 50px rgba(0,156,59,.55))" }}>
                {selecao.bandeira}
              </span>

              {/* Voce e */}
              <p className="uppercase tracking-[3px] mb-1" style={{ fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: "clamp(1.1rem,3.5vw,1.5rem)", color: "rgba(255,255,255,.55)" }}>
                Voce e
              </p>

              {/* Nome */}
              <h1 className="mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(4rem,16vw,9rem)", lineHeight: ".85", color: "#facc15", textShadow: "0 0 80px rgba(255,223,0,.35)" }}>
                {selecao.nome.toUpperCase()}
              </h1>

              {/* Compatibilidade */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>compatibilidade</span>
                <div className="w-28 h-2 rounded overflow-hidden" style={{ background: "rgba(255,255,255,.12)" }}>
                  <div className="h-full rounded transition-all duration-[1200ms]"
                    style={{ width: animBars ? `${compatPct}%` : "0%", background: "linear-gradient(90deg, #009C3B, #FFDF00)" }} />
                </div>
                <span className="font-black text-base" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#facc15" }}>{compatPct}%</span>
              </div>

              {/* Descricao */}
              <p className="max-w-[400px] leading-relaxed mb-7" style={{ fontSize: "clamp(.9rem,2.5vw,1.05rem)", color: "rgba(255,255,255,.68)" }}>
                {selecao.desc}
              </p>

              {/* Barras de perfil */}
              <div className="w-full max-w-[370px] rounded-2xl p-5 space-y-2.5"
                style={{ background: "rgba(255,255,255,.047)", border: "1px solid rgba(255,255,255,.08)" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: "rgba(255,255,255,.3)", letterSpacing: "2px" }}>
                  Seu perfil de jogo
                </p>
                {barras.map((b) => (
                  <div key={b.dim} className="grid items-center gap-2.5" style={{ gridTemplateColumns: "88px 1fr 36px" }}>
                    <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,.65)" }}>{b.icone} {b.label}</span>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
                      <div className="h-full rounded-full transition-all duration-[1200ms]"
                        style={{ backgroundColor: b.cor, width: animBars ? `${b.pct}%` : "0%" }} />
                    </div>
                    <span className="text-xs text-right font-mono" style={{ color: "rgba(255,255,255,.38)" }}>{b.pct}%</span>
                  </div>
                ))}
                <p className="text-right text-[10px] mt-2" style={{ color: "rgba(255,255,255,.2)" }}>total: 100%</p>
              </div>
            </div>
            {/* Fim card capturavel */}

            {/* ── BOTOES ── */}
            <div className="w-full max-w-[380px] mt-8 space-y-2.5">
              <p className="text-center mb-1" style={{ fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,5vw,1.85rem)" }}>
                E seus amigos,<br />qual seria <span style={{ color: "#facc15" }}>a selecao deles?</span>
              </p>
              <p className="text-center text-sm mb-5" style={{ color: "rgba(255,255,255,.42)" }}>
                Manda pro grupo e ve quem vai ser a Argentina 👀
              </p>

              {/* WhatsApp */}
              <button onClick={() => generateAndShare("whatsapp")} disabled={sharing}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "#25d366", color: "#fff" }}>
                {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : WPP_SVG}
                Enviar para amigos no WhatsApp
              </button>

              {/* Copiar + Proximo */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => generateAndShare("copiar")}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-xs transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)" }}>
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? "Copiado!" : "Copiar link"}
                </button>
                <button onClick={() => generateAndShare("share")} disabled={sharing}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-xs transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: "rgba(250,204,21,.12)", border: "1px solid rgba(250,204,21,.3)", color: "#facc15" }}>
                  {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                  Compartilhar
                </button>
              </div>

              {/* CTA dourado */}
              <button onClick={() => navigate("/home")}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                style={{ background: "#facc15", color: "#071410", boxShadow: "0 8px 28px rgba(250,204,21,.3)" }}>
                Fazer meu quiz — Entrar no Bolao
                <ChevronRight className="w-5 h-5" />
              </button>

              <button onClick={handleRefazer} className="w-full text-center text-xs py-2 transition-colors" style={{ color: "rgba(255,255,255,.3)" }}>
                Prefiro refazer o quiz →
              </button>
            </div>
          </section>

          {/* ── Strip social ── */}
          <div className="flex items-center justify-center gap-4 flex-wrap py-3.5 px-5 text-xs"
            style={{ background: "rgba(255,255,255,.035)", borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.45)" }}>
            <span>{selecao.bandeira} <strong style={{ color: "#facc15" }}>23%</strong> dos jogadores sao {selecao.nome}</span>
            <span style={{ color: "rgba(255,255,255,.15)" }}>·</span>
            <span>⚽ <strong style={{ color: "#facc15" }}>+5.400</strong> quizzes hoje</span>
            {diasCopa > 0 && <><span style={{ color: "rgba(255,255,255,.15)" }}>·</span><span>🏆 Copa em <strong style={{ color: "#facc15" }}>{diasCopa}</strong> dias</span></>}
          </div>

          {/* ── Provocacao ── */}
          <section className="max-w-[400px] mx-auto px-5 py-12 text-center">
            <h2 className="leading-[0.95] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.2rem,8vw,3.5rem)" }}>
              Qual selecao<br /><span style={{ color: "#facc15" }}>os seus amigos seriam?</span>
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,.48)" }}>
              47 resultados possiveis. Pode ser qualquer selecao das 48 da Copa 2026. O resultado surpreende.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{ background: "rgba(0,156,59,.18)", border: "1px solid rgba(0,156,59,.45)", color: "#86efac" }}>
                {selecao.bandeira} {selecao.nome} — voce
              </span>
              {SELECOES.filter(s => s.id !== selecao.id).slice(0, 6).map((s) => (
                <span key={s.id} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.72)", filter: "blur(5px)", userSelect: "none" }}>
                  {s.bandeira} {s.nome}
                </span>
              ))}
              <span className="rounded-full px-3 py-1.5 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.35)", filter: "blur(5px)" }}>
                ... +40
              </span>
            </div>

            {diasCopa > 0 && (
              <div className="rounded-xl px-4 py-3 mb-5 text-sm"
                style={{ background: "rgba(239,68,68,.09)", border: "1px solid rgba(239,68,68,.2)", color: "rgba(255,180,180,.82)" }}>
                <strong style={{ color: "#fca5a5" }}>⏰ Copa comeca em {diasCopa} dias.</strong> Entra no bolao antes que seus amigos se cadastrem primeiro.
              </div>
            )}

            <button onClick={handleRefazer}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#071410", boxShadow: "0 8px 28px rgba(250,204,21,.3)" }}>
              Descobrir a minha selecao
            </button>
          </section>

          {/* ── Footer ── */}
          <footer className="text-center py-6 text-xs" style={{ color: "rgba(255,255,255,.18)", borderTop: "1px solid rgba(255,255,255,.04)" }}>
            © 2026 Bolao na Copa · <a href="/privacidade.html" style={{ color: "rgba(255,255,255,.25)", textDecoration: "none" }}>Privacidade</a> · <a href="/home" style={{ color: "rgba(255,255,255,.25)", textDecoration: "none" }}>Abrir o app</a>
          </footer>
        </div>
      </div>
    );
  }

  return null;
};

export default Quiz;
