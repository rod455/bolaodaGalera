import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";

// RevenueCat types
interface RCPackage {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    priceString: string;
    price: number;
  };
  packageType: string;
}

interface RCOffering {
  identifier: string;
  availablePackages: RCPackage[];
}

interface RCCustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, { productIdentifier: string; expirationDate: string | null }>;
  };
}

// Map RevenueCat product IDs to our plan names
const PRODUCT_PLAN_MAP: Record<string, string> = {
  galera_premium_mensal: "premium",
  galera_premium_anual: "premium",
  galera_pro_mensal: "premium_pro",
  galera_pro_anual: "premium_pro",
};

// RevenueCat API keys
const RC_IOS_KEY = "appl_jSDCUuDcFqvrYhSsylkcoWGKbfK"; // Apple iOS key (produção)
const RC_ANDROID_KEY = ""; // Android key (usa Stripe direto no Android)

let rcInitialized = false;

import { Purchases } from "@revenuecat/purchases-capacitor";

async function getRC() {
  try {
    return Purchases;
  } catch {
    return null;
  }
}

export const useRevenueCat = () => {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState<RCOffering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<RCCustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const isNative = Capacitor.isNativePlatform();
  const isIOS = Capacitor.getPlatform() === "ios";

  // Initialize RevenueCat
  useEffect(() => {
    if (!isNative) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const RCPurchases = await getRC();
      if (!RCPurchases) {
        console.error("[RevenueCat] Plugin not available");
        setLoading(false);
        return;
      }

      try {
        if (!rcInitialized) {
          // Primeira inicialização — configurar o SDK
          const apiKey = isIOS ? RC_IOS_KEY : RC_ANDROID_KEY;
          if (!apiKey) {
            console.warn("[RevenueCat] No API key configured");
            setLoading(false);
            return;
          }
          await RCPurchases.configure({
            apiKey,
            appUserID: user?.id || undefined,
          });
          rcInitialized = true;
          console.log("[RevenueCat] Configured successfully");
        }

        // Sempre buscar dados ao montar (primeira vez ou remontagem após navegação).
        // Sem isso, offerings fica null na remontagem porque o useState reseta,
        // mas rcInitialized=true faz o useEffect sair cedo → isAvailable=false → IAP quebrado.
        const { offerings: offeringsResult } = await RCPurchases.getOfferings();
        console.log("[RevenueCat] Offerings:", offeringsResult?.current ? "found" : "EMPTY");
        if (offeringsResult.current) {
          setOfferings(offeringsResult.current as RCOffering);
        }

        const { customerInfo: info } = await RCPurchases.getCustomerInfo();
        setCustomerInfo(info as RCCustomerInfo);
      } catch (err) {
        console.error("[RevenueCat] Init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isNative, isIOS, user?.id]);

  // Login user when auth changes
  useEffect(() => {
    if (!rcInitialized || !user?.id) return;

    const loginUser = async () => {
      try {
        const { customerInfo: info } = await Purchases.logIn({ appUserID: user.id });
        setCustomerInfo(info as RCCustomerInfo);
      } catch (err) {
        void err;
      }
    };

    loginUser();
  }, [user?.id]);

  // Purchase a package
  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    if (!offerings) return false;

    const pkg = offerings.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) {
      // Package not found
      return false;
    }

    setPurchasing(true);
    try {
      const { customerInfo: info } = await Purchases.purchasePackage({
        aPackage: pkg as any,
      });
      setCustomerInfo(info as RCCustomerInfo);
      return true;
    } catch (err: any) {
      const cancelled =
        err?.code === "1" ||
        err?.code === "PurchaseCancelledError" ||
        err?.userCancelled === true ||
        err?.message?.includes("cancelled") ||
        err?.message?.includes("CANCELLED") ||
        err?.message?.includes("cancel");
      if (cancelled) {
        // User cancelled — not an error
        return false;
      }
      void err;
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [offerings]);

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info as RCCustomerInfo);
      return Object.keys(info.entitlements?.active || {}).length > 0;
    } catch (err) {
      void err;
      return false;
    }
  }, []);

  // Get current plan from entitlements
  const getActivePlan = useCallback((): string | null => {
    if (!customerInfo?.entitlements?.active) return null;
    const active = customerInfo.entitlements.active;

    // Check for premium_pro first (higher tier)
    if (active["premium_pro"]) return "premium_pro";
    if (active["premium"]) return "premium";

    // Fallback: check product IDs
    for (const [, entitlement] of Object.entries(active)) {
      const plan = PRODUCT_PLAN_MAP[entitlement.productIdentifier];
      if (plan) return plan;
    }

    return null;
  }, [customerInfo]);

  // Find a package by product ID
  const getPackage = useCallback((productId: string): RCPackage | null => {
    if (!offerings) return null;
    return offerings.availablePackages.find(
      (p) => p.product.identifier === productId
    ) || null;
  }, [offerings]);

  return {
    offerings,
    customerInfo,
    loading,
    purchasing,
    purchase,
    restore,
    getActivePlan,
    getPackage,
    isAvailable: isNative && rcInitialized && !!offerings,
  };
};



