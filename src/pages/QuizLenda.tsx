import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Share2, Loader2, ChevronRight, Copy, Check, Crown } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import html2canvas from "html2canvas";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import AdLoadingOverlay from "@/components/AdLoadingOverlay";
import SEOHead from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { LENDAS, PERGUNTAS_LENDA, calcularLenda, type Lenda } from "@/lib/quiz-lenda-data";
import { shareViaWhatsApp } from "@/lib/utils";

type QuizStep = "intro" | "pergunta" | "calculando" | "ad-gate" | "resultado";

const PREVIEW_LENDAS = [
  { emoji: "👑", nome: "Pelé" }, { emoji: "⚡", nome: "Ronaldo" },
  { emoji: "🐐", nome: "Messi" }, { emoji: "🔥", nome: "Maradona", blur: true },
  { emoji: "🎩", nome: "Zidane", blur: true }, { emoji: "💪", nome: "CR7", blur: true },
  { emoji: "😁", nome: "Ronaldinho", blur: true }, { emoji: "🎯", nome: "Romário", blur: true },
  { emoji: "🦁", nome: "Baggio", blur: true }, { emoji: "🛡️", nome: "Beckenbauer", blur: true },
];

const QuizLenda = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { plano } = useUserPlan();
  const { showAd, adLoading, needsAd } = useRewardedAd();

  const startDirect = searchParams.get("start") === "true";
  const [step, setStep] = useState<QuizStep>(startDirect ? "pergunta" : "intro");
  const [perguntaIdx, setPerguntaIdx] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [lenda, setLenda] = useState<Lenda | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const isPremium = plano === "premium" || plano === "premium_pro";

  useEffect(() => {
    window.scrollTo(0, 0);
    if (startDirect) {
      trackEvent("quiz_lenda_start", { source: "lp" });
    }
  }, [startDirect]);

  const handleStart = () => {
    trackEvent("quiz_lenda_start", { source: "app" });
    setStep("pergunta");
    setPerguntaIdx(0);
    setRespostas([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVoltar = () => {
    if (perguntaIdx > 0) {
      setRespostas(respostas.slice(0, -1));
      setPerguntaIdx(perguntaIdx - 1);
    } else {
      navigate("/quiz");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResposta = (opcaoIdx: number) => {
    const novasRespostas = [...respostas, opcaoIdx];
    setRespostas(novasRespostas);

    if (novasRespostas.length >= PERGUNTAS_LENDA.length) {
      setStep("calculando");
      const resultado = calcularLenda(novasRespostas);
      setLenda(resultado);
      trackEvent("quiz_lenda_complete", { resultado: resultado.id });

      setTimeout(() => {
        if (isPremium) {
          setStep("resultado");
        } else {
          setStep("ad-gate");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 2000);
    } else {
      setPerguntaIdx(novasRespostas.length);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAdGate = async () => {
    if (needsAd) {
      trackEvent("quiz_lenda_ad_shown", {});
      const adResult = await showAd("quiz");
      if (!adResult) return;
    }
    setStep("resultado");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateImage = useCallback(async (): Promise<File | null> => {
    const cardEl = resultRef.current;
    if (!cardEl) return null;
    try {
      const canvas = await html2canvas(cardEl, { backgroundColor: "#071410", scale: 2, useCORS: true, logging: false });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) return new File([blob], `quiz-lenda-${lenda?.id || "resultado"}.png`, { type: "image/png" });
    } catch { /* silencioso */ }
    return null;
  }, [lenda]);

  const generateAndShare = useCallback(async (canal: string) => {
    if (!lenda) return;
    const isIOS = Capacitor.getPlatform() === "ios";
    const storeLink = isIOS
      ? "https://apps.apple.com/app/bolao-na-copa/id6761629695"
      : "https://www.bolaonacopa.com.br/quiz-lenda";
    const texto = `${lenda.share}\n\nBaixe o app: ${storeLink}`;
    trackEvent("quiz_lenda_share", { resultado: lenda.id, canal });

    setSharing(true);
    const imageFile = await generateImage();
    setSharing(false);

    if (canal === "whatsapp") {
      if (Capacitor.isNativePlatform() && imageFile) {
        try {
          const { Filesystem } = await import("@capacitor/filesystem");
          const { Share } = await import("@capacitor/share");
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          const saved = await Filesystem.writeFile({ path: `quiz-lenda-${lenda.id}.png`, data: base64, directory: 1 });
          await Share.share({ text: texto, files: [saved.uri], dialogTitle: "Enviar via WhatsApp" });
          return;
        } catch { /* fallback */ }
      }
      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try { await navigator.share({ text: texto, files: [imageFile] }); return; } catch (err: any) { if (err?.name === "AbortError") return; }
      }
      shareViaWhatsApp(texto);
    } else if (canal === "copiar") {
      try {
        await navigator.clipboard.writeText(texto);
        setCopied(true); toast.success("Texto copiado!"); setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback: usar Share no nativo se clipboard não funcionar
        if (Capacitor.isNativePlatform()) {
          try {
            const { Share } = await import("@capacitor/share");
            await Share.share({ text: texto, dialogTitle: "Copiar resultado" });
          } catch { /* silencioso */ }
        }
        toast.success("Texto copiado!");
      }
    } else if (canal === "share") {
      try {
        if (Capacitor.isNativePlatform()) {
          const { Share } = await import("@capacitor/share");
          await Share.share({ title: lenda.titulo, text: texto, url: storeLink, dialogTitle: "Compartilhar resultado" });
        } else if (navigator.share) {
          const shareData: ShareData = { title: lenda.titulo, text: texto, url: storeLink };
          if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) shareData.files = [imageFile];
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(texto);
          toast.success("Link copiado para compartilhar!");
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          try { await navigator.clipboard.writeText(texto); toast.success("Link copiado!"); } catch { toast.error("Não foi possível compartilhar"); }
        }
      }
    }
  }, [lenda, generateImage]);

  const WPP_SVG = <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

  // ═══ TELA: INTRO ═══
  if (step === "intro") {
    return (
      <div className="animate-fade-in -mx-4 -mt-6" style={{ background: "#14532d", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
        <SEOHead title="Quiz — Qual lenda da Copa você seria?" description="Responda 10 perguntas e descubra qual das 25 maiores lendas do futebol mundial combina com seu estilo. Pelé, Messi, Zidane ou Ronaldo?" path="/quiz/lenda" />
        <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.018) 60px,rgba(255,255,255,.018) 61px), repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,.018) 60px,rgba(255,255,255,.018) 61px)" }} />
        <div className="relative z-10">
          <section className="min-h-screen flex flex-col items-center justify-center px-5 py-9 text-center"
            style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(250,204,21,.12) 0%,transparent 68%)" }}>

            <button onClick={() => navigate("/quiz")}
              className="absolute top-4 left-4 p-2 rounded-full text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors z-20"
              style={{ top: "max(1rem, env(safe-area-inset-top, 1rem))" }}>
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="text-6xl mb-5" style={{ filter: "drop-shadow(0 0 40px rgba(250,204,21,.4))" }}>👑</div>

            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              👑 25 lendas · Copa do Mundo
            </div>

            <h1 className="leading-[0.88] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.8rem,11vw,6.5rem)", textShadow: "0 4px 28px rgba(0,0,0,.45)" }}>
              Qual lenda da Copa<br />
              <span style={{ color: "#facc15" }}>você seria?</span>
            </h1>

            <p className="max-w-[480px] mx-auto mt-3 leading-relaxed" style={{ fontSize: "clamp(.95rem,2.8vw,1.15rem)", color: "rgba(255,255,255,.72)" }}>
              10 perguntas revelam qual das <strong className="text-white">25 maiores lendas</strong> do futebol mundial combina com o seu estilo. Pode ser uma surpresa — ou exatamente quem você esperava.
            </p>

            {/* Preview perguntas */}
            <div className="w-full max-w-[460px] mt-10 space-y-2.5">
              {PERGUNTAS_LENDA.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-left rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,.048)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(250,204,21,.14)", border: "1.5px solid rgba(250,204,21,.38)", color: "#facc15" }}>{i + 1}</div>
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

            {/* Preview lendas */}
            <div className="w-full max-w-[460px] mt-9">
              <p className="text-[11px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: "rgba(255,255,255,.38)", letterSpacing: "2px" }}>
                Seu resultado pode ser qualquer uma dessas →
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PREVIEW_LENDAS.map((l, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,.065)", border: "1px solid rgba(255,255,255,.09)",
                      color: "rgba(255,255,255,.78)", filter: (l as any).blur ? "blur(5px)" : "none",
                      userSelect: (l as any).blur ? "none" : "auto",
                    }}>
                    {l.emoji} {l.nome}
                  </span>
                ))}
                <span className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", filter: "blur(5px)" }}>
                  +15 possíveis
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="w-full max-w-[460px] mt-10 text-center">
              <button onClick={handleStart}
                className="w-full max-w-[330px] mx-auto flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
                👑 Começar o Quiz <ChevronRight className="w-5 h-5" />
              </button>
              {!isPremium && (
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,.38)" }}>
                  Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
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
                <strong style={{ color: "#facc15" }}>+3.200 pessoas</strong> já descobriram sua lenda
              </p>
            </div>
          </section>

          <footer className="text-center py-6 text-xs" style={{ color: "rgba(255,255,255,.22)", borderTop: "1px solid rgba(255,255,255,.045)" }}>
            © 2026 Bolão na Copa · <a href="/privacidade.html" style={{ color: "rgba(255,255,255,.3)" }}>Privacidade</a> · <a href="/quiz" style={{ color: "rgba(255,255,255,.3)" }}>Outros quizzes</a>
          </footer>
        </div>
      </div>
    );
  }

  // ═══ TELA: PERGUNTA ═══
  if (step === "pergunta") {
    const pergunta = PERGUNTAS_LENDA[perguntaIdx];
    const progresso = ((perguntaIdx) / PERGUNTAS_LENDA.length) * 100;

    return (
      <div className="animate-fade-in -mx-4 -mt-6" key={perguntaIdx} style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          background: "repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px), repeating-linear-gradient(0deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px)",
        }} />
        <div className="relative z-10 max-w-lg mx-auto px-5 py-8 space-y-6">
          <SEOHead title={`Quiz Lendas — Pergunta ${perguntaIdx + 1}/10`} noindex />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={handleVoltar} className="p-1.5 rounded-full transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,.5)" }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,.5)" }}>Pergunta {perguntaIdx + 1} de {PERGUNTAS_LENDA.length}</span>
                  <span className="text-xs font-bold" style={{ color: "#facc15" }}>{Math.round(progresso)}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progresso}%`, background: "linear-gradient(90deg, #15803d, #facc15)" }} />
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold leading-snug">{pergunta.texto}</h2>

          <div className="space-y-2.5">
            {pergunta.opcoes.map((opcao, i) => (
              <button key={`${perguntaIdx}-${i}`} onClick={() => handleResposta(i)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(250,204,21,.08)"; e.currentTarget.style.borderColor = "rgba(250,204,21,.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}>
                <span className="text-sm font-medium leading-snug" style={{ color: "rgba(255,255,255,.85)" }}>{opcao}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══ TELA: CALCULANDO ═══
  if (step === "calculando") {
    return (
      <div className="animate-fade-in -mx-4 -mt-6 flex flex-col items-center justify-center text-center" style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        <SEOHead title="Calculando sua lenda..." noindex />
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse" style={{ background: "rgba(250,204,21,.1)" }}>
            <span className="text-4xl">👑</span>
          </div>
          <Loader2 className="w-24 h-24 animate-spin absolute -top-2 -left-2" style={{ color: "#15803d" }} />
        </div>
        <h2 className="text-xl font-bold mb-2">Calculando sua lenda...</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Analisando suas respostas entre 25 lendas</p>
        <div className="mt-6 flex gap-2 animate-pulse">
          {LENDAS.slice(0, 5).map((l, i) => (
            <span key={i} className="text-2xl" style={{ animationDelay: `${i * 200}ms` }}>{l.emoji}</span>
          ))}
        </div>
      </div>
    );
  }

  // ═══ TELA: AD GATE ═══
  if (step === "ad-gate") {
    return (
      <div className="animate-fade-in -mx-4 -mt-6 flex flex-col items-center justify-center text-center space-y-6" style={{ background: "#071410", color: "#fff", minHeight: "100vh", padding: "48px 20px" }}>
        <SEOHead title="Sua lenda está pronta!" noindex />
        {adLoading && <AdLoadingOverlay />}
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(250,204,21,.1)", border: "2px solid rgba(250,204,21,.28)" }}>
          <span className="text-3xl">🔐</span>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Sua lenda está pronta!</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Assista um vídeo curto para revelar o resultado</p>
        </div>
        <button onClick={handleAdGate}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: "#facc15", color: "#071410", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
          Revelar minha lenda 👑
        </button>
        <button onClick={() => navigate("/planos")} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,.4)" }}>
          <Crown className="w-3.5 h-3.5" /> Premium: sem anúncios em todos os quizzes
        </button>
      </div>
    );
  }

  // ═══ TELA: RESULTADO ═══
  if (step === "resultado" && lenda) {
    const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Você";

    return (
      <div className="animate-fade-in -mx-4 -mt-6" style={{ background: "#071410", color: "#fff", minHeight: "100vh" }}>
        <SEOHead title={`Quiz — ${lenda.titulo}`} noindex />
        <div className="fixed inset-0 z-0 overflow-hidden" style={{
          background: "radial-gradient(ellipse at 50% 100%, rgba(250,204,21,.15) 0%, transparent 55%), radial-gradient(ellipse at 50% 0%, rgba(0,39,118,.18) 0%, transparent 50%)",
        }}>
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px), repeating-linear-gradient(0deg,transparent,transparent 58px,rgba(255,255,255,.02) 58px,rgba(255,255,255,.02) 59px)",
          }} />
        </div>

        <div className="relative z-10">
          <section className="flex flex-col items-center px-5 py-12 text-center">
            {/* Card capturável */}
            <div ref={resultRef} className="w-full max-w-[400px] flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)" }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#facc15", boxShadow: "0 0 8px rgba(250,204,21,.7)" }} />
                {userName} descobriu sua lenda
              </div>
              <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,.4)" }}>
                Descubra você também em: <span style={{ color: "#facc15" }}>bolaonacopa.com.br/quiz-lenda</span>
              </p>

              {/* Emoji grande */}
              <span className="block leading-none mb-4" style={{ fontSize: "clamp(90px,24vw,140px)", filter: "drop-shadow(0 0 50px rgba(250,204,21,.4))" }}>
                {lenda.emoji}
              </span>

              {/* Bandeira + nome */}
              <p className="uppercase tracking-[3px] mb-1" style={{ fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif", fontWeight: 700, fontStyle: "italic", fontSize: "clamp(1.1rem,3.5vw,1.5rem)", color: "rgba(255,255,255,.55)" }}>
                {lenda.bandeira} Você é
              </p>

              <h1 className="mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem,12vw,7rem)", lineHeight: ".85", color: "#facc15", textShadow: "0 0 80px rgba(255,223,0,.35)" }}>
                {lenda.nome.toUpperCase()}
              </h1>

              {/* Descrição */}
              <p className="max-w-[400px] leading-relaxed mb-7" style={{ fontSize: "clamp(.9rem,2.5vw,1.05rem)", color: "rgba(255,255,255,.68)" }}>
                {lenda.desc}
              </p>
            </div>

            {/* Botões */}
            <div className="w-full max-w-[380px] mt-4 space-y-2.5">
              <p className="text-center mb-1" style={{ fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif", fontWeight: 900, fontSize: "clamp(1.4rem,5vw,1.85rem)" }}>
                E seus amigos,<br />qual lenda da Copa <span style={{ color: "#facc15" }}>eles seriam?</span>
              </p>
              <p className="text-center text-sm mb-5" style={{ color: "rgba(255,255,255,.42)" }}>
                Manda pro grupo e descubra quem é o Pelé da galera 👑
              </p>

              <button onClick={() => generateAndShare("whatsapp")} disabled={sharing}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-base transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "#25d366", color: "#fff" }}>
                {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : WPP_SVG}
                Enviar para amigos no WhatsApp
              </button>

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

              {!isPremium && (
                <button onClick={() => navigate("/planos")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all mt-1"
                  style={{ background: "rgba(250,204,21,.1)", border: "1px solid rgba(250,204,21,.25)", color: "#facc15" }}>
                  <Crown className="w-3.5 h-3.5" /> Premium PRO: todos os quizzes sem anúncios — R$ 14,90/mês
                </button>
              )}

              <button onClick={() => navigate("/quiz/selecao")}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-base transition-all hover:-translate-y-0.5 active:scale-[0.98] mt-2"
                style={{ background: "#facc15", color: "#071410", boxShadow: "0 8px 28px rgba(250,204,21,.3)" }}>
                ⚽ Próximo quiz: Seleções <ChevronRight className="w-5 h-5" />
              </button>

              <button onClick={() => navigate("/quiz")} className="w-full text-center text-xs py-2 transition-colors" style={{ color: "rgba(255,255,255,.3)" }}>
                Ver todos os quizzes →
              </button>
            </div>
          </section>

          <footer className="text-center py-6 text-xs" style={{ color: "rgba(255,255,255,.18)", borderTop: "1px solid rgba(255,255,255,.04)" }}>
            © 2026 Bolão na Copa · <a href="/privacidade.html" style={{ color: "rgba(255,255,255,.25)", textDecoration: "none" }}>Privacidade</a> · <a href="/quiz" style={{ color: "rgba(255,255,255,.25)", textDecoration: "none" }}>Outros quizzes</a>
          </footer>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizLenda;
