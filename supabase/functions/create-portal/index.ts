// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: create-portal
//
// POST → cria sessão Stripe Billing Portal → retorna { url }
// ═══════════════════════════════════════════════════════════════

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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Autenticar usuário
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

    // Buscar stripe_customer_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Nenhuma assinatura encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Criar sessão do Billing Portal
    const session = await stripePost("/billing_portal/sessions", {
      customer: profile.stripe_customer_id,
      return_url: `${SITE_URL}/perfil`,
    }, stripeKey);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Erro no create-portal:", err);
    return new Response(JSON.stringify({ error: "Erro ao acessar portal de pagamento" }), {
      status: 500, headers: corsHeaders,
    });
  }
});
