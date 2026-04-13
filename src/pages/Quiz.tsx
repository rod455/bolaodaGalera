import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Lock, Target, Shield, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "@/hooks/useUserPlan";
import SEOHead from "@/components/SEOHead";
import { PLAY_STORE_URL, APP_STORE_URL } from "@/lib/constants";
// Quiz data imports removed — hub no longer previews questions

// Dias ate a Copa (11 Jun 2026)
const COPA_DATE = new Date("2026-06-11T00:00:00Z");
const getDaysUntilCopa = () => Math.max(0, Math.ceil((COPA_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

// Quizzes futuros (Em Breve)
const FUTURE_QUIZZES = [
  { emoji: "🎯", title: "Qual tipo de palpiteiro você é?", desc: "Analista, sortudo, torcedor ou o social?", icon: Target },
  { emoji: "🌎", title: "Em qual país-sede você estaria?", desc: "EUA, México ou Canadá?", icon: MapPin },
];

const Quiz = () => {
  const navigate = useNavigate();
  const { plano } = useUserPlan();
  const isPremium = plano === "premium" || plano === "premium_pro";
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const diasCopa = getDaysUntilCopa();

  const selecaoRef = useRef<HTMLDivElement>(null);
  const lendaRef = useRef<HTMLDivElement>(null);
  const jogadorRef = useRef<HTMLDivElement>(null);

  const toggleQuiz = (id: string) => {
    const isOpening = expandedQuiz !== id;
    setExpandedQuiz(isOpening ? id : null);
    if (isOpening) {
      const refs: Record<string, React.RefObject<HTMLDivElement>> = { selecao: selecaoRef, lenda: lendaRef, jogador: jogadorRef };
      setTimeout(() => {
        refs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
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
      <div ref={selecaoRef} className="rounded-2xl overflow-hidden shadow-md border border-copa-green-200">
        <button
          onClick={() => toggleQuiz("selecao")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}
        >
          <span className="text-3xl flex-shrink-0">⚽</span>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", lineHeight: 1, color: "#fff" }}>
              Para qual seleção <span style={{ color: "#facc15" }}>você seria convocado?</span>
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">48 seleções · 10 perguntas · Copa 2026</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ${expandedQuiz === "selecao" ? "rotate-180" : ""}`} />
        </button>

        {expandedQuiz === "selecao" && (
          <div className="px-4 py-5 space-y-4 text-center" style={{ background: "linear-gradient(160deg, #14532d 0%, #166534 30%, #15803d 70%, #14532d 100%)" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest mx-auto"
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

            {/* Por que fazer o quiz? */}
            <div>
              <h4 className="mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.2rem,4vw,1.6rem)", color: "#fff" }}>
                Por que fazer <span style={{ color: "#facc15" }}>o quiz?</span>
              </h4>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,.55)" }}>
                Não é só curiosidade. É uma forma de descobrir seu estilo de jogo — e de desafiar seus amigos do bolão.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ico: "🌍", t: "48 seleções reais", s: "Todas as seleções classificadas para a Copa 2026." },
                  { ico: "🎯", t: "Algoritmo de perfil", s: "Suas respostas criam um perfil único. Não tem como 'acertar'." },
                  { ico: "💬", t: "Compartilhe o resultado", s: "Envie para o grupo do bolão e veja quem discorda." },
                  { ico: "🏆", t: "Entre no bolão", s: "Após o quiz, entre no bolão da Copa e palpite em todos os 104 jogos." },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3 text-left"
                    style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.075)" }}>
                    <div className="text-lg mb-1">{c.ico}</div>
                    <p className="text-xs font-bold text-white mb-0.5">{c.t}</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,.5)" }}>{c.s}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => navigate("/quiz/selecao?start=true")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              ⚽ Começar o Quiz — Grátis
            </button>

            {!isPremium && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.38)" }}>
                Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
              </p>
            )}

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {["M", "J", "A", "R", "+"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold -ml-1 first:ml-0"
                    style={{ background: "#15803d", border: "2px solid #14532d", color: "#fff" }}>{l}</div>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
                <strong style={{ color: "#facc15" }}>+5.400 pessoas</strong> já fizeram o quiz hoje
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Quiz Lendas — Faixa colapsável ═══ */}
      <div ref={lendaRef} className="rounded-2xl overflow-hidden shadow-md border border-copa-gold-200">
        <button
          onClick={() => toggleQuiz("lenda")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #1a3a1a 50%, #2d1a00 100%)" }}
        >
          <span className="text-3xl flex-shrink-0">👑</span>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", lineHeight: 1, color: "#fff" }}>
              Qual lenda da Copa <span style={{ color: "#facc15" }}>você seria?</span>
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">25 lendas · 10 perguntas · Pelé, Messi, Zidane...</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ${expandedQuiz === "lenda" ? "rotate-180" : ""}`} />
        </button>

        {expandedQuiz === "lenda" && (
          <div className="px-4 py-5 space-y-4 text-center" style={{ background: "linear-gradient(160deg, #14532d 0%, #1a3a1a 40%, #2d1a00 100%)" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest mx-auto"
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

            {/* Por que fazer o quiz? */}
            <div>
              <h4 className="mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.2rem,4vw,1.6rem)", color: "#fff" }}>
                Por que fazer <span style={{ color: "#facc15" }}>o quiz?</span>
              </h4>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,.55)" }}>
                Descubra qual lenda do futebol mundial tem o mesmo estilo que você — e desafie seus amigos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ico: "👑", t: "25 lendas reais", s: "De Pelé a Mbappé — os maiores da história das Copas." },
                  { ico: "🎯", t: "Algoritmo único", s: "Suas respostas definem seu perfil. Não tem como 'acertar'." },
                  { ico: "💬", t: "Compartilhe o resultado", s: "Manda pro grupo e veja quem é o Pelé da galera." },
                  { ico: "🏆", t: "Entre no bolão", s: "Após o quiz, entre no bolão da Copa e palpite nos jogos." },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3 text-left"
                    style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.075)" }}>
                    <div className="text-lg mb-1">{c.ico}</div>
                    <p className="text-xs font-bold text-white mb-0.5">{c.t}</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,.5)" }}>{c.s}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview lendas */}
            <div className="flex flex-wrap justify-center gap-1.5">
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

            <button onClick={() => navigate("/quiz/lenda?start=true")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              👑 Começar o Quiz — Grátis
            </button>

            {!isPremium && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.38)" }}>
                Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
              </p>
            )}

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {["M", "J", "A", "R", "+"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold -ml-1 first:ml-0"
                    style={{ background: "#15803d", border: "2px solid #14532d", color: "#fff" }}>{l}</div>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
                <strong style={{ color: "#facc15" }}>+3.200 pessoas</strong> já fizeram o quiz hoje
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Quiz Jogador — Faixa colapsável ═══ */}
      <div ref={jogadorRef} className="rounded-2xl overflow-hidden shadow-md border border-copa-green-200">
        <button
          onClick={() => toggleQuiz("jogador")}
          className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #0f3d1a 50%, #1a4a2e 100%)" }}
        >
          <span className="text-3xl flex-shrink-0">🏃</span>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", lineHeight: 1, color: "#fff" }}>
              Qual jogador <span style={{ color: "#facc15" }}>você seria na vida?</span>
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">20 posições · 7 perguntas · Com humor</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/60 flex-shrink-0 transition-transform duration-300 ${expandedQuiz === "jogador" ? "rotate-180" : ""}`} />
        </button>

        {expandedQuiz === "jogador" && (
          <div className="px-4 py-5 space-y-4 text-center" style={{ background: "linear-gradient(160deg, #14532d 0%, #0f3d1a 40%, #1a4a2e 100%)" }}>
            <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest mx-auto"
              style={{ background: "rgba(250,204,21,.14)", border: "1px solid rgba(250,204,21,.38)", color: "#facc15" }}>
              ⚽ 20 posições · Futebol da vida real
            </div>

            <h3 className="leading-[0.9]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem,8vw,3.5rem)", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.4)" }}>
              Qual jogador<br />
              <span style={{ color: "#facc15" }}>você seria na vida?</span>
            </h3>

            <p className="leading-relaxed text-sm" style={{ color: "rgba(255,255,255,.72)" }}>
              7 perguntas revelam qual das <strong className="text-white">20 posições do futebol</strong> combina com o seu jeito na vida real.
            </p>

            <div>
              <h4 className="mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.2rem,4vw,1.6rem)", color: "#fff" }}>
                Centroavante, goleiro ou <span style={{ color: "#facc15" }}>falso 9?</span>
              </h4>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,.55)" }}>
                Descubra se você é o centroavante que some a semana e aparece na sexta, ou o goleiro que salva tudo na última hora.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ico: "🎯", t: "20 posições únicas", s: "Do centroavante ao lateral que virou centroavante." },
                  { ico: "😂", t: "Humor garantido", s: "Cada resultado é uma descrição engraçada da sua personalidade." },
                  { ico: "💬", t: "Compartilhe e compare", s: "Manda pro grupo e veja quem é o volante destruidor." },
                  { ico: "⚡", t: "Rápido: 7 perguntas", s: "Quiz mais rápido — descubra sua posição em menos de 2 min." },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3 text-left"
                    style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.075)" }}>
                    <div className="text-lg mb-1">{c.ico}</div>
                    <p className="text-xs font-bold text-white mb-0.5">{c.t}</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,.5)" }}>{c.s}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {["🎯 Centroavante", "🧊 Zag. Elegante", "🌀 Falso 9", "😴 Goleiro Zen", "🤷 Coringa"].map((l, i) => (
                <span key={i} className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,.065)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(255,255,255,.78)" }}>
                  {l}
                </span>
              ))}
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)" }}>
                +15
              </span>
            </div>

            <button onClick={() => navigate("/quiz/jogador?start=true")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "#facc15", color: "#14532d", boxShadow: "0 8px 28px rgba(250,204,21,.33)" }}>
              ⚽ Começar o Quiz — Grátis
            </button>

            {!isPremium && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.38)" }}>
                Grátis com anúncio · <button onClick={() => navigate("/planos")} className="underline" style={{ color: "#facc15" }}>Premium sem anúncios</button>
              </p>
            )}

            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {["M", "J", "A", "R", "+"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold -ml-1 first:ml-0"
                    style={{ background: "#15803d", border: "2px solid #14532d", color: "#fff" }}>{l}</div>
                ))}
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>
                <strong style={{ color: "#facc15" }}>+1.500 pessoas</strong> já descobriram sua posição
              </span>
            </div>
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

      {/* CTA Baixar app — Android */}
      {!Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent) && (
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener"
          className="flex items-center justify-center gap-2 w-full h-12 bg-copa-gold-400 hover:bg-copa-gold-500 text-copa-green-800 font-black rounded-xl shadow-lg text-sm transition-colors">
          <ChevronRight className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 -ml-3" />
          Quero todos os quizzes — Baixar grátis
        </a>
      )}
      {/* CTA Baixar app — iOS Safari */}
      {!Capacitor.isNativePlatform() && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
        <a href={APP_STORE_URL} target="_blank" rel="noopener"
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
