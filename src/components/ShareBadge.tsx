import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

interface WhatsAppSharePlugin {
  share(options: { fileUri: string; text?: string }): Promise<void>;
}
const WhatsAppShare = registerPlugin<WhatsAppSharePlugin>("WhatsAppShare");
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getShareBadgeUrl } from "@/lib/constants";
import type { RankingEntry } from "@/lib/types";

interface ShareBadgeProps {
  open: boolean;
  onClose: () => void;
  bolaoId: string;
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
const firstName = (nome: string) => nome.split(" ")[0];

const ShareBadge = ({ open, onClose, bolaoId, bolaoNome, ranking, rankingType, rodadaLabel }: ShareBadgeProps) => {
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
    const el = badgeRef.current!;
    const canvas = await html2canvas(el, {
      backgroundColor: "#1B5E20",
      scale: 3,
      useCORS: false,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      width: el.scrollWidth,
      height: el.scrollHeight,
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
    return `${defaultText}${phrase}\n\nVem competir comigo: ${getShareBadgeUrl(bolaoId)}`;
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
        const fileUri = await saveToNativeFile(blob);
        if (fileUri) {
          try {
            // Plugin nativo abre WhatsApp direto com imagem
            await WhatsAppShare.share({ fileUri, text });
          } catch {
            // Fallback: share sheet genérico
            await Share.share({ title: `Ranking - ${bolaoNome}`, text, files: [fileUri], dialogTitle: "Enviar para WhatsApp" });
          }
        } else {
          saveImage(blob);
          toast.success("Imagem salva! Anexe no WhatsApp.");
          window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_system");
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

  // ── Badge com foto (inline styles for html2canvas compatibility) ──
  const BadgeComFoto = () => {
    if (!me) return <p style={{ textAlign: "center", padding: "32px 0", fontSize: 14, color: "#999" }}>Você ainda não está no ranking.</p>;
    return (
      <div style={{ width: 280, height: 280, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)", position: "relative", paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <img src={logoSrc} alt="" style={{ width: 20, height: 20 }} />
          <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Bolão na Copa</span>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid #EAB308", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff" }}>
          {me.avatar}
        </div>
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginTop: 6 }}>{me.nome}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 24 }}>{getMedalEmoji(me.pos) || "🏅"}</span>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>{getOrdinal(me.pos)}</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 14 }}>lugar</span>
        </div>
        <div style={{ marginTop: 8, textAlign: "center", padding: "0 16px" }}>
          <p style={{ color: "#EAB308", fontWeight: 700, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{bolaoNome}</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, marginTop: 2 }}>{rankLabel} • {me.pontos} pts</p>
        </div>
        <div style={{ position: "absolute", bottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  // ── Badge sem foto ──
  const BadgeSemFoto = () => {
    if (!me) return <p style={{ textAlign: "center", padding: "32px 0", fontSize: 14, color: "#999" }}>Você ainda não está no ranking.</p>;
    return (
      <div style={{ width: 280, height: 280, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0D3B1A 0%, #1B5E20 50%, #2E7D32 100%)", position: "relative", paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <img src={logoSrc} alt="" style={{ width: 20, height: 20 }} />
          <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Bolão na Copa</span>
        </div>
        <span style={{ fontSize: 48 }}>{getMedalEmoji(me.pos) || "🏅"}</span>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 36, marginTop: 2 }}>{getOrdinal(me.pos)}</span>
        <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 14 }}>lugar</span>
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginTop: 8 }}>{me.nome}</p>
        <p style={{ color: "#EAB308", fontWeight: 700, fontSize: 12 }}>{me.pontos} pontos</p>
        <div style={{ marginTop: 6, textAlign: "center", padding: "0 16px" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{bolaoNome}</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>{rankLabel}</p>
        </div>
        <div style={{ position: "absolute", bottom: 8 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>bolaonacopa.com.br</span>
        </div>
      </div>
    );
  };

  // ── Badge pódio (inline styles for html2canvas compatibility) ──
  const BadgePodio = () => {
    if (top3.length === 0) return <p style={{ textAlign: "center", padding: "32px 0", fontSize: 14, color: "#999" }}>Ranking ainda sem dados.</p>;
    const first = top3.find((r) => r.pos === 1);
    const second = top3.find((r) => r.pos === 2);
    const third = top3.find((r) => r.pos === 3);
    return (
      <div style={{ width: 320, height: 380, borderRadius: 16, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, position: "relative", zIndex: 10 }}>
          <img src={logoSrc} alt="" style={{ width: 20, height: 20 }} />
          <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Bolão na Copa</span>
        </div>
        {/* Podium */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginTop: 16, marginBottom: 8, position: "relative", zIndex: 10, width: "100%", padding: "0 16px" }}>
          {/* 2nd place */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
            <span style={{ fontSize: 24, marginBottom: 4 }}>🥈</span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "2px solid #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>
              {second?.avatar || "?"}
            </div>
            <p style={{ color: "#fff", fontSize: 10, fontWeight: 700, marginTop: 4, textAlign: "center" }}>{firstName(second?.nome || "-")}</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700 }}>{second?.pontos ?? 0} pts</p>
            <div style={{ width: "100%", height: 48, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "8px 8px 0 0", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 900, fontSize: 16 }}>2º</span>
            </div>
          </div>
          {/* 1st place */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
            <span style={{ fontSize: 30, marginBottom: 4 }}>🥇</span>
            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid #EAB308", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>
              {first?.avatar || "?"}
            </div>
            <p style={{ color: "#fff", fontSize: 10, fontWeight: 700, marginTop: 4, textAlign: "center" }}>{firstName(first?.nome || "-")}</p>
            <p style={{ color: "#EAB308", fontSize: 9, fontWeight: 700 }}>{first?.pontos ?? 0} pts</p>
            <div style={{ width: "100%", height: 80, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "8px 8px 0 0", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 900, fontSize: 20 }}>1º</span>
            </div>
          </div>
          {/* 3rd place */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
            <span style={{ fontSize: 24, marginBottom: 4 }}>🥉</span>
            <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "2px solid #92400E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>
              {third?.avatar || "?"}
            </div>
            <p style={{ color: "#fff", fontSize: 10, fontWeight: 700, marginTop: 4, textAlign: "center" }}>{firstName(third?.nome || "-")}</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 700 }}>{third?.pontos ?? 0} pts</p>
            <div style={{ width: "100%", height: 36, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "8px 8px 0 0", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 900, fontSize: 16 }}>3º</span>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ width: "100%", backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, position: "relative", zIndex: 10 }}>
          <span style={{ color: "#EAB308", fontWeight: 700, fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{bolaoNome}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>&bull;</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>{rankLabel}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>&bull;</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>bolaonacopa.com.br</span>
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
