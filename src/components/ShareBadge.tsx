import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { X, Download } from "lucide-react";
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

// Pré-carregar logo como base64 para evitar CORS no html2canvas
let cachedLogoBase64: string | null = null;
function preloadLogo(): Promise<string> {
  if (cachedLogoBase64) return Promise.resolve(cachedLogoBase64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        cachedLogoBase64 = canvas.toDataURL("image/png");
        resolve(cachedLogoBase64);
      } catch {
        resolve(LOGO_URL);
      }
    };
    img.onerror = () => resolve(LOGO_URL);
    img.src = LOGO_URL;
  });
}

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
  const [fraseCustom, setFraseCustom] = useState("");
  const [logoSrc, setLogoSrc] = useState(LOGO_URL);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Pré-carregar logo como base64 para evitar CORS no html2canvas
  useEffect(() => {
    if (open) preloadLogo().then(setLogoSrc);
  }, [open]);

  if (!open) return null;

  const me = ranking.find((r) => r.isCurrentUser);
  const top3 = ranking.filter((r) => r.pos <= 3).sort((a, b) => a.pos - b.pos);
  const rankLabel = rankingType === "geral" ? "Ranking Geral" : `Ranking ${rodadaLabel || "Rodada"}`;

  const captureImage = async (): Promise<Blob> => {
    const canvas = await html2canvas(badgeRef.current!, {
      backgroundColor: "#1B5E20",
      scale: 3,
      useCORS: false,
      allowTaint: false,
      logging: false,
    });
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob retornou null"));
      }, "image/png")
    );
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  const saveImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bolao-${bolaoNome.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getShareText = () => {
    const defaultText = me
      ? `🏆 Estou em ${getOrdinal(me.pos)} lugar no bolão "${bolaoNome}"!`
      : `🏆 Confira o ranking do bolão "${bolaoNome}"!`;
    const phrase = fraseCustom.trim() ? `\n\n${fraseCustom.trim()}` : "";
    return `${defaultText}${phrase}\n\nVem competir comigo: https://www.bolaonacopa.com.br`;
  };

  const handleSave = async () => {
    if (!badgeRef.current) return;
    setSharing(true);
    try {
      const blob = await captureImage();
      saveImage(blob);
      toast.success("Imagem salva!");
    } catch (err) {
      toast.error("Erro ao gerar imagem");
    } finally {
      setSharing(false);
    }
  };

  const saveToNativeFile = async (blob: Blob): Promise<string | null> => {
    try {
      const dataUrl = await blobToDataUrl(blob);
      const base64Data = dataUrl.split(",")[1];
      const fileName = `ranking-bolao-${Date.now()}.png`;
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });
      return saved.uri;
    } catch {
      return null;
    }
  };

  const handleWhatsApp = async () => {
    if (!badgeRef.current) return;
    setSharing(true);
    try {
      const blob = await captureImage();
      const text = getShareText();
      const encoded = encodeURIComponent(text);

      if (Capacitor.isNativePlatform()) {
        // Salvar imagem e compartilhar via share sheet com files[]
        const fileUri = await saveToNativeFile(blob);
        if (fileUri) {
          await Share.share({
            title: `Ranking - ${bolaoNome}`,
            text,
            files: [fileUri],
            dialogTitle: "Enviar para WhatsApp",
          });
        } else {
          // Fallback: salvar imagem + abrir WhatsApp direto
          saveImage(blob);
          toast.success("Imagem salva na galeria! Anexe no WhatsApp.");
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, Capacitor.isNativePlatform() ? "_system" : "_blank");
        }
        return;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const file = new File([blob], "ranking-bolao.png", { type: "image/png" });
        const shareData = { files: [file], text };
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
        saveImage(blob);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, Capacitor.isNativePlatform() ? "_system" : "_blank");
        toast.success("Imagem salva! Anexe no WhatsApp.");
        return;
      }

      // Desktop web
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Imagem copiada! Cole com Ctrl+V no WhatsApp.");
      } catch {
        saveImage(blob);
        toast.success("Imagem salva! Cole no WhatsApp.");
      }
      window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const encoded = encodeURIComponent(getShareText());
        if (Capacitor.isNativePlatform()) {
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, Capacitor.isNativePlatform() ? "_system" : "_blank");
        } else {
          toast.error("Erro ao gerar imagem. Tente novamente.");
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleInstagram = async () => {
    if (!badgeRef.current) return;
    setSharing(true);
    try {
      const blob = await captureImage();

      if (Capacitor.isNativePlatform()) {
        const fileUri = await saveToNativeFile(blob);
        if (fileUri) {
          // Share com files[] — Android filtra para apps que aceitam imagem (Instagram aparece)
          await Share.share({
            files: [fileUri],
            dialogTitle: "Enviar para Instagram",
          });
        } else {
          saveImage(blob);
          toast.success("Imagem salva na galeria! Abra o Instagram e poste.");
        }
        return;
      }

      // Web: salvar imagem e orientar
      saveImage(blob);
      toast.success("Imagem salva! Abra o Instagram e poste da galeria.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        if (Capacitor.isNativePlatform()) {
          toast.success("Abra o Instagram e poste da galeria.");
        } else {
          toast.error("Erro ao gerar imagem. Tente novamente.");
        }
      }
    } finally {
      setSharing(false);
    }
  };

  // ── Badge com foto ──
  const BadgeComFoto = () => {
    if (!me) return <p className="text-center text-sm text-muted-foreground py-8">Você ainda não está no ranking.</p>;
    return (
      <div className="w-[280px] h-[280px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)" }}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2 z-10">
          <img src={logoSrc} alt="" className="w-5 h-5" />
          <span className="text-white/80 font-bold text-[10px] tracking-wide uppercase">Bolão na Copa</span>
        </div>
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-copa-gold-400 flex items-center justify-center text-xl font-black text-white z-10">
          {me.avatar}
        </div>
        {/* Name */}
        <p className="text-white font-bold text-sm mt-1.5 z-10">{me.nome}</p>
        {/* Position */}
        <div className="flex items-center gap-1.5 mt-0.5 z-10">
          <span className="text-2xl">{getMedalEmoji(me.pos) || "🏅"}</span>
          <span className="text-white font-black text-2xl">{getOrdinal(me.pos)}</span>
          <span className="text-white/70 font-bold text-sm">lugar</span>
        </div>
        {/* Bolão name */}
        <div className="mt-2 z-10 text-center px-4">
          <p className="text-copa-gold-400 font-bold text-[10px] truncate max-w-[250px]">{bolaoNome}</p>
          <p className="text-white/60 text-[8px] mt-0.5">{rankLabel} &bull; {me.pontos} pts</p>
        </div>
        {/* Footer */}
        <div className="absolute bottom-2 flex items-center gap-1 z-10">
          <span className="text-white/40 text-[8px]">bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  // ── Badge sem foto ──
  const BadgeSemFoto = () => {
    if (!me) return <p className="text-center text-sm text-muted-foreground py-8">Você ainda não está no ranking.</p>;
    return (
      <div className="w-[280px] h-[280px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0D3B1A 0%, #1B5E20 50%, #2E7D32 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1 z-10">
          <img src={logoSrc} alt="" className="w-5 h-5" />
          <span className="text-white/80 font-bold text-[10px] tracking-wide uppercase">Bolão na Copa</span>
        </div>
        {/* Big medal + position */}
        <span className="text-5xl z-10">{getMedalEmoji(me.pos) || "🏅"}</span>
        <span className="text-white font-black text-4xl mt-0.5 z-10">{getOrdinal(me.pos)}</span>
        <span className="text-white/60 font-bold text-sm z-10">lugar</span>
        {/* Name + points */}
        <p className="text-white font-bold text-sm mt-2 z-10">{me.nome}</p>
        <p className="text-copa-gold-400 font-bold text-xs z-10">{me.pontos} pontos</p>
        {/* Bolão */}
        <div className="mt-1.5 z-10 text-center px-4">
          <p className="text-white/50 text-[10px] truncate max-w-[250px]">{bolaoNome}</p>
          <p className="text-white/40 text-[8px]">{rankLabel}</p>
        </div>
        <div className="absolute bottom-2 z-10">
          <span className="text-white/40 text-[8px]">bolaonacopa.com.br</span>
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
      <div className="w-[280px] h-[280px] rounded-2xl overflow-hidden relative flex flex-col items-center"
        style={{ background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Header */}
        <div className="flex items-center gap-1.5 mt-3 z-10">
          <img src={logoSrc} alt="" className="w-4 h-4" />
          <span className="text-white/80 font-bold text-[9px] tracking-wide uppercase">Bolão na Copa</span>
        </div>
        <p className="text-copa-gold-400 font-bold text-[10px] mt-0.5 z-10 truncate max-w-[250px] px-3 text-center">{bolaoNome}</p>
        {/* Podium */}
        <div className="flex items-end justify-center gap-2 mt-auto mb-1.5 z-10 w-full px-3">
          {/* 2nd place */}
          <div className="flex flex-col items-center w-[80px]">
            <span className="text-lg mb-0.5">🥈</span>
            <div className="w-9 h-9 rounded-full bg-white/15 border-2 border-gray-300 flex items-center justify-center text-xs font-black text-white">
              {second?.avatar || "?"}
            </div>
            <p className="text-white text-[8px] font-bold mt-0.5 truncate w-full text-center">{second?.nome || "-"}</p>
            <p className="text-white/60 text-[7px] font-bold">{second?.pontos ?? 0} pts</p>
            <div className="w-full h-10 bg-white/10 rounded-t-lg mt-0.5 flex items-center justify-center">
              <span className="text-white/40 font-black text-sm">2º</span>
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center w-[80px]">
            <span className="text-xl mb-0.5">🥇</span>
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-copa-gold-400 flex items-center justify-center text-sm font-black text-white">
              {first?.avatar || "?"}
            </div>
            <p className="text-white text-[8px] font-bold mt-0.5 truncate w-full text-center">{first?.nome || "-"}</p>
            <p className="text-copa-gold-400 text-[8px] font-bold">{first?.pontos ?? 0} pts</p>
            <div className="w-full h-16 bg-white/15 rounded-t-lg mt-0.5 flex items-center justify-center">
              <span className="text-white/50 font-black text-lg">1º</span>
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center w-[80px]">
            <span className="text-lg mb-0.5">🥉</span>
            <div className="w-9 h-9 rounded-full bg-white/15 border-2 border-amber-700 flex items-center justify-center text-xs font-black text-white">
              {third?.avatar || "?"}
            </div>
            <p className="text-white text-[8px] font-bold mt-0.5 truncate w-full text-center">{third?.nome || "-"}</p>
            <p className="text-white/60 text-[7px] font-bold">{third?.pontos ?? 0} pts</p>
            <div className="w-full h-8 bg-white/10 rounded-t-lg mt-0.5 flex items-center justify-center">
              <span className="text-white/40 font-black text-sm">3º</span>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="w-full bg-black/20 py-1.5 flex items-center justify-center gap-2 z-10">
          <span className="text-white/50 text-[8px]">{rankLabel}</span>
          <span className="text-white/30 text-[8px]">&bull;</span>
          <span className="text-white/50 text-[8px]">bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "foto" as const, label: "Com Foto" },
    { id: "sem-foto" as const, label: "Sem Foto" },
    { id: "podio" as const, label: "Pódio" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-[380px] w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

        {/* Custom phrase */}
        <div className="px-4 pb-3">
          <input
            type="text"
            value={fraseCustom}
            onChange={(e) => setFraseCustom(e.target.value)}
            placeholder="Escreva uma provocação para os amigos..."
            maxLength={120}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-copa-green-600 focus:border-transparent placeholder:text-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-2">
          <Button
            onClick={handleWhatsApp}
            disabled={sharing}
            className="flex-1 h-11 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold rounded-xl"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
          {Capacitor.isNativePlatform() && (
            <Button
              onClick={handleInstagram}
              disabled={sharing}
              className="flex-1 h-11 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white font-semibold rounded-xl"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={sharing}
            variant="outline"
            className="h-11 px-4 border-gray-300 font-semibold rounded-xl"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        {!Capacitor.isNativePlatform() && (
          <p className="text-[10px] text-center text-muted-foreground px-4 pb-3">
            Compartilhe com imagem pelo app!
            <a href="https://play.google.com/store/apps/details?id=com.bolaonacopa.app" target="_blank" rel="noopener" className="text-copa-green-600 font-semibold ml-1 hover:underline">
              Baixe na Google Play
            </a>
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ShareBadge;
