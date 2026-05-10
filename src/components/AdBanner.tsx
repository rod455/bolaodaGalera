import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "@/hooks/useUserPlan";

const BANNER_ID = "ca-app-pub-9316035916536420/8926482067";

/**
 * Banner ad inline entre seções.
 * No app nativo (free): mostra banner AdMob via plugin.
 * Na web/premium: não renderiza nada.
 */
const AdBanner = () => {
  const { plano } = useUserPlan();
  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();
  const [adVisible, setAdVisible] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (isPremium || !isNative || attemptedRef.current) return;
    attemptedRef.current = true;

    const showAd = async () => {
      try {
        const AdMob = getAdMobPlugin();
        if (!AdMob) return;
        await ensureAdMobReady();
        await AdMob.showBanner({
          adId: BANNER_ID,
          adSize: "BANNER",
          position: "TOP_CENTER",
          margin: 0,
          isTesting: false,
        });
        setAdVisible(true);
      } catch {
        // Ad failed — don't show spacer
      }
    };

    showAd();

    return () => {
      try {
        const AdMob = getAdMobPlugin();
        if (AdMob && adVisible) {
          AdMob.hideBanner().catch(() => {});
        }
      } catch {}
      attemptedRef.current = false;
    };
  }, [isPremium, isNative]);

  if (!isNative || isPremium) return null;

  // Espaçador para o banner nativo (60px)
  return adVisible ? (
    <div className="w-full flex items-center justify-center" style={{ minHeight: 60 }}>
      <span className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">Publicidade</span>
    </div>
  ) : null;
};

// Helpers
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

