import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RankingEntry } from "@/lib/types";

interface ShareBadgeProps {
  open: boolean;
  onClose: () => void;
  bolaoNome: string;
  ranking: RankingEntry[];
  rankingType: "geral" | "rodada";
  rodadaLabel?: string;
}

const LOGO_URL = "https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png";

const getMedalEmoji = (pos: number) => {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return "";
};

const getOrdinal = (pos: number) => `${pos}º`;

const ShareBadge = ({ open, onClose, bolaoNome, ranking, rankingType, rodadaLabel }: ShareBadgeProps) => {
  const [tab, setTab] = useState<"foto" | "sem-foto" | "podio">("foto");
  const [sharing, setSharing] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const me = ranking.find((r) => r.isCurrentUser);
  const top3 = ranking.filter((r) => r.pos <= 3).sort((a, b) => a.pos - b.pos);
  const rankLabel = rankingType === "geral" ? "Ranking Geral" : `Ranking ${rodadaLabel || "Rodada"}`;

  const captureAndShare = async (method: "whatsapp" | "save") => {
    if (!badgeRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );

      if (method === "save") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bolao-${bolaoNome.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem salva!");
      } else {
        // WhatsApp share
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], "ranking-bolao.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Ranking - ${bolaoNome}`,
            });
            return;
          }
        }
        // Fallback: save and open WhatsApp with text
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bolao-${bolaoNome.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        const text = me
          ? `🏆 Estou em ${getOrdinal(me.pos)} lugar no bolão "${bolaoNome}"! Vem competir comigo: https://www.bolaonacopa.com.br`
          : `🏆 Confira o ranking do bolão "${bolaoNome}"! https://www.bolaonacopa.com.br`;
        const encoded = encodeURIComponent(text);
        if (Capacitor.isNativePlatform()) {
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_system");
        } else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.location.href = `whatsapp://send?text=${encoded}`;
        } else {
          window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
        }
        toast.success("Imagem salva! Cole no WhatsApp.");
      }
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao gerar imagem");
    } finally {
      setSharing(false);
    }
  };

  // ── Badge com foto ──
  const BadgeComFoto = () => {
    if (!me) return <p className="text-center text-sm text-muted-foreground py-8">Você ainda não está no ranking.</p>;
    return (
      <div className="w-[320px] h-[320px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)" }}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 z-10">
          <img src={LOGO_URL} alt="" className="w-6 h-6" crossOrigin="anonymous" />
          <span className="text-white/80 font-bold text-xs tracking-wide uppercase">Bolão na Copa</span>
        </div>
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-copa-gold-400 flex items-center justify-center text-2xl font-black text-white z-10">
          {me.avatar}
        </div>
        {/* Name */}
        <p className="text-white font-bold text-base mt-2 z-10">{me.nome}</p>
        {/* Position */}
        <div className="flex items-center gap-2 mt-1 z-10">
          <span className="text-3xl">{getMedalEmoji(me.pos) || "🏅"}</span>
          <span className="text-white font-black text-3xl">{getOrdinal(me.pos)}</span>
          <span className="text-white/70 font-bold text-lg">lugar</span>
        </div>
        {/* Bolão name */}
        <div className="mt-3 z-10 text-center px-6">
          <p className="text-copa-gold-400 font-bold text-xs truncate max-w-[280px]">{bolaoNome}</p>
          <p className="text-white/60 text-[10px] mt-0.5">{rankLabel} &bull; {me.pontos} pts</p>
        </div>
        {/* Footer */}
        <div className="absolute bottom-3 flex items-center gap-1 z-10">
          <span className="text-white/40 text-[9px]">bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  // ── Badge sem foto ──
  const BadgeSemFoto = () => {
    if (!me) return <p className="text-center text-sm text-muted-foreground py-8">Você ainda não está no ranking.</p>;
    return (
      <div className="w-[320px] h-[320px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0D3B1A 0%, #1B5E20 50%, #2E7D32 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 z-10">
          <img src={LOGO_URL} alt="" className="w-6 h-6" crossOrigin="anonymous" />
          <span className="text-white/80 font-bold text-xs tracking-wide uppercase">Bolão na Copa</span>
        </div>
        {/* Big medal + position */}
        <span className="text-6xl z-10">{getMedalEmoji(me.pos) || "🏅"}</span>
        <span className="text-white font-black text-5xl mt-1 z-10">{getOrdinal(me.pos)}</span>
        <span className="text-white/60 font-bold text-lg z-10">lugar</span>
        {/* Name + points */}
        <p className="text-white font-bold text-base mt-3 z-10">{me.nome}</p>
        <p className="text-copa-gold-400 font-bold text-sm z-10">{me.pontos} pontos</p>
        {/* Bolão */}
        <div className="mt-2 z-10 text-center px-6">
          <p className="text-white/50 text-xs truncate max-w-[280px]">{bolaoNome}</p>
          <p className="text-white/40 text-[10px]">{rankLabel}</p>
        </div>
        <div className="absolute bottom-3 z-10">
          <span className="text-white/40 text-[9px]">bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  // ── Badge pódio ──
  const BadgePodio = () => {
    if (top3.length === 0) return <p className="text-center text-sm text-muted-foreground py-8">Ranking ainda sem dados.</p>;
    const first = top3.find((r) => r.pos === 1);
    const second = top3.find((r) => r.pos === 2);
    const third = top3.find((r) => r.pos === 3);
    return (
      <div className="w-[320px] h-[320px] rounded-2xl overflow-hidden relative flex flex-col items-center"
        style={{ background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Header */}
        <div className="flex items-center gap-2 mt-4 z-10">
          <img src={LOGO_URL} alt="" className="w-5 h-5" crossOrigin="anonymous" />
          <span className="text-white/80 font-bold text-[10px] tracking-wide uppercase">Bolão na Copa</span>
        </div>
        <p className="text-copa-gold-400 font-bold text-xs mt-1 z-10 truncate max-w-[280px] px-4 text-center">{bolaoNome}</p>
        {/* Podium */}
        <div className="flex items-end justify-center gap-3 mt-auto mb-2 z-10 w-full px-4">
          {/* 2nd place */}
          <div className="flex flex-col items-center w-24">
            <span className="text-2xl mb-1">🥈</span>
            <div className="w-12 h-12 rounded-full bg-white/15 border-2 border-gray-300 flex items-center justify-center text-base font-black text-white">
              {second?.avatar || "?"}
            </div>
            <p className="text-white text-[10px] font-bold mt-1 truncate w-full text-center">{second?.nome || "-"}</p>
            <p className="text-white/60 text-[9px] font-bold">{second?.pontos ?? 0} pts</p>
            <div className="w-full h-16 bg-white/10 rounded-t-lg mt-1 flex items-center justify-center">
              <span className="text-white/40 font-black text-xl">2º</span>
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center w-24">
            <span className="text-3xl mb-1">🥇</span>
            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-copa-gold-400 flex items-center justify-center text-lg font-black text-white">
              {first?.avatar || "?"}
            </div>
            <p className="text-white text-[11px] font-bold mt-1 truncate w-full text-center">{first?.nome || "-"}</p>
            <p className="text-copa-gold-400 text-[10px] font-bold">{first?.pontos ?? 0} pts</p>
            <div className="w-full h-24 bg-white/15 rounded-t-lg mt-1 flex items-center justify-center">
              <span className="text-white/50 font-black text-2xl">1º</span>
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center w-24">
            <span className="text-2xl mb-1">🥉</span>
            <div className="w-12 h-12 rounded-full bg-white/15 border-2 border-amber-700 flex items-center justify-center text-base font-black text-white">
              {third?.avatar || "?"}
            </div>
            <p className="text-white text-[10px] font-bold mt-1 truncate w-full text-center">{third?.nome || "-"}</p>
            <p className="text-white/60 text-[9px] font-bold">{third?.pontos ?? 0} pts</p>
            <div className="w-full h-12 bg-white/10 rounded-t-lg mt-1 flex items-center justify-center">
              <span className="text-white/40 font-black text-xl">3º</span>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="w-full bg-black/20 py-2 flex items-center justify-center gap-2 z-10">
          <span className="text-white/50 text-[9px]">{rankLabel}</span>
          <span className="text-white/30 text-[9px]">&bull;</span>
          <span className="text-white/50 text-[9px]">bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "foto" as const, label: "Com Foto" },
    { id: "sem-foto" as const, label: "Sem Foto" },
    { id: "podio" as const, label: "Pódio" },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-start justify-center pt-20 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-[380px] w-full mb-10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-sm">Compartilhar Ranking</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 bg-gray-50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-xs font-bold py-2 rounded-t-lg transition-all ${
                tab === t.id
                  ? "bg-white text-copa-green-700 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Badge preview */}
        <div className="flex justify-center p-4 bg-white">
          <div ref={badgeRef}>
            {tab === "foto" && <BadgeComFoto />}
            {tab === "sem-foto" && <BadgeSemFoto />}
            {tab === "podio" && <BadgePodio />}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <Button
            onClick={() => captureAndShare("whatsapp")}
            disabled={sharing}
            className="flex-1 h-11 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-xl"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
          <Button
            onClick={() => captureAndShare("save")}
            disabled={sharing}
            variant="outline"
            className="flex-1 h-11 border-gray-300 font-semibold rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareBadge;
