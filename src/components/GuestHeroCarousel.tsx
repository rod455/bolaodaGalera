import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Loader2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface BannerData {
  id: string;
  titulo: string;
  subtitulo: string | null;
  emoji: string;
  badge_texto: string | null;
  cta_texto: string;
  link: string | null;
  estilo: string;
  cor_fundo: string | null;
  cor_texto: string | null;
}

interface GuestHeroCarouselProps {
  participantesCount: Record<string, number>;
  handleGoogleLogin: () => void;
}

const AUTO_ROTATE_MS = 4000;

const ESTILOS: Record<string, {
  bg: string; titleColor: string; subtitleColor: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
}> = {
  premium: {
    bg: "linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 40%, #111111 100%)",
    titleColor: "#FBBF24",
    subtitleColor: "rgba(255,255,255,0.8)",
    badgeBg: "rgba(234,179,8,0.15)",
    badgeBorder: "rgba(234,179,8,0.25)",
    badgeText: "#FCD34D",
  },
  verde: {
    bg: "linear-gradient(160deg, #14532d 0%, #166534 40%, #15803d 100%)",
    titleColor: "#FFFFFF",
    subtitleColor: "rgba(255,255,255,0.8)",
    badgeBg: "rgba(255,255,255,0.15)",
    badgeBorder: "rgba(255,255,255,0.25)",
    badgeText: "#BBF7D0",
  },
  laranja: {
    bg: "linear-gradient(160deg, #7c2d12 0%, #9a3412 40%, #c2410c 100%)",
    titleColor: "#FEF3C7",
    subtitleColor: "rgba(255,255,255,0.8)",
    badgeBg: "rgba(254,243,199,0.15)",
    badgeBorder: "rgba(254,243,199,0.25)",
    badgeText: "#FDE68A",
  },
};

