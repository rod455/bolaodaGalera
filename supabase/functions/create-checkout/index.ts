import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://bolaonacopa.com.br",
  "https://www.bolaonacopa.com.br",
  "https://bolaonacopa.lovable.app",
  "https://bolaodacopa-ten.vercel.app",
  "https://localhost",        // Capacitor Android/iOS
  "capacitor://localhost",    // Capacitor fallback
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
    "Content-Type": "application/json",
  };
}

const SITE_URL = "https://www.bolaonacopa.com.br";
const STRIPE_API = "https://api.stripe.com/v1";

const PRICE_PLAN_MAP: Record<string, string> = {
  "price_1T1TxnC1YtBHMBc2hJMfOwqL": "premium",
  "price_1T1TyYC1YtBHMBc2E12oGz6Q": "premium",
  "price_1T1TzjC1YtBHMBc2CGkzhsUe": "premium_pro",
  "price_1T1U0KC1YtBHMBc2gqSGO0jD": "premium_pro",
};

// Helper para chamadas à API do Stripe
async function stripeRequest(stripeKey: string, path: string, method: string, body?: Record<string, string>): Promise<any> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return { ok: res.ok, data: await res.json() };
}

// Buscar subscriptions ativas do customer
async function getActiveSubscriptions(stripeKey: string, customerId: string): Promise<any[]> {
  const { data } = await stripeRequest(stripeKey, `/subscriptions?customer=${customerId}&status=active&limit=10`, "GET");
  return data?.data || [];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("[create-checkout] POST received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-checkout] STRIPE_SECRET_KEY missing");
      return new Response(JSON.stringify({ error: "Configuração incompleta" }), {
        status: 500, headers: corsHeaders,
      });
    }

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
      console.error("[create-checkout] Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401, headers: corsHeaders,
      });
    }
    console.log("[create-checkout] User:", user.id);

    // Ler body
    const { priceId } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId é obrigatório" }), {
        status: 400, headers: corsHeaders,
      });
    }
    console.log("[create-checkout] priceId:", priceId);

    // Buscar ou criar Stripe Customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      console.log("[create-checkout] Creating Stripe customer...");
      const { ok, data: custData } = await stripeRequest(stripeKey, "/customers", "POST", {
        email: user.email || "",
        "metadata[supabase_user_id]": user.id,
      });

      if (!ok) {
        console.error("[create-checkout] Stripe customer error:", custData.error?.message);
        return new Response(JSON.stringify({ error: "Erro ao processar pagamento" }), {
          status: 500, headers: corsHeaders,
        });
      }

      customerId = custData.id;
      console.log("[create-checkout] Customer created:", customerId);
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // ═══ UPGRADE COM PRORATION ═══
    // Se o usuário já tem subscription ativa, faz upgrade direto via API
    // em vez de criar nova subscription (evita cobrança dupla)
    const activeSubs = await getActiveSubscriptions(stripeKey, customerId!);
    const existingSub = activeSubs.find((sub: any) => {
      const existingPriceId = sub.items?.data?.[0]?.price?.id;
      return existingPriceId && existingPriceId !== priceId && PRICE_PLAN_MAP[existingPriceId];
    });

    if (existingSub) {
      const existingItemId = existingSub.items.data[0].id;
      const existingPriceId = existingSub.items.data[0].price.id;
      console.log(`[create-checkout] Upgrade: ${existingPriceId} → ${priceId} (sub: ${existingSub.id})`);

      // Atualizar subscription com proration
      const { ok: updateOk, data: updateData } = await stripeRequest(
        stripeKey,
        `/subscriptions/${existingSub.id}`,
        "POST",
        {
          "items[0][id]": existingItemId,
          "items[0][price]": priceId,
          "proration_behavior": "create_prorations",
          "metadata[supabase_user_id]": user.id,
        }
      );

      if (!updateOk) {
        console.error("[create-checkout] Upgrade error:", updateData.error?.message);
        // Falhou o upgrade direto — cai pro checkout normal abaixo
      } else {
        const newPlano = PRICE_PLAN_MAP[priceId] || "premium";
        const expiresAt = new Date(updateData.current_period_end * 1000).toISOString();

        // Atualizar plano no banco
        await supabase.from("profiles").update({
          plano: newPlano,
          stripe_subscription_id: existingSub.id,
          plano_expira_em: expiresAt,
        }).eq("id", user.id);

        console.log(`[create-checkout] Upgrade OK: ${user.id} → ${newPlano} (proration applied)`);

        // Cancelar outras subscriptions ativas (evitar duplicatas)
        for (const sub of activeSubs) {
          if (sub.id !== existingSub.id) {
            await stripeRequest(stripeKey, `/subscriptions/${sub.id}`, "DELETE");
            console.log(`[create-checkout] Subscription duplicada cancelada: ${sub.id}`);
          }
        }

        return new Response(JSON.stringify({
          upgraded: true,
          plano: newPlano,
          url: `${SITE_URL}/planos?status=sucesso&plano=${newPlano}`,
        }), { headers: corsHeaders });
      }
    }

    // Se já tem subscription IGUAL (mesmo price), não criar outra
    const sameSub = activeSubs.find((sub: any) =>
      sub.items?.data?.[0]?.price?.id === priceId
    );
    if (sameSub) {
      const plano = PRICE_PLAN_MAP[priceId] || "premium";
      console.log(`[create-checkout] Já tem subscription ativa com mesmo price: ${sameSub.id}`);
      return new Response(JSON.stringify({
        upgraded: false,
        plano,
        message: "Você já tem este plano ativo",
        url: `${SITE_URL}/planos?status=sucesso&plano=${plano}`,
      }), { headers: corsHeaders });
    }

    // ═══ CHECKOUT NORMAL (novo assinante) ═══
    const plano = PRICE_PLAN_MAP[priceId] || "premium";
    const { ok: sessionOk, data: sessionData } = await stripeRequest(
      stripeKey,
      "/checkout/sessions",
      "POST",
      {
        customer: customerId!,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${SITE_URL}/planos?status=sucesso&plano=${plano}`,
        cancel_url: `${SITE_URL}/planos?status=cancelado`,
        "metadata[supabase_user_id]": user.id,
        "subscription_data[metadata][supabase_user_id]": user.id,
      }
    );

    if (!sessionOk) {
      console.error("[create-checkout] Stripe checkout error:", sessionData.error?.message);
      return new Response(JSON.stringify({ error: "Erro ao criar sessão de pagamento" }), {
        status: 500, headers: corsHeaders,
      });
    }

    console.log("[create-checkout] Checkout URL created successfully");
    return new Response(JSON.stringify({ url: sessionData.url }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("[create-checkout] CATCH:", String(err));
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: corsHeaders,
    });
  }
});

