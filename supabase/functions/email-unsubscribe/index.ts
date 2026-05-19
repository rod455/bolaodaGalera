// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: email-unsubscribe (API JSON)
//
// GET  ?token=UUID        → valida token, retorna status
// POST {token, motivo}    → salva opt_out + motivo
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
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

  // ── GET: Validar token ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token nao informado" }), { status: 400, headers: corsHeaders });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, nome, email_opt_out")
      .eq("email_unsubscribe_token", token)
      .single();

    if (error || !profile) {
      return new Response(JSON.stringify({ error: "Token invalido ou expirado" }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      valid: true,
      already_opted_out: profile.email_opt_out,
      nome: profile.nome,
    }), { headers: corsHeaders });
  }

  // ── POST: Salvar opt_out ──
  if (req.method === "POST") {
    const { token, motivo } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token nao informado" }), { status: 400, headers: corsHeaders });
    }

    if (!motivo) {
      return new Response(JSON.stringify({ error: "Motivo nao informado" }), { status: 400, headers: corsHeaders });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email_opt_out")
      .eq("email_unsubscribe_token", token)
      .single();

    if (error || !profile) {
      return new Response(JSON.stringify({ error: "Token invalido ou expirado" }), { status: 404, headers: corsHeaders });
    }

    if (profile.email_opt_out) {
      return new Response(JSON.stringify({ success: true, already_opted_out: true }), { headers: corsHeaders });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email_opt_out: true,
        email_opt_out_reason: motivo,
      })
      .eq("id", profile.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao processar descadastro" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Metodo nao suportado" }), { status: 405, headers: corsHeaders });
});