const GuestHeroCarousel = ({ participantesCount, handleGoogleLogin }: GuestHeroCarouselProps) => {
  const navigate = useNavigate();
  const [extraBanners, setExtraBanners] = useState<BannerData[]>([]);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);

  const totalSlides = 1 + extraBanners.length;
  const totalJogadores = Math.max(1000, Object.values(participantesCount).reduce((a, b) => a + b, 0));

  useEffect(() => {
    const fetchBanners = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("banners_home")
        .select("id, titulo, subtitulo, emoji, badge_texto, cta_texto, link, estilo, cor_fundo, cor_texto, mostrar_para")
        .eq("ativo", true)
        .or(`data_fim.is.null,data_fim.gt.${now}`)
        .lte("data_inicio", now)
        .order("posicao", { ascending: true });

      if (data) {
        const filtrados = data.filter(
          (b: any) => b.mostrar_para === "todos" || b.mostrar_para === "deslogados"
        );
        setExtraBanners(filtrados as BannerData[]);
      }
    };
    fetchBanners();
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" });
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (totalSlides <= 1) return;

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrent((prev) => {
          const next = (prev + 1) % totalSlides;
          scrollToIndex(next);
          return next;
        });
      }, AUTO_ROTATE_MS);
    };

    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [totalSlides, scrollToIndex]);

  // Detectar scroll manual
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const width = el.offsetWidth;
        if (width === 0) return;
        const idx = Math.round(el.scrollLeft / width);
        setCurrent(idx);

        if (userInteracted.current && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrent((prev) => {
              const next = (prev + 1) % totalSlides;
              scrollToIndex(next);
              return next;
            });
          }, AUTO_ROTATE_MS);
          userInteracted.current = false;
        }
      }, 50);
    };

    const markInteraction = () => { userInteracted.current = true; };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("pointerdown", markInteraction);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerdown", markInteraction);
      clearTimeout(scrollTimeout);
    };
  }, [totalSlides, scrollToIndex]);

  // ── Slide 0: Hero card original ──
  const renderHeroSlide = () => (
    <div className="flex-shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)" }} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-copa-green-500/15 rounded-full -translate-y-20 translate-x-20 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-copa-gold-400/10 rounded-full translate-y-14 -translate-x-10 blur-xl" />

        <div className="relative z-10 p-5 pb-4">
          <h2 className="text-[22px] font-extrabold leading-tight">
            Desafie seus amigos,{" "}
            <span className="text-copa-gold-400">prove que você entende de bola</span>{" "}
            e concorra a prêmios!
          </h2>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            Crie seu bolão, faça seus palpites e veja quem acerta mais. Grátis pra jogar.
          </p>

          <div className="mt-4 rounded-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #92400E 0%, #B45309 30%, #D97706 60%, #EAB308 100%)", border: "1px solid rgba(250, 204, 21, 0.3)" }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl">🏆</span>
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-snug">
                  Valendo <span style={{ color: "#FEF9C3" }}>R$ 200</span> em prêmio!
                </p>
                <p className="text-white/60 text-[11px] mt-0.5">Bolão do Paulistão — Finais</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-2">
              {["🇧🇷", "⚽", "🏆", "🎯", "🔥"].map((emoji, i) => (
                <div key={i} className="w-7 h-7 bg-white/10 backdrop-blur rounded-full border-2 border-gray-800 flex items-center justify-center text-xs">{emoji}</div>
              ))}
            </div>
            <div className="text-xs">
              <span className="font-bold text-white">{totalJogadores.toLocaleString("pt-BR")}+</span>
              <span className="text-white/50"> já estão jogando</span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-4">
            <Button onClick={() => navigate("/auth?modo=cadastro")}
              className="flex-1 h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-sm rounded-xl shadow-lg shadow-copa-gold-400/20 transition-all hover:scale-[1.02]">
              <UserPlus className="w-4 h-4 mr-1.5" /> Criar conta grátis
            </Button>
            <button onClick={() => navigate("/auth")}
              className="px-5 h-12 text-sm font-semibold rounded-xl border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all">
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Slides extras ──
  const renderDynamicSlide = (banner: BannerData) => {
    const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
    const bgStyle = banner.cor_fundo || estiloConfig.bg;
    const titleColor = banner.cor_texto || estiloConfig.titleColor;

    return (
      <div key={banner.id} className="flex-shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
        <div className="relative overflow-hidden rounded-2xl text-white shadow-xl"
          style={{ background: bgStyle, border: `1px solid ${estiloConfig.badgeBorder}` }}>
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)" }} />
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-20 translate-x-20 blur-2xl" />

          <div className="relative z-10 p-5 pb-4">
            <div className="text-5xl mb-3" style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.2))" }}>
              {banner.emoji}
            </div>
            <h2 className="text-[22px] font-extrabold leading-tight" style={{ color: titleColor }}>
              {banner.titulo}
            </h2>
            {banner.subtitulo && (
              <p className="text-sm mt-2 leading-relaxed" style={{ color: estiloConfig.subtitleColor }}>
                {banner.subtitulo}
              </p>
            )}
            {banner.badge_texto && (
              <div className="mt-4 rounded-xl overflow-hidden"
                style={{ background: estiloConfig.badgeBg, border: `1px solid ${estiloConfig.badgeBorder}` }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">⏳</span>
                  <p className="text-sm font-bold" style={{ color: estiloConfig.badgeText }}>{banner.badge_texto}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {["🇧🇷", "⚽", "🏆", "🎯", "🔥"].map((emoji, i) => (
                  <div key={i} className="w-7 h-7 bg-white/10 backdrop-blur rounded-full border-2 border-gray-800 flex items-center justify-center text-xs">{emoji}</div>
                ))}
              </div>
              <div className="text-xs">
                <span className="font-bold text-white">{totalJogadores.toLocaleString("pt-BR")}+</span>
                <span className="text-white/50"> já estão jogando</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4">
              <Button onClick={() => navigate(banner.link || "/auth?modo=cadastro")}
                className="flex-1 h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-sm rounded-xl shadow-lg shadow-copa-gold-400/20 transition-all hover:scale-[1.02]">
                <UserPlus className="w-4 h-4 mr-1.5" /> {banner.cta_texto}
              </Button>
              <button onClick={() => navigate("/auth")}
                className="px-5 h-12 text-sm font-semibold rounded-xl border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Scroll container com snap */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {renderHeroSlide()}
        {extraBanners.map((b) => renderDynamicSlide(b))}
      </div>

      {/* Indicadores */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => { scrollToIndex(idx); setCurrent(idx); }}
              className={`transition-all duration-300 rounded-full ${
                idx === current ? "w-6 h-2 bg-copa-gold-400" : "w-2 h-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Google Login */}
      {!/FBAN|FBAV|Instagram|Line|TikTok|Snapchat/i.test(navigator.userAgent) && (
        <button onClick={handleGoogleLogin}
          className="w-full mt-4 flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-copa-green-400 hover:shadow-md rounded-xl py-3.5 font-semibold text-sm text-gray-600 transition-all">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Cadastre-se rápido com Google
        </button>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default GuestHeroCarousel;
