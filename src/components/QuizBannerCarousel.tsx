import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface QuizBanner {
  id: string;
  titulo: string;
  subtitulo: string | null;
  emoji: string;
  cta_texto: string;
  link: string;
  imagem_url: string | null;
  imagem_mobile_url: string | null;
  cor_fundo: string;
  cor_texto: string;
}

const AUTO_ROTATE_MS = 5000;

const QuizBannerCarousel = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<QuizBanner[]>([]);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Cache de 10 min
        const cacheKey = "banners_quiz_cache_v2";
        const cacheTimeKey = "banners_quiz_cache_v2_t";
        const cached = sessionStorage.getItem(cacheKey);
        const cachedTime = sessionStorage.getItem(cacheTimeKey);
        if (cached && cachedTime && Date.now() - Number(cachedTime) < 600000) {
          try { const d = JSON.parse(cached); if (d?.length > 0) { setBanners(d); return; } } catch {}
        }

        const now = new Date().toISOString();
        const { data } = await supabase
          .from("banners_quiz")
          .select("id, titulo, subtitulo, emoji, cta_texto, link, imagem_url, imagem_mobile_url, cor_fundo, cor_texto")
          .eq("ativo", true)
          .lte("data_inicio", now)
          .or(`data_fim.is.null,data_fim.gt.${now}`)
          .order("posicao", { ascending: true });
        if (data && data.length > 0) {
          setBanners(data as QuizBanner[]);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); sessionStorage.setItem(cacheTimeKey, String(Date.now())); } catch {}
        }
      } catch {}
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
    if (banners.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const len = banners.length;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % len;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ROTATE_MS);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [banners.length, scrollToIndex]);

  // Sync scroll indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const w = el.offsetWidth;
        if (w > 0) setCurrent(Math.round(el.scrollLeft / w));
      }, 50);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(timeout); };
  }, [banners.length]);

  const handleClick = (banner: QuizBanner) => {
    if (banner.link.startsWith("/")) {
      navigate(banner.link);
    } else {
      window.open(banner.link, "_blank");
    }
  };

  if (banners.length === 0) return null;

  const renderBanner = (banner: QuizBanner) => {
    // Se tem imagem, renderizar como poster
    if (banner.imagem_url) {
      return (
        <div onClick={() => handleClick(banner)}
          className="relative overflow-hidden rounded-2xl cursor-pointer group" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <img src={banner.imagem_url} alt={banner.titulo}
            className="hidden sm:block w-full h-auto rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]" draggable={false} />
          <img src={banner.imagem_mobile_url || banner.imagem_url} alt={banner.titulo}
            className="block sm:hidden w-full h-auto rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]" draggable={false} />
        </div>
      );
    }

    // Sem imagem: renderizar com gradiente
    return (
      <div onClick={() => handleClick(banner)}
        className="relative overflow-hidden rounded-2xl cursor-pointer text-white text-center"
        style={{ background: `linear-gradient(160deg, ${banner.cor_fundo} 0%, #166534 50%, #15803d 100%)`, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.5) 60px,rgba(255,255,255,.5) 61px), repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,.5) 60px,rgba(255,255,255,.5) 61px)",
        }} />
        <div className="relative z-10 flex flex-col items-center px-5 py-8 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: banner.cor_texto }}>
            {banner.emoji} Seleções do mundo · Copa 2026
          </div>
          <h3 className="leading-[0.9]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.8rem,7vw,3rem)", color: "#fff", textShadow: "0 2px 16px rgba(0,0,0,.3)" }}>
            {banner.titulo.split("?")[0]}
            {banner.titulo.includes("?") && (
              <><br /><span style={{ color: banner.cor_texto }}>{banner.titulo.split("?").slice(-1)[0]}?</span></>
            )}
          </h3>
          {banner.subtitulo && (
            <p className="text-xs max-w-sm" style={{ color: "rgba(255,255,255,.7)" }}>
              {banner.subtitulo}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 py-3 px-8 rounded-xl font-black text-sm transition-all hover:-translate-y-0.5"
            style={{ background: banner.cor_texto, color: banner.cor_fundo }}>
            {banner.cta_texto} <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar select-none"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {banners.map((banner) => (
          <div key={banner.id} className="flex-shrink-0 w-full" style={{ scrollSnapAlign: "start" }}>
            {renderBanner(banner)}
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, idx) => (
            <button key={idx}
              onClick={() => { scrollToIndex(idx); setCurrent(idx); }}
              className={`transition-all duration-300 rounded-full ${
                idx === current ? "w-6 h-2 bg-copa-green-500" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`} />
          ))}
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default QuizBannerCarousel;
