// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: stripe-webhook
//
// Recebe eventos do Stripe e atualiza profiles.plano
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Mapeia price ID → plano
const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1T1TxnC1YtBHMBc2hJMfOwqL": "premium",
  "price_1T1TyYC1YtBHMBc2E12oGz6Q": "premium",
  "price_1T1TzjC1YtBHMBc2CGkzhsUe": "premium_pro",
  "price_1T1U0KC1YtBHMBc2gqSGO0jD": "premium_pro",
};

// ── Verificação de assinatura HMAC-SHA256 do Stripe ──
async function verifySignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [key, val] = part.split("=");
    acc[key.trim()] = val;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Proteção contra replay (5 min)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return expected === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verificar assinatura do webhook
  const sigHeader = req.headers.get("stripe-signature") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const body = await req.text();

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured — rejecting request");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500, headers: corsHeaders,
    });
  }

  const valid = await verifySignature(body, sigHeader, webhookSecret);
  if (!valid) {
    console.error("Webhook signature verification failed");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400, headers: corsHeaders,
    });
  }

  const event = JSON.parse(body);
  console.log(`[Stripe Webhook] Evento: ${event.type}`);

  try {
    switch (event.type) {
      // ── Assinatura criada ou atualizada ──
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = await resolveUserId(supabase, sub);
        if (!userId) break;

        const status = sub.status;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plano = PRICE_PLAN_MAP[priceId] || "premium";
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();

        if (status === "active" || status === "trialing") {
          await supabase.from("profiles").update({
            plano,
            stripe_subscription_id: sub.id,
            plano_expira_em: expiresAt,
          }).eq("id", userId);
          console.log(`[Stripe] Plano ativado: ${userId} → ${plano}`);
        } else if (status === "canceled" || status === "unpaid") {
          await supabase.from("profiles").update({
            plano: "free",
            stripe_subscription_id: null,
            plano_expira_em: null,
          }).eq("id", userId);
          console.log(`[Stripe] Plano removido: ${userId}`);
        }
        break;
      }

      // ── Assinatura cancelada / expirada ──
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = await resolveUserId(supabase, sub);
        if (!userId) break;

        await supabase.from("profiles").update({
          plano: "free",
          stripe_subscription_id: null,
          plano_expira_em: null,
        }).eq("id", userId);
        console.log(`[Stripe] Plano cancelado: ${userId}`);
        break;
      }

      // ── Pagamento falhou ──
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        console.log(`[Stripe] Pagamento falhou para customer: ${customerId}`);
        break;
      }

      default:
        console.log(`[Stripe] Evento ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe] Erro processando ${event.type}:`, err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: corsHeaders,
  });
});

// ── Resolver user ID: metadata ou stripe_customer_id ──
async function resolveUserId(supabase: any, sub: any): Promise<string | null> {
  // Primeiro tenta metadata
  const userId = sub.metadata?.supabase_user_id;
  if (userId) return userId;

  // Fallback: buscar pelo customer ID
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("Usuário não encontrado para customer:", customerId);
    return null;
  }
  return profile.id;
}
