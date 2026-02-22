import { useState, useEffect } from "react";
import { X, Download, Star } from "lucide-react";
import { Capacitor } from "@capacitor/core";

const DISMISSED_KEY = "install_banner_dismissed";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bolaonacopa.app";

const InstallAppBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Não mostrar se:
    // 1. Já está no app nativo (Capacitor)
    // 2. Não é Android
    // 3. Usuário já dispensou
    if (Capacitor.isNativePlatform()) return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      // Mostrar novamente após 7 dias
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Mostrar após 2 segundos para não atrapalhar o carregamento
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleInstall = () => {
    // Analytics
    if (typeof window.gtag !== "undefined") {
      window.gtag("event", "click_install_app", {
        source: "banner_android",
      });
    }
    window.open(PLAY_STORE_URL, "_blank");
    handleDismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          {/* App icon */}
          <img
            src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
            alt="Bolão na Copa"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">Bolão na Copa</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">Grátis</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Mais rápido e com notificações</p>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 bg-copa-green-500 hover:bg-copa-green-600 text-white font-bold text-xs rounded-lg px-4 py-2.5 flex-shrink-0 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar
          </button>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppBanner;
