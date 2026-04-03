import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FREE_MAX_PARTICIPANTES, PREMIUM_MAX_PARTICIPANTES } from "@/lib/constants";

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
  imagem_url: string | null;
  imagem_mobile_url: string | null;
  imagem_fundo_url: string | null;
  // ── Segmentação ──
  segmento: string;
  dias_desde_cadastro_min: number | null;
  dias_desde_cadastro_max: number | null;
  tem_bolao_privado: boolean | null;
  qtd_participantes_min: number | null;
}

// Contexto do usuário para segmentação de banners
export interface UserBannerContext {
  diasDesdeCadastro: number;
  temBolaoPrivado: boolean;
  qtdParticipantesMax: number; // maior nº de participantes entre os bolões privados do user
  temBolaoSolitario: boolean; // criou bolão privado onde só ele participa
}

interface DynamicBannerProps {
  userBolaoIds: Set<string>;
  userContext?: UserBannerContext;
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
const DRAG_THRESHOLD = 8;

const DynamicBanner = ({ userBolaoIds, userContext }: DynamicBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [clickBlocked, setClickBlocked] = useState(false);
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
        .select("id, titulo, subtitulo, emoji, badge_texto, cta_texto, cta_texto_participando, bolao_id, link, estilo, cor_fundo, cor_texto, mostrar_para, imagem_url, imagem_mobile_url, imagem_fundo_url, segmento, dias_desde_cadastro_min, dias_desde_cadastro_max, tem_bolao_privado, qtd_participantes_min")
        .eq("ativo", true)
        .or(`data_fim.is.null,data_fim.gt.${now}`)
        .lte("data_inicio", now)
        .order("posicao", { ascending: true });

      if (data) {
        const contexto = user ? "logados" : "deslogados";
        const filtrados = (data as BannerData[]).filter((b) => {
          // 1. Filtro logados/deslogados (existente)
          if (b.mostrar_para !== "todos" && b.mostrar_para !== contexto) return false;

          // 2. Filtro por segmento (novo)
          const seg = b.segmento || "todos";
          if (seg === "todos") return true;
          if (seg === "deslogados") return !user;
          if (!user || !userContext) return seg === "todos";

          switch (seg) {
            case "novo":
              return userContext.diasDesdeCadastro <= 3;
            case "ativo":
              return userContext.temBolaoPrivado && userContext.qtdParticipantesMax > 1;
            case "so_nacional":
              return !userContext.temBolaoPrivado;
            case "solitario":
              return userContext.temBolaoSolitario;
            default:
              return true;
          }
        }).filter((b) => {
          // 3. Filtros numéricos opcionais
          if (!userContext) return true;
          if (b.dias_desde_cadastro_min != null && userContext.diasDesdeCadastro < b.dias_desde_cadastro_min) return false;
          if (b.dias_desde_cadastro_max != null && userContext.diasDesdeCadastro > b.dias_desde_cadastro_max) return false;
          if (b.tem_bolao_privado != null && userContext.temBolaoPrivado !== b.tem_bolao_privado) return false;
          if (b.qtd_participantes_min != null && userContext.qtdParticipantesMax < b.qtd_participantes_min) return false;
          return true;
        });
        setBanners(filtrados);
      }
      setLoading(false);
    };
    fetchBanners();
  }, [user, userContext]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" });
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const bannersLen = banners.length;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        if (bannersLen === 0) return 0;
        const next = (prev + 1) % bannersLen;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_ROTATE_MS);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [banners.length, scrollToIndex]);

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
        if (userInteracted.current) {
          if (timerRef.current) clearInterval(timerRef.current);
          const bannersLen = banners.length;
          if (bannersLen > 1) {
            timerRef.current = setInterval(() => {
              setCurrent((prev) => {
                const next = (prev + 1) % bannersLen;
                scrollToIndex(next);
                return next;
              });
            }, AUTO_ROTATE_MS);
          }
          userInteracted.current = false;
        }
      }, 50);
    };
    const markInteraction = () => { userInteracted.current = true; };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", markInteraction);
    return () => { el.removeEventListener("scroll", onScroll); el.removeEventListener("pointerdown", markInteraction); clearTimeout(timeout); };
  }, [banners.length, scrollToIndex]);

  // Mouse drag
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
    if (idx >= banners.length) idx = 0;
    if (idx < 0) idx = banners.length - 1;
    el.scrollTo({ left: idx * width, behavior: "smooth" });
    setTimeout(() => setClickBlocked(false), 300);
  };

  const checkBolaoCapacity = async (bolaoId: string): Promise<boolean> => {
    const { count } = await supabase
      .from("bolao_participantes")
      .select("*", { count: "exact", head: true })
      .eq("bolao_id", bolaoId);
    const currentCount = count || 0;
    const { data: participants } = await supabase
      .from("bolao_participantes")
      .select("user_id, profiles(plano)")
      .eq("bolao_id", bolaoId);
    const { data: bolaoData } = await supabase
      .from("boloes")
      .select("criador_id, profiles(plano)")
      .eq("id", bolaoId)
      .single();
    const hasPremiumMember = (participants || []).some(
      (p: any) => p.profiles?.plano === "premium" || p.profiles?.plano === "premium_pro"
    ) || bolaoData?.profiles?.plano === "premium" || bolaoData?.profiles?.plano === "premium_pro";
    const maxCapacity = hasPremiumMember ? PREMIUM_MAX_PARTICIPANTES : FREE_MAX_PARTICIPANTES;
    if (currentCount >= maxCapacity) {
      toast.error(`Este grupo está lotado! Limite de ${maxCapacity} participantes.${!hasPremiumMember ? " Se alguém do grupo fizer upgrade para Premium, o limite sobe para 50!" : ""}`);
      return false;
    }
    return true;
  };

  const handleClick = async (banner: BannerData) => {
    if (clickBlocked) return;

    if (!banner.bolao_id && banner.link) {
      const publicRoutes = ["/auth", "/quiz", "/planos", "/ao-vivo", "/home"];
      const isPublicRoute = publicRoutes.some((r) => banner.link!.startsWith(r));
      if (!user && !isPublicRoute) {
        navigate("/auth?modo=cadastro");
      } else {
        navigate(banner.link);
      }
      return;
    }

    if (!user && banner.bolao_id) { navigate("/auth?modo=cadastro"); return; }
    if (!banner.bolao_id || !user) { if (!user) navigate("/auth?modo=cadastro"); return; }

    const jaParticipa = userBolaoIds.has(banner.bolao_id);
    if (jaParticipa) { navigate(`/bolao/${banner.bolao_id}`); return; }

    setJoining(banner.id);
    try {
      if (!(await checkBolaoCapacity(banner.bolao_id))) {
        setJoining(null);
        return;
      }

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

  // ── Render: Modo POSTER (imagem completa) ──
  const renderPoster = (banner: BannerData) => {
    const mobileImg = banner.imagem_mobile_url || banner.imagem_url || "";
    return (
      <div
        onClick={() => handleClick(banner)}
        className="relative overflow-hidden rounded-2xl cursor-pointer group"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
      >
        {/* Desktop */}
        <img
          src={banner.imagem_url || ""}
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

  // ── Render: Modo BACKGROUND (imagem fundo + conteúdo) ──
  const renderBackground = (banner: BannerData) => {
    const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
    const titleColor = banner.cor_texto || estiloConfig.titleColor;

    return (
      <div
        onClick={() => !joining && handleClick(banner)}
        className={`relative overflow-hidden rounded-2xl cursor-pointer group aspect-square sm:aspect-[12/5] ${joining === banner.id ? "pointer-events-none opacity-80" : ""}`}
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      >
        {/* Imagem de fundo */}
        <img
          src={banner.imagem_fundo_url || ""}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Overlay escuro para legibilidade */}
        <div className="absolute inset-0 bg-black/55" />
        {/* Gradiente embaixo para CTA */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />

        <div className="relative z-10 flex flex-col items-center text-center px-5 py-6">
          <div className="text-5xl mb-2 drop-shadow-lg">{banner.emoji}</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-lg"
            style={{ color: titleColor, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            {banner.titulo}
          </h2>
          {banner.subtitulo && (
            <p className="text-sm font-semibold mt-1.5 tracking-wide text-white/90 drop-shadow">
              {banner.subtitulo}
            </p>
          )}
          {banner.badge_texto && (
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/20">
              <span className="text-xs text-white/80">⏳</span>
              <span className="text-xs font-bold text-white/90">
                {banner.bolao_id && userBolaoIds.has(banner.bolao_id) ? "Você já está participando!" : banner.badge_texto}
              </span>
            </div>
          )}
          <button className="mt-4 w-full max-w-xs h-12 flex items-center justify-center gap-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all group-hover:scale-[1.02] group-hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", color: "white", boxShadow: "0 4px 16px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>
            {joining === banner.id ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
            ) : (
              <>
                {banner.bolao_id && userBolaoIds.has(banner.bolao_id)
                  ? banner.cta_texto_participando
                  : banner.cta_texto}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ── Render: Modo NORMAL (gradiente) ──
  const renderNormal = (banner: BannerData) => {
    const jaParticipa = banner.bolao_id ? userBolaoIds.has(banner.bolao_id) : false;
    const isJoining = joining === banner.id;
    const estiloConfig = ESTILOS[banner.estilo] || ESTILOS.premium;
    const bgStyle = banner.cor_fundo || estiloConfig.bg;
    const titleColor = banner.cor_texto || estiloConfig.titleColor;

    return (
      <div
        onClick={() => !isJoining && handleClick(banner)}
        className={`relative overflow-hidden rounded-2xl cursor-pointer group aspect-square sm:aspect-[12/5] ${isJoining ? "pointer-events-none opacity-80" : ""}`}
        style={{
          background: bgStyle,
          border: `1px solid ${estiloConfig.badgeBorder}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.1)",
        }}
      >
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 60%)" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.08) 30px, rgba(255,255,255,0.08) 31px)" }} />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 py-6 h-full">
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
    );
  };

  // ── Render: Modo HÍBRIDO (imagem mobile + gradiente desktop) ──
  const renderHybrid = (banner: BannerData) => (
    <div onClick={() => handleClick(banner)} className="relative overflow-hidden rounded-2xl cursor-pointer group">
      {/* Mobile: imagem poster */}
      <img
        src={banner.imagem_mobile_url || ""}
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

  // ── Decidir qual modo renderizar ──
  const renderBanner = (banner: BannerData) => {
    if (banner.imagem_url) return renderPoster(banner);
    if (!banner.imagem_url && banner.imagem_mobile_url) return renderHybrid(banner);
    if (banner.imagem_fundo_url) return renderBackground(banner);
    return renderNormal(banner);
  };

  return (
    <div className="relative mb-4">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar select-none"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: banners.length > 1 ? "grab" : undefined,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
      >
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

export default DynamicBanner;
