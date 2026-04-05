import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useUserPlan } from "@/hooks/useUserPlan";

const BANNER_ID = "ca-app-pub-9316035916536420/8926482067";

/**
 * Banner ad inline entre seções.
 * No app nativo: mostra banner AdMob via plugin.
 * Na web/premium: não renderiza nada.
 *
 * Usar entre seções da página, ex:
 *   <Section1 />
 *   <AdBanner />
 *   <Section2 />
 */
const AdBanner = () => {
  const { plano } = useUserPlan();
  const isPremium = plano === "premium" || plano === "premium_pro";
  const isNative = Capacitor.isNativePlatform();
  const [adLoaded, setAdLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (isPremium || !isNative || loadedRef.current) return;
    loadedRef.current = true;

    const loadAd = async () => {
      try {
        const AdMob = getAdMobPlugin();
        if (!AdMob) return;

        await ensureAdMobReady();

        // Usar prepareAdBanner + showBanner para banner inline
        // O banner vai ser posicionado no topo — o espaçador garante que não sobreponha
        await AdMob.showBanner({
          adId: BANNER_ID,
          adSize: "BANNER",
          position: "TOP_CENTER",
          margin: 0,
          isTesting: false,
        });
        setAdLoaded(true);
      } catch {
        // Banner failed
      }
    };

    loadAd();

    return () => {
      try {
        const AdMob = getAdMobPlugin();
        if (AdMob) AdMob.hideBanner().catch(() => {});
        loadedRef.current = false;
      } catch {}
    };
  }, [isPremium, isNative]);

  // Não renderiza nada na web ou para premium
  if (!isNative || isPremium) return null;

  // Reservar espaço para o banner nativo (50px = altura do banner padrão)
  return adLoaded ? <div ref={containerRef} style={{ height: 50, width: "100%" }} /> : null;
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
