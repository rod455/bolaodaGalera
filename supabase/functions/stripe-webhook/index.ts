// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: stripe-webhook
//
// Recebe eventos do Stripe e atualiza profiles.plano
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://bolaonacopa.com.br",
  "https://www.bolaonacopa.com.br",
  "https://bolaonacopa.lovable.app",
  "https://bolaodacopa-ten.vercel.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Content-Type": "application/json",
  };
}

// Mapeia price ID → plano
const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1T1TxnC1YtBHMBc2hJMfOwqL": "premium",
  "price_1T1TyYC1YtBHMBc2E12oGz6Q": "premium",
  "price_1T1TzjC1YtBHMBc2CGkzhsUe": "premium_pro",
  "price_1T1U0KC1YtBHMBc2gqSGO0jD": "premium_pro",
  "price_1TNdckC1YtBHMBc2ulK4fQfr": "premium_pro", // Bolão Corporativo
};

const CORPORATE_PRICE_ID = "price_1TNdckC1YtBHMBc2ulK4fQfr";

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
  const corsHeaders = getCorsHeaders(req);

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

  if (webhookSecret) {
    const valid = await verifySignature(body, sigHeader, webhookSecret);
    if (!valid) {
      console.error("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400, headers: corsHeaders,
      });
    }
  } else {
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch (parseErr) {
    console.error("JSON parse error:", parseErr);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: corsHeaders,
    });
  }
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

        console.log(`[Stripe] Sub ${sub.id}: status=${status}, priceId=${priceId}, plano=${plano}, userId=${userId}`);

        if (status === "active" || status === "trialing") {
          const { error: updateErr } = await supabase.from("profiles").update({
            plano,
            stripe_subscription_id: sub.id,
            plano_expira_em: expiresAt,
          }).eq("id", userId);
          if (updateErr) console.error(`[Stripe] Erro no update:`, updateErr);
          console.log(`[Stripe] Plano ativado: ${userId} → ${plano}`);

          // Notificar dono quando plano corporativo é ativado
          if (priceId === CORPORATE_PRICE_ID && event.type === "customer.subscription.created") {
            await notificarVendaCorporativa(supabase, userId, sub);
          }
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
  } catch (err: any) {
    console.error(`[Stripe] Erro processando ${event.type}:`, err?.message || err, JSON.stringify(err));
    return new Response(JSON.stringify({ error: "Erro interno", detail: String(err) }), {
      status: 500, headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: corsHeaders,
  });
});

// ── Notificar dono sobre nova venda corporativa ──
async function notificarVendaCorporativa(supabase: any, userId: string, sub: any) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "contato@bolaonacopa.com.br";
  if (!RESEND_API_KEY) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", userId)
    .single();

  const customerName = profile?.nome || "Cliente";
  const customerEmail = profile?.email || "email não encontrado";
  const subscriptionId = sub.id;
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const html = `
    <h2>🏢 Nova venda — Bolão Corporativo</h2>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px;font-weight:bold;">Cliente</td><td style="padding:8px;">${customerName}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">E-mail</td><td style="padding:8px;">${customerEmail}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">User ID</td><td style="padding:8px;">${userId}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Assinatura</td><td style="padding:8px;">${subscriptionId}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Data/hora</td><td style="padding:8px;">${now}</td></tr>
    </table>
    <p style="margin-top:16px;">Entre em contato com o cliente para organizar o bolão corporativo. ⚽</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Bolão na Copa <noreply@bolaonacopa.com.br>",
        to: [OWNER_EMAIL],
        subject: `🏢 Nova venda corporativa — ${customerName}`,
        html,
      }),
    });
    console.log(`[Stripe] Email corporativo enviado para ${OWNER_EMAIL}`);
  } catch (e) {
    console.error("[Stripe] Erro ao enviar email corporativo:", e);
  }
}

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

