import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Capacitor } from "@capacitor/core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compartilha texto via WhatsApp de forma confiável em todas as plataformas:
 * - App nativo (Capacitor): usa @capacitor/share para abrir o WhatsApp app
 * - Chrome Android (web): usa https://api.whatsapp.com/send (redirect para app)
 * - iPhone Safari (web): usa https://api.whatsapp.com/send
 * - Desktop: usa https://web.whatsapp.com/send
 */
export async function shareViaWhatsApp(text: string): Promise<void> {
  const encoded = encodeURIComponent(text);

  // 1. App nativo: usar o Share plugin do Capacitor (abre share sheet do sistema)
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ text, dialogTitle: "Compartilhar via WhatsApp" });
      return;
    } catch {
      // Fallback se o share plugin falhar: intent direto no Android
      window.location.href = `https://api.whatsapp.com/send?text=${encoded}`;
      return;
    }
  }

  // 2. Mobile web (Android/iPhone): usar api.whatsapp.com que redireciona pro app
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `https://api.whatsapp.com/send?text=${encoded}`;
    return;
  }

  // 3. Desktop: abrir WhatsApp Web
  window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
}
