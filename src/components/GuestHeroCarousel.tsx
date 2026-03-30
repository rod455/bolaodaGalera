import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, UserPlus } from "lucide-react";
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
  imagem_url: string | null;
  imagem_mobile_url: string | null;
  imagem_fundo_url: string | null;
}

interface GuestHeroCarouselProps {
  participantesCount: Record<string, number>;
  handleGoogleLogin: () => void;
}

const AUTO_ROTATE_MS = 4000;
const DRAG_THRESHOLD = 8;

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
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [current, setCurrent] = useState(0);
  const [clickBlocked, setClickBlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);
  const isMouseDown = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const totalSlides = banners.length;
  const totalJogadores = Math.max(1000, Object.values(participantesCount).reduce((a, b) => a + b, 0));

  useEffect(() => {
    const fetchBanners = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("banners_home")
        .select("id, titulo, subtitulo, emoji, badge_texto, cta_texto, link, estilo, cor_fundo, cor_texto, mostrar_para, imagem_url, imagem_mobile_url, imagem_fundo_url")
        .eq("ativo", true)
        .or(`data_fim.is.null,data_fim.gt.${now}`)
        .lte("data_inicio", now)
        .order("posicao", { ascending: true });

      if (data) {
        const filtrados = data.filter(
          (b: any) => b.mostrar_para === "todos" || b.mostrar_para === "deslogados"
        );
        setBanners(filtrados as BannerData[]);
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

  // Sync indicador
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const w = el.offsetWidth;
        if (w === 0) return;
        setCurrent(Math.round(el.scrollLeft / w));
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
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", markInteraction);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", markInteraction);
      clearTimeout(timeout);
    };
  }, [totalSlides, scrollToIndex]);

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || totalSlides <= 1) return;
    isMouseDown.current = true;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.scrollSnapType = "none";
    userInteracted.current = true;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const delta = x - dragStartX.current;
    if (Math.abs(delta) > DRAG_THRESHOLD && !clickBlocked) setClickBlocked(true);
    el.scrollLeft = dragScrollLeft.current - delta * 1.5;
  };

  const onMouseUpOrLeave = () => {
    const el = scrollRef.current;
    if (!el || !isMouseDown.current) return;
    isMouseDown.current = false;
    el.style.cursor = "grab";
    el.style.scrollSnapType = "x mandatory";
    const width = el.offsetWidth;
    let idx = Math.round(el.scrollLeft / width);
    if (idx >= totalSlides) idx = 0;
    if (idx < 0) idx = totalSlides - 1;
    el.scrollTo({ left: idx * width, behavior: "smooth" });
    setTimeout(() => setClickBlocked(false), 300);
  };

  const handleBannerClick = (banner: BannerData) => {
    if (clickBlocked) return;
    navigate(banner.link || "/auth?modo=cadastro");
  };

  const renderPoster = (banner: BannerData) => {
    const mobileImg = banner.imagem_mobile_url || banner.imagem_url!;
    return (
      <div
        onClick={() => handleBannerClick(banner)}
        className="relative overflow-hidden rounded-2xl cursor-pointer group"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
      >
        {/* Desktop */}
        <img
          src={banner.imagem_url!}
          alt={banner.titulo}
          className="hidden sm:block w-full h-auto rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
          draggable={false}
        />
        {/* Mobile */}
        <img
          src={mobileImg}
          alt={banner.titulo}
          className="block sm:hidden w-full h-auto rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
          draggable={false}
        />
      </div>
    );
  };

  const renderBackground = (banner: BannerData) => {
    const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
    const titleColor = banner.cor_texto || estiloConfig.titleColor;

    return (
      <div
        onClick={() => handleBannerClick(banner)}
        className="relative overflow-hidden rounded-2xl cursor-pointer group aspect-[16/9] sm:aspect-[12/5]"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      >
        <img src={banner.imagem_fundo_url!} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
        <div className="relative z-10 flex flex-col items-center text-center px-5 py-6">
          <div className="text-5xl mb-2 drop-shadow-lg">{banner.emoji}</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-lg" style={{ color: titleColor }}>
            {banner.titulo}
          </h2>
          {banner.subtitulo && (
            <p className="text-sm font-semibold mt-1.5 tracking-wide text-white/90 drop-shadow">{banner.subtitulo}</p>
          )}
          <div className="flex gap-2.5 mt-4 w-full max-w-xs">
            <Button
              onClick={(e) => { e.stopPropagation(); if (clickBlocked) return; navigate(banner.link || "/auth?modo=cadastro"); }}
              className="flex-1 h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> {banner.cta_texto}
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); if (clickBlocked) return; navigate("/auth"); }}
              className="px-5 h-12 text-sm font-semibold rounded-xl border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNormal = (banner: BannerData) => {
    const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
    const bgStyle = banner.cor_fundo || estiloConfig.bg;
    const titleColor = banner.cor_texto || estiloConfig.titleColor;

    return (
      <div
        className="relative overflow-hidden rounded-2xl text-white shadow-xl aspect-[16/9] sm:aspect-[12/5]"
        style={{ background: bgStyle, border: `1px solid ${estiloConfig.badgeBorder}` }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)" }} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-20 translate-x-20 blur-2xl" />

        <div className="relative z-10 p-5 pb-4 flex flex-col justify-center h-full">
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
            <div className="mt-3 rounded-xl overflow-hidden"
              style={{ background: estiloConfig.badgeBg, border: `1px solid ${estiloConfig.badgeBorder}` }}>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-lg">✅</span>
                <p className="text-sm font-bold" style={{ color: estiloConfig.badgeText }}>
                  {banner.badge_texto}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-2">
              {["🇧🇷", "⚽", "🏆", "🎯", "🔥"].map((emoji, i) => (
                <div key={i} className="w-7 h-7 bg-white/10 backdrop-blur rounded-full border-2 border-gray-800 flex items-center justify-center text-xs">
                  {emoji}
                </div>
              ))}
            </div>
            <div className="text-xs">
              <span className="font-bold text-white">{totalJogadores.toLocaleString("pt-BR")}+</span>
              <span className="text-white/50"> já estão jogando</span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-4">
            <Button
              onClick={(e) => {
                if (clickBlocked) { e.stopPropagation(); return; }
                navigate(banner.link || "/auth?modo=cadastro");
              }}
              className="flex-1 h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-gray-900 font-extrabold text-sm rounded-xl shadow-lg shadow-copa-gold-400/20 transition-all hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> {banner.cta_texto}
            </Button>
            <button
              onClick={(e) => { if (clickBlocked) { e.stopPropagation(); return; } navigate("/auth"); }}
              className="px-5 h-12 text-sm font-semibold rounded-xl border-2 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40 transition-all"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Modo HÍBRIDO (imagem mobile + gradiente desktop) ──
  const renderHybrid = (banner: BannerData) => (
    <div onClick={() => handleBannerClick(banner)} className="relative overflow-hidden rounded-2xl cursor-pointer group">
      {/* Mobile: imagem poster */}
      <img
        src={banner.imagem_mobile_url!}
        alt={banner.titulo}
        className="block sm:hidden w-full h-auto rounded-2xl"
        draggable={false}
      />
      {/* Desktop: banner normal (gradiente) */}
      <div className="hidden sm:block">
        {renderNormal(banner)}
      </div>
    </div>
  );

  const renderSlide = (banner: BannerData) => {
    if (banner.imagem_url) return renderPoster(banner);
    if (!banner.imagem_url && banner.imagem_mobile_url) return renderHybrid(banner);
    if (banner.imagem_fundo_url) return renderBackground(banner);
    return renderNormal(banner);
  };

  if (banners.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar select-none"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: totalSlides > 1 ? "grab" : undefined,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
      >
        {banners.map((b) => (
          <div key={b.id} className="flex-shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
            {renderSlide(b)}
          </div>
        ))}
      </div>

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

      {!/FBAN|FBAV|Instagram|Line|TikTok|Snapchat/i.test(navigator.userAgent) && (
        <button
          onClick={(e) => { if (clickBlocked) return; handleGoogleLogin(); }}
          className="w-full mt-4 flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-copa-green-400 hover:shadow-md rounded-xl py-3.5 font-semibold text-sm text-gray-600 transition-all"
        >
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
