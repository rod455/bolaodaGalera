// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: stripe-webhook
//
// Recebe eventos do Stripe e atualiza profiles.plano
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verificar assinatura do webhook
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  console.log(`[Stripe Webhook] Evento: ${event.type}`);

  try {
    switch (event.type) {
      // ── Assinatura criada ou atualizada ──
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Tentar encontrar pelo customer ID
          const customerId = subscription.customer as string;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!profile) {
            console.error("Usuário não encontrado para customer:", customerId);
            break;
          }

          await updatePlan(supabase, profile.id, subscription);
        } else {
          await updatePlan(supabase, userId, subscription);
        }
        break;
      }

      // ── Assinatura cancelada / expirada ──
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Encontrar usuário pelo customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              plano: "free",
              stripe_subscription_id: null,
              plano_expira_em: null,
            })
            .eq("id", profile.id);

          console.log(`[Stripe] Plano cancelado para user: ${profile.id}`);
        }
        break;
      }

      // ── Pagamento falhou ──
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          console.log(`[Stripe] Pagamento falhou para user: ${profile.id}`);
          // Não remove o plano imediatamente — Stripe vai retry
          // Apenas loga. Após todos os retries, subscription.deleted será disparado.
        }
        break;
      }

      default:
        console.log(`[Stripe] Evento ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe] Erro processando ${event.type}:`, err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: corsHeaders,
  });
});

// ── Helper: atualizar plano no profiles ──
async function updatePlan(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription
) {
  const status = subscription.status; // "active", "past_due", "canceled", etc.
  const priceId = subscription.items.data[0]?.price?.id;
  const plano = PRICE_PLAN_MAP[priceId] || "premium";
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  if (status === "active" || status === "trialing") {
    await supabase
      .from("profiles")
      .update({
        plano,
        stripe_subscription_id: subscription.id,
        plano_expira_em: currentPeriodEnd,
      })
      .eq("id", userId);

    console.log(`[Stripe] Plano atualizado: ${userId} → ${plano} (até ${currentPeriodEnd})`);
  } else if (status === "canceled" || status === "unpaid") {
    await supabase
      .from("profiles")
      .update({
        plano: "free",
        stripe_subscription_id: null,
        plano_expira_em: null,
      })
      .eq("id", userId);

    console.log(`[Stripe] Plano removido: ${userId} (status: ${status})`);
  }
  // Para "past_due": mantém o plano ativo (Stripe ainda está tentando cobrar)
}
