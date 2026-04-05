import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "@/hooks/useUserPlan";

const BANNER_ID = "ca-app-pub-9316035916536420/8926482067";

interface AdBannerProps {
  position?: "top" | "bottom";
}

/**
 * Banner ad fixo (320x50) para usuários free no app nativo.
 * Não renderiza nada na web ou para premium.
 */
const AdBanner = ({ position = "bottom" }: AdBannerProps) => {
  const { plano } = useUserPlan();
  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();
  const shown = useRef(false);

  useEffect(() => {
    if (isPremium || !isNative || shown.current) return;

    const showBanner = async () => {
      try {
        const AdMob = getAdMobPlugin();
        if (!AdMob) return;

        await ensureAdMobReady();
        await AdMob.showBanner({
          adId: BANNER_ID,
          adSize: "ADAPTIVE_BANNER",
          position: position === "top" ? "TOP_CENTER" : "BOTTOM_CENTER",
          margin: 0,
          isTesting: false,
        });
        shown.current = true;
      } catch {
        // Banner failed silently
      }
    };

    showBanner();

    return () => {
      // Esconder banner ao desmontar
      try {
        const AdMob = getAdMobPlugin();
        if (AdMob && shown.current) {
          AdMob.hideBanner().catch(() => {});
          shown.current = false;
        }
      } catch {}
    };
  }, [isPremium, isNative, position]);

  // Não renderiza HTML — o banner é gerenciado pelo plugin nativo
  return null;
};

// Helpers copiados do useRewardedAd para evitar dependência circular
let _adMobInit = false;
function getAdMobPlugin(): any | null {
  try {
    const p = (Capacitor as any).Plugins;
    if (p?.AdMob) return p.AdMob;
  } catch {}
  try {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.AdMob) return cap.Plugins.AdMob;
  } catch {}
  return null;
}
async function ensureAdMobReady(): Promise<boolean> {
  if (_adMobInit) return true;
  const AdMob = getAdMobPlugin();
  if (!AdMob) return false;
  try {
    await AdMob.initialize({ initializeForTesting: false });
    _adMobInit = true;
    return true;
  } catch { return false; }
}

export default AdBanner;
