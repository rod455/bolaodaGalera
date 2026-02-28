// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: send-palpite-reminder
//
// Lógica: Para cada campeonato ativo, encontra o primeiro jogo
// agendado. Se faltam menos de 12h, envia email para quem
// participa de bolões desse campeonato e ainda não palpitou.
// Usa tabela email_reminders_sent para não enviar duplicado.
//
// Deploy:  supabase functions deploy send-palpite-reminder
// Invocar: supabase functions invoke send-palpite-reminder
// Cron:    configurar no Supabase Dashboard (a cada 1h)
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Bolão na Copa <noreply@bolaonacopa.com.br>";
const DELAY_MS = 600;
const HOURS_BEFORE = 12;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Template do email (sem menção a prêmios) ──
function buildEmailHtml(nome: string, campeonato: string, primeiroJogo: string, horaJogo: string): string {
  const firstName = nome?.split(" ")[0] || "Torcedor";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
      <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png" 
           alt="Bolão na Copa" style="width:60px;height:60px;margin-bottom:12px;">
      <h1 style="color:white;font-size:20px;margin:0;">Falta pouco para a rodada começar!</h1>
    </div>

    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;">
      <p style="font-size:16px;color:#1f2937;margin-top:0;">
        E aí, <strong>${firstName}</strong>! 👋
      </p>
      
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        A próxima rodada do <strong>${campeonato}</strong> começa em breve e você ainda não registrou seus palpites.
      </p>

      <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #16a34a;">
        <p style="font-size:13px;color:#15803d;margin:0;">
          ⚽ <strong>${primeiroJogo}</strong><br>
          🕐 ${horaJogo}
        </p>
      </div>

      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        Acesse o app e faça seus palpites antes que os jogos comecem. Seus amigos já estão lá!
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="https://bolaonacopa.com.br/home" 
           style="background:#16a34a;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;display:inline-block;">
          Fazer meus palpites →
        </a>
      </div>

      <p style="font-size:12px;color:#9ca3af;line-height:1.5;text-align:center;">
        Mesmo sem certeza do resultado, palpitar vale mais do que deixar em branco!
      </p>
    </div>

    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      Bolão na Copa © 2026 · Você recebeu este email porque participa de um bolão ativo.
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const limite = new Date(now.getTime() + HOURS_BEFORE * 60 * 60 * 1000);

    // ── 1. Buscar jogos agendados nas próximas 12h ──
    const { data: jogosProximos } = await supabase
      .from("jogos")
      .select("id, campeonato_id, time_a, time_b, data_hora, rodada")
      .eq("status", "agendado")
      .gt("data_hora", now.toISOString())
      .lte("data_hora", limite.toISOString())
      .order("data_hora", { ascending: true });

    if (!jogosProximos || jogosProximos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Sem jogos nas próximas 12h", enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Agrupar por campeonato (pegar o primeiro jogo de cada) ──
    const campeonatoMap = new Map<string, typeof jogosProximos[0]>();
    const jogosPorCampeonato = new Map<string, string[]>();
    
    for (const jogo of jogosProximos) {
      if (!campeonatoMap.has(jogo.campeonato_id)) {
        campeonatoMap.set(jogo.campeonato_id, jogo);
      }
      const ids = jogosPorCampeonato.get(jogo.campeonato_id) || [];
      ids.push(jogo.id);
      jogosPorCampeonato.set(jogo.campeonato_id, ids);
    }

    // ── 3. Buscar nomes dos campeonatos ──
    const campIds = [...campeonatoMap.keys()];
    const { data: campeonatos } = await supabase
      .from("campeonatos")
      .select("id, nome_popular")
      .in("id", campIds);

    const campNomes = new Map(
      (campeonatos || []).map((c: any) => [c.id, c.nome_popular])
    );

    // ── 4. Para cada campeonato, encontrar quem não palpitou ──
    let totalEnviados = 0;
    let totalErros = 0;
    const logGeral: string[] = [];

    for (const [campId, primeiroJogo] of campeonatoMap) {
      const jogoIds = jogosPorCampeonato.get(campId) || [];
      const campNome = campNomes.get(campId) || "Campeonato";

      // Bolões que incluem este campeonato
      const { data: boloesCamp } = await supabase
        .from("bolao_campeonatos")
        .select("bolao_id")
        .eq("campeonato_id", campId);

      const bolaoIds = [...new Set((boloesCamp || []).map((b: any) => b.bolao_id))];
      if (bolaoIds.length === 0) continue;

      // Participantes
      const { data: participantes } = await supabase
        .from("bolao_participantes")
        .select("user_id")
        .in("bolao_id", bolaoIds);

      const userIds = [...new Set((participantes || []).map((p: any) => p.user_id))];
      if (userIds.length === 0) continue;

      // Quem já palpitou em ALGUM jogo desta rodada
      const { data: palpites } = await supabase
        .from("palpites")
        .select("user_id")
        .in("jogo_id", jogoIds)
        .in("user_id", userIds);

      const jaPalpitaram = new Set((palpites || []).map((p: any) => p.user_id));
      const semPalpite = userIds.filter((id) => !jaPalpitaram.has(id));

      if (semPalpite.length === 0) {
        logGeral.push(`✅ ${campNome}: todos palpitaram!`);
        continue;
      }

      // ── 5. Dedup: verificar quem já recebeu email para esta rodada ──
      const rodadaKey = `${campId}_${primeiroJogo.rodada || primeiroJogo.data_hora.substring(0, 10)}`;

      const { data: jaEnviados } = await supabase
        .from("email_reminders_sent")
        .select("user_id")
        .eq("rodada_key", rodadaKey)
        .in("user_id", semPalpite);

      const jaReceberam = new Set((jaEnviados || []).map((e: any) => e.user_id));
      const paraEnviar = semPalpite.filter((id) => !jaReceberam.has(id));

      if (paraEnviar.length === 0) {
        logGeral.push(`⏭️ ${campNome}: ${semPalpite.length} sem palpite, mas já receberam email`);
        continue;
      }

      // Buscar profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", paraEnviar)
        .not("email", "is", null)
        .neq("email", "");

      const destinatarios = (profiles || []).filter((p: any) => p.email?.includes("@"));

      // Formatar info do jogo
      const jogoStr = `${primeiroJogo.time_a} x ${primeiroJogo.time_b}`;
      const horaJogo = new Date(primeiroJogo.data_hora).toLocaleString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

      // ── 6. Enviar emails ──
      for (const dest of destinatarios) {
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
              subject: `${firstName(dest.nome)}, seus palpites do ${campNome} estão pendentes`,
              html: buildEmailHtml(dest.nome || "Torcedor", campNome, jogoStr, horaJogo),
            }),
          });

          if (res.ok) {
            totalEnviados++;
            // Registrar dedup
            await supabase.from("email_reminders_sent").insert({
              user_id: dest.id,
              rodada_key: rodadaKey,
              campeonato: campNome,
            });
          } else {
            totalErros++;
            const err = await res.text();
            logGeral.push(`❌ ${dest.email}: ${err}`);
          }
        } catch (e: any) {
          totalErros++;
          logGeral.push(`❌ ${dest.email}: ${e.message}`);
        }

        await sleep(DELAY_MS);
      }

      logGeral.push(
        `📧 ${campNome}: ${destinatarios.length} emails enviados (${semPalpite.length} sem palpite, ${jaReceberam.size} já notificados antes)`
      );
    }

    return new Response(
      JSON.stringify({ ok: true, enviados: totalEnviados, erros: totalErros, log: logGeral }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erro:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper
function firstName(nome: string | null): string {
  return nome?.split(" ")[0] || "Torcedor";
}
