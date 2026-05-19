// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: revenuecat-webhook
//
// Recebe webhooks do RevenueCat e atualiza profiles.plano
// Deploy: supabase functions deploy revenuecat-webhook
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Map RevenueCat product IDs to plan names
const PRODUCT_PLAN_MAP: Record<string, string> = {
  premium_mensal: "premium",
  premium_anual: "premium",
  premium_pro_mensal: "premium_pro",
  premium_pro_anual: "premium_pro",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify webhook auth (RevenueCat sends Bearer token)
  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") || "";
  if (webhookSecret) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== webhookSecret) {
      console.error("[RC Webhook] Invalid auth token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
  }

  try {
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(JSON.stringify({ error: "No event" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id; // This is the Supabase user ID
    const productId = event.product_id;
    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

    console.log(`[RC Webhook] Event: ${eventType}, User: ${appUserId}, Product: ${productId}`);

    if (!appUserId) {
      console.error("[RC Webhook] No app_user_id");
      return new Response(JSON.stringify({ error: "No user ID" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    switch (eventType) {
      // Subscription started or renewed
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION": {
        const plano = PRODUCT_PLAN_MAP[productId] || "premium";
        await supabase
          .from("profiles")
          .update({
            plano,
            plano_expira_em: expirationDate,
          })
          .eq("id", appUserId);
        console.log(`[RC Webhook] Plan activated: ${appUserId} → ${plano}`);
        break;
      }

      // Subscription cancelled/expired
      case "CANCELLATION":
      case "EXPIRATION": {
        await supabase
          .from("profiles")
          .update({
            plano: "free",
            plano_expira_em: null,
          })
          .eq("id", appUserId);
        console.log(`[RC Webhook] Plan removed: ${appUserId}`);
        break;
      }

      // Billing issue
      case "BILLING_ISSUE": {
        console.log(`[RC Webhook] Billing issue for: ${appUserId}`);
        break;
      }

      default:
        console.log(`[RC Webhook] Ignored event: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[RC Webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

