import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Lock, Globe, Target, Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "@/hooks/useUserPlan";
import SEOHead from "@/components/SEOHead";
import { PLAY_STORE_URL } from "@/lib/constants";
import { PERGUNTAS } from "@/lib/quiz-data";
import { PERGUNTAS_LENDA } from "@/lib/quiz-lenda-data";

// Dias ate a Copa (11 Jun 2026)
const COPA_DATE = new Date("2026-06-11T00:00:00Z");
const getDaysUntilCopa = () => Math.max(0, Math.ceil((COPA_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

// Quizzes futuros (Em Breve)
const FUTURE_QUIZZES = [
  { emoji: "🎯", title: "Qual tipo de palpiteiro você é?", desc: "Analista, sortudo, torcedor ou o social?", icon: Target },
  { emoji: "🏟️", title: "Qual posição você joga na vida?", desc: "Atacante, goleiro, meia ou zagueiro?", icon: Shield },
  { emoji: "🌎", title: "Em qual país-sede você estaria?", desc: "EUA, México ou Canadá?", icon: MapPin },
];

const Quiz = () => {
  const navigate = useNavigate();
  const { plano } = useUserPlan();
  const isPremium = plano === "premium" || plano === "premium_pro";
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const diasCopa = getDaysUntilCopa();

  const toggleQuiz = (id: string) => {
    setExpandedQuiz(expandedQuiz === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <SEOHead
        title="Quiz na Copa — Descubra sua seleção, sua lenda e mais"
        description="Quizzes interativos sobre a Copa do Mundo 2026. Descubra para qual seleção você seria convocado, qual lenda do futebol você seria e muito mais."
        path="/quiz"
        keywords="quiz copa do mundo, quiz selecao, quiz lenda futebol, bolao na copa quiz"
      />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Quiz na Copa</h2>
      </div>

      {/* ═══ Quiz Seleções — Faixa colapsável ═══ */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-copa-green-200">
        <button
          onClick={() => toggleQuiz("selecao")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-copa-green-50/50"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}
        >
          <span className="text-3xl flex-shrink-0">⚽</span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">Para qual seleção você seria convocado?</p>
            <p className="text-[11px] text-white/60">48 seleções · 10 perguntas · Copa 2026</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ${expandedQuiz === "selecao" ? "rotate-180" : ""}`} />
        </button>

        {expandedQuiz === "selecao" && (
          <div className="px-4 py-5 space-y-4" style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 30%, #15803d 70%, #14532d 100%)" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              ⚽ 48 seleções · Copa 2026
            </div>

            <h3 className="leading-[0.9]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,8vw,3.5rem)", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.4)" }}>
              Para qual seleção<br />
              <span style={{ color: "#facc15" }}>você seria convocado?</span>
            </h3>

            <p className="leading-relaxed text-sm" style={{ color: "rgba(255,255,255,.72)" }}>
              10 perguntas revelam qual das <strong className="text-white">48 seleções</strong> da Copa 2026 combina com o seu jeito de jogar.
            </p>

            {/* Preview perguntas */}
            <div className="space-y-2">
              {PERGUNTAS.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-left rounded-xl px-3.5 py-2.5"
                  style={{ background: "rgba(255,255,255,.048)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "rgba(250,204,21,.14)", border: "1.5px solid rgba(250,204,21,.38)", color: "#facc15" }}>{i + 1}</div>
                  <span className="text-xs font-medium flex-1" style={{ color: "rgba(255,255,255,.82)" }}>{p.texto}</span>
                  <span className="text-xs opacity-40 flex-shrink-0">{i === 0 ? "🔓" : "🔒"}</span>
                </div>
              ))}
            </div>

            <button onClick={() => navigate("/quiz/selecao")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              Começar o Quiz <ChevronRight className="w-4 h-4" />
            </button>

            {!isPremium && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.38)" }}>
                Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ Quiz Lendas — Faixa colapsável ═══ */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-copa-gold-200">
        <button
          onClick={() => toggleQuiz("lenda")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-copa-gold-50/50"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #1a3a1a 50%, #2d1a00 100%)" }}
        >
          <span className="text-3xl flex-shrink-0">👑</span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">Qual lenda da Copa você seria?</p>
            <p className="text-[11px] text-white/60">25 lendas · 10 perguntas · Pelé, Messi, Zidane...</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ${expandedQuiz === "lenda" ? "rotate-180" : ""}`} />
        </button>

        {expandedQuiz === "lenda" && (
          <div className="px-4 py-5 space-y-4" style={{ background: "linear-gradient(160deg, #14532d 0%, #1a3a1a 40%, #2d1a00 100%)" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              👑 25 lendas · Copa do Mundo
            </div>

            <h3 className="leading-[0.9]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,8vw,3.5rem)", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.4)" }}>
              Qual lenda da Copa<br />
              <span style={{ color: "#facc15" }}>você seria?</span>
            </h3>

            <p className="leading-relaxed text-sm" style={{ color: "rgba(255,255,255,.72)" }}>
              10 perguntas revelam qual das <strong className="text-white">25 maiores lendas</strong> do futebol combina com o seu estilo.
            </p>

            {/* Preview perguntas */}
            <div className="space-y-2">
              {PERGUNTAS_LENDA.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-left rounded-xl px-3.5 py-2.5"
                  style={{ background: "rgba(255,255,255,.048)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "rgba(250,204,21,.14)", border: "1.5px solid rgba(250,204,21,.38)", color: "#facc15" }}>{i + 1}</div>
                  <span className="text-xs font-medium flex-1" style={{ color: "rgba(255,255,255,.82)" }}>{p.texto}</span>
                  <span className="text-xs opacity-40 flex-shrink-0">{i === 0 ? "🔓" : "🔒"}</span>
                </div>
              ))}
            </div>

            {/* Preview lendas */}
            <div className="flex flex-wrap gap-1.5">
              {["👑 Pelé", "⚡ Ronaldo", "🐐 Messi", "🔥 Maradona", "🎩 Zidane"].map((l, i) => (
                <span key={i} className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,.065)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.78)" }}>
                  {l}
                </span>
              ))}
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)" }}>
                +20
              </span>
            </div>

            <button onClick={() => navigate("/quiz/lenda")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              Começar o Quiz <ChevronRight className="w-4 h-4" />
            </button>

            {!isPremium && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.38)" }}>
                Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Countdown Copa */}
      {diasCopa > 0 && (
        <div className="flex items-center justify-center gap-2 bg-copa-gold-50 border border-copa-gold-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-copa-gold-700">
          🏆 <strong>Copa começa em {diasCopa} dias.</strong> Faça o quiz e entre no bolão antes de começar!
        </div>
      )}

      {/* Outros quizzes (Em Breve) */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">
          Em breve
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
          Quero todos os quizzes — Baixar grátis
        </a>
      )}

      {/* Social proof */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
        <div className="flex -space-x-1.5">
          {["M", "J", "A", "R"].map((l, i) => (
            <div key={i} className="w-6 h-6 bg-copa-green-100 rounded-full flex items-center justify-center text-[10px] font-bold text-copa-green-600 border-2 border-background">{l}</div>
          ))}
        </div>
        <span><strong className="text-copa-gold-500">+8.600 quizzes</strong> respondidos hoje</span>
      </div>
    </div>
  );
};

export default Quiz;
