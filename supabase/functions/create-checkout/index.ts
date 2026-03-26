// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: create-checkout
//
// POST { priceId } → cria sessão Stripe Checkout → retorna { url }
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SITE_URL = "https://www.bolaonacopa.com.br";
const STRIPE_API = "https://api.stripe.com/v1";

const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1T1TxnC1YtBHMBc2hJMfOwqL": "premium",
  "price_1T1TyYC1YtBHMBc2E12oGz6Q": "premium",
  "price_1T1TzjC1YtBHMBc2CGkzhsUe": "premium_pro",
  "price_1T1U0KC1YtBHMBc2gqSGO0jD": "premium_pro",
};

async function stripePost(path: string, body: Record<string, string>, secretKey: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe API error");
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Autenticar usuário via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId é obrigatório" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Buscar ou criar Stripe Customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripePost("/customers", {
        email: user.email || "",
        "metadata[supabase_user_id]": user.id,
      }, stripeKey);
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Criar sessão de checkout
    const plano = PRICE_PLAN_MAP[priceId] || "premium";
    const session = await stripePost("/checkout/sessions", {
      customer: customerId!,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      mode: "subscription",
      success_url: `${SITE_URL}/planos?status=sucesso&plano=${plano}`,
      cancel_url: `${SITE_URL}/planos?status=cancelado`,
      "metadata[supabase_user_id]": user.id,
      "subscription_data[metadata][supabase_user_id]": user.id,
    }, stripeKey);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Erro no create-checkout:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500, headers: corsHeaders,
    });
  }
});
