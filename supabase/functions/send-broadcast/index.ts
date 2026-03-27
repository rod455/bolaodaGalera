// =================================================================
// Supabase Edge Function: send-broadcast
// Envia email avulso para usuarios recentes (ex: aviso de correcao).
// Respeita email_opt_out.
// =================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DELAY_MS = 600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firstName(nome: string | null): string {
  return nome?.split(" ")[0] || "Torcedor";
}

function buildEmailHtml(nome: string, unsubscribeToken: string): string {
  const name = firstName(nome);
  const unsubscribeUrl = `https://bolaonacopa.com.br/unsubscribe?token=${unsubscribeToken}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
      <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png"
           alt="Bolao na Copa" style="width:60px;height:60px;margin-bottom:12px;">
      <h1 style="color:white;font-size:20px;margin:0;">Problema corrigido!</h1>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;">
      <p style="font-size:16px;color:#1f2937;margin-top:0;">E ai, <strong>${name}</strong>! Tudo bem?</p>
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        Identificamos que nos ultimos dias alguns usuarios tiveram dificuldade para <strong>entrar em boloes de amigos</strong> usando o codigo de convite. Pedimos desculpas pelo inconveniente!
      </p>
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        A boa noticia e que <strong>o problema ja foi corrigido</strong>. Agora voce pode entrar nos boloes normalmente, basta pedir o codigo de convite ao seu amigo e inserir no app.
      </p>
      <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:16px 0;border-left:4px solid #16a34a;">
        <p style="font-size:13px;color:#15803d;margin:0;font-weight:700;">Como entrar em um bolao:</p>
        <p style="font-size:12px;color:#4b5563;margin:6px 0 0;">1. Peca o codigo de convite ao seu amigo</p>
        <p style="font-size:12px;color:#4b5563;margin:4px 0 0;">2. Na tela inicial, cole o codigo no campo "Codigo do bolao"</p>
        <p style="font-size:12px;color:#4b5563;margin:4px 0 0;">3. Clique em "Entrar" e pronto!</p>
      </div>
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        Se voce ainda tiver qualquer problema, responda este email que teremos prazer em ajudar.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://bolaonacopa.com.br/home"
           style="background:#16a34a;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;display:inline-block;">
          Abrir o Bolao na Copa
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      Bolao na Copa &copy; 2026 &middot; Voce recebeu este email porque criou uma conta recentemente.<br>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Descadastrar dos emails</a>
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!RESEND_API_KEY || !SUPABASE_URL) {
      return new Response(
        JSON.stringify({ error: "Variaveis de ambiente faltando" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Autenticacao via apikey header ou Authorization Bearer
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== SERVICE_KEY && apikey !== SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const diasAtras = body.dias || 7;
    const dryRun = body.dry_run === true;

    const FROM_EMAIL = "Bolao na Copa <noreply@bolaonacopa.com.br>";
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Buscar usuarios criados nos ultimos N dias
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasAtras);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome, email, email_unsubscribe_token, created_at")
      .eq("email_opt_out", false)
      .not("email", "is", null)
      .neq("email", "")
      .gte("created_at", dataLimite.toISOString())
      .order("created_at", { ascending: false });

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar profiles: " + profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const destinatarios = (profiles || []).filter((p: any) =>
      p.email && p.email.includes("@") && !p.email.toLowerCase().startsWith("fake")
    );

    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dry_run: true,
          total_destinatarios: destinatarios.length,
          emails: destinatarios.map((d: any) => ({ nome: d.nome, email: d.email, created_at: d.created_at })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalEnviados = 0;
    let totalErros = 0;
    const log: string[] = [];

    for (const dest of destinatarios) {
      const subject = `${firstName(dest.nome)}, o problema para entrar em boloes foi corrigido!`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [dest.email],
            subject,
            html: buildEmailHtml(dest.nome || "Torcedor", dest.email_unsubscribe_token),
          }),
        });

        if (res.ok) {
          totalEnviados++;
        } else {
          totalErros++;
          const errText = await res.text();
          log.push(`Erro ${dest.email}: ${errText.substring(0, 200)}`);
        }
      } catch (e) {
        totalErros++;
        log.push(`Erro ${dest.email}: ${String(e)}`);
      }

      await sleep(DELAY_MS);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        enviados: totalEnviados,
        erros: totalErros,
        total_destinatarios: destinatarios.length,
        log,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
