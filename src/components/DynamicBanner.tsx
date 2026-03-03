import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BannerData {
  id: string;
  titulo: string;
  subtitulo: string | null;
  emoji: string;
  badge_texto: string | null;
  cta_texto: string;
  cta_texto_participando: string;
  bolao_id: string | null;
  link: string | null;
  estilo: string;
  cor_fundo: string | null;
  cor_texto: string | null;
  mostrar_para: string;
}

interface DynamicBannerProps {
  userBolaoIds: Set<string>;
}

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

const AUTO_ROTATE_MS = 4000;

const DynamicBanner = ({ userBolaoIds }: DynamicBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);
  const isMouseDown = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  useEffect(() => {
    const fetchBanners = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("banners_home")
        .select("id, titulo, subtitulo, emoji, badge_texto, cta_texto, cta_texto_participando, bolao_id, link, estilo, cor_fundo, cor_texto, mostrar_para")
        .eq("ativo", true)
        .or(`data_fim.is.null,data_fim.gt.${now}`)
        .lte("data_inicio", now)
        .order("posicao", { ascending: true });

      if (data) {
        const contexto = user ? "logados" : "deslogados";
        const filtrados = (data as BannerData[]).filter(
          (b) => b.mostrar_para === "todos" || b.mostrar_para === contexto
        );
        setBanners(filtrados);
      }
      setLoading(false);
    };
    fetchBanners();
  }, [user]);

  // Scroll para o banner pelo index
  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    el.scrollTo({ left: idx * width, behavior: "smooth" });
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1) return;

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrent((prev) => {
          const next = (prev + 1) % banners.length;
          scrollToIndex(next);
          return next;
        });
      }, AUTO_ROTATE_MS);
    };

    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, scrollToIndex]);

  // Detectar scroll manual (snap) e atualizar indicador
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

        // Reset timer ao interagir manualmente
        if (userInteracted.current && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrent((prev) => {
              const next = (prev + 1) % banners.length;
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
  }, [banners.length, scrollToIndex]);

  // Mouse drag para desktop
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || banners.length <= 1) return;
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
    const walk = (x - dragStartX.current) * 1.5;
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const onMouseUpOrLeave = () => {
    const el = scrollRef.current;
    if (!el || !isMouseDown.current) return;
    isMouseDown.current = false;
    el.style.cursor = "grab";
    el.style.scrollSnapType = "x mandatory";
    // Snap para o mais próximo
    const width = el.offsetWidth;
    const idx = Math.round(el.scrollLeft / width);
    el.scrollTo({ left: idx * width, behavior: "smooth" });
  };

  const handleClick = async (banner: BannerData) => {
    if (!banner.bolao_id && banner.link) {
      if (!user && !banner.link.startsWith("/auth")) {
        navigate("/auth?modo=cadastro");
      } else {
        navigate(banner.link);
      }
      return;
    }

    if (!user && banner.bolao_id) {
      navigate("/auth?modo=cadastro");
      return;
    }

    if (!banner.bolao_id || !user) {
      if (!user) navigate("/auth?modo=cadastro");
      return;
    }

    const jaParticipa = userBolaoIds.has(banner.bolao_id);
    if (jaParticipa) {
      navigate(`/bolao/${banner.bolao_id}`);
      return;
    }

    setJoining(banner.id);
    try {
      const { error } = await supabase
        .from("bolao_participantes")
        .insert({ bolao_id: banner.bolao_id, user_id: user.id });
      if (error) {
        if (error.code === "23505") toast.info("Você já está participando!");
        else throw error;
      } else {
        toast.success("Você entrou no bolão! Faça seus palpites.");
      }
      navigate(`/bolao/${banner.bolao_id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar no bolão");
    } finally {
      setJoining(null);
    }
  };

  if (loading || banners.length === 0) return null;

  return (
    <div className="relative mb-4">
      {/* Scroll container com snap */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          cursor: banners.length > 1 ? "grab" : undefined,
          msOverflowStyle: "none",
        }}
      >
        {banners.map((banner) => {
          const jaParticipa = banner.bolao_id ? userBolaoIds.has(banner.bolao_id) : false;
          const isJoining = joining === banner.id;
          const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
          const bgStyle = banner.cor_fundo || estiloConfig.bg;
          const titleColor = banner.cor_texto || estiloConfig.titleColor;

          return (
            <div
              key={banner.id}
              className="flex-shrink-0 w-full"
              style={{ scrollSnapAlign: "start" }}
            >
              <div
                onClick={() => !isJoining && handleClick(banner)}
                className={`relative overflow-hidden rounded-2xl cursor-pointer group mx-0 ${isJoining ? "pointer-events-none opacity-80" : ""}`}
                style={{
                  background: bgStyle,
                  border: `1px solid ${estiloConfig.badgeBorder}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.1)",
                }}
              >
                {/* Efeito de brilho */}
                <div className="absolute inset-0 opacity-30"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 60%)" }} />
                {/* Textura */}
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.08) 30px, rgba(255,255,255,0.08) 31px)" }} />

                <div className="relative z-10 flex flex-col items-center text-center px-5 py-6">
                  <div className="text-5xl mb-2 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 12px rgba(234,179,8,0.4))" }}>
                    {banner.emoji}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight"
                    style={{ color: titleColor, textShadow: "0 0 20px rgba(251,191,36,0.3), 0 2px 4px rgba(0,0,0,0.5)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                    {banner.titulo}
                  </h2>
                  {banner.subtitulo && (
                    <p className="text-sm font-semibold mt-1.5 tracking-wide" style={{ color: estiloConfig.subtitleColor }}>
                      {banner.subtitulo}
                    </p>
                  )}
                  {banner.badge_texto && (
                    <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full"
                      style={{ background: estiloConfig.badgeBg, border: `1px solid ${estiloConfig.badgeBorder}` }}>
                      <span className="text-xs" style={{ color: estiloConfig.badgeText }}>⏳</span>
                      <span className="text-xs font-bold" style={{ color: estiloConfig.badgeText }}>
                        {jaParticipa ? "Você já está participando!" : banner.badge_texto}
                      </span>
                    </div>
                  )}
                  <button className="mt-4 w-full max-w-xs h-12 flex items-center justify-center gap-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all group-hover:scale-[1.02] group-hover:shadow-lg"
                    style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", color: "white", boxShadow: "0 4px 16px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>
                    {isJoining ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                    ) : (
                      <>{jaParticipa ? banner.cta_texto_participando : banner.cta_texto}<ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicadores */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { scrollToIndex(idx); setCurrent(idx); }}
              className={`transition-all duration-300 rounded-full ${
                idx === current ? "w-6 h-2 bg-copa-green-500" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      )}

      {/* Hide scrollbar CSS */}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default DynamicBanner;
