// =================================================================
// Supabase Edge Function: send-palpite-reminder
// Filtro email_opt_out: nao envia para quem se descadastrou.
// =================================================================

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
  };
}

const DELAY_MS = 600;
const HOURS_BEFORE = 12;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firstName(nome: string | null): string {
  return nome?.split(" ")[0] || "Torcedor";
}

function buildEmailHtml(
  nome: string,
  pendencias: { campeonato: string; jogo: string; hora: string }[],
  unsubscribeToken: string
): string {
  const name = firstName(nome);
  const unsubscribeUrl = `https://bolaonacopa.com.br/unsubscribe?token=${unsubscribeToken}`;

  const jogosHtml = pendencias.map((p) => `
    <div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;margin:8px 0;border-left:4px solid #16a34a;">
      <p style="font-size:13px;color:#15803d;margin:0;font-weight:700;">${p.campeonato}</p>
      <p style="font-size:12px;color:#4b5563;margin:4px 0 0;">&#9917; ${p.jogo} - ${p.hora}</p>
    </div>
  `).join("");

  const plural = pendencias.length > 1;

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
      <h1 style="color:white;font-size:20px;margin:0;">${plural ? "Seus palpites estao pendentes!" : "Falta pouco para a rodada!"}</h1>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;">
      <p style="font-size:16px;color:#1f2937;margin-top:0;">E ai, <strong>${name}</strong>!</p>
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        ${plural
          ? "Voce tem palpites pendentes em mais de um campeonato. Os jogos comecam em breve!"
          : `A proxima rodada do <strong>${pendencias[0].campeonato}</strong> comeca em breve e voce ainda nao fez seus palpites.`
        }
      </p>
      ${jogosHtml}
      <p style="font-size:14px;color:#4b5563;line-height:1.7;margin-top:16px;">
        Acesse o app e registre seus palpites antes que os jogos comecem!
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://bolaonacopa.com.br/home" 
           style="background:#16a34a;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;display:inline-block;">
          Fazer meus palpites
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;line-height:1.5;text-align:center;">
        Mesmo sem certeza do resultado, palpitar vale mais do que deixar em branco!
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      Bolao na Copa &copy; 2026 &middot; Voce recebeu este email porque participa de um bolao ativo.<br>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Descadastrar dos emails de engajamento</a>
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const FROM_EMAIL = "Bolao na Copa <noreply@bolaonacopa.com.br>";
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const limite = new Date(now.getTime() + HOURS_BEFORE * 60 * 60 * 1000);

    // -- 1. Jogos agendados nas proximas 12h --
    const { data: jogosProximos, error: jogosError } = await supabase
      .from("jogos")
      .select("id, campeonato_id, time_a, time_b, data_hora, rodada")
      .eq("status", "agendado")
      .gt("data_hora", now.toISOString())
      .lte("data_hora", limite.toISOString())
      .order("data_hora", { ascending: true });

    if (jogosError) {
      return new Response(
        JSON.stringify({ error: "Erro jogos: " + jogosError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!jogosProximos || jogosProximos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Sem jogos nas proximas 12h", enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -- 2. Agrupar por campeonato --
    const campeonatoMap = new Map<string, any>();
    const jogosPorCamp = new Map<string, string[]>();

    for (const jogo of jogosProximos) {
      if (!campeonatoMap.has(jogo.campeonato_id)) {
        campeonatoMap.set(jogo.campeonato_id, jogo);
      }
      const ids = jogosPorCamp.get(jogo.campeonato_id) || [];
      ids.push(jogo.id);
      jogosPorCamp.set(jogo.campeonato_id, ids);
    }

    // -- 3. Nomes dos campeonatos --
    const campIds = [...campeonatoMap.keys()];
    const { data: campeonatos } = await supabase
      .from("campeonatos")
      .select("id, nome_popular")
      .in("id", campIds);

    const campNomes = new Map(
      (campeonatos || []).map((c: any) => [c.id, c.nome_popular])
    );

    // -- 4. Para cada campeonato, montar mapa userId -> pendencias --
    const userPendencias = new Map<string, { campeonato: string; jogo: string; hora: string; rodadaKey: string }[]>();
    const logGeral: string[] = [];

    for (const [campId, primeiroJogo] of campeonatoMap) {
      const jogoIds = jogosPorCamp.get(campId) || [];
      const campNome = campNomes.get(campId) || "Campeonato";
      const rodadaKey = `${campId}_${primeiroJogo.rodada || primeiroJogo.data_hora.substring(0, 10)}`;

      const { data: boloesCamp } = await supabase
        .from("bolao_campeonatos")
        .select("bolao_id")
        .eq("campeonato_id", campId);

      const bolaoIds = [...new Set((boloesCamp || []).map((b: any) => b.bolao_id))];
      if (bolaoIds.length === 0) continue;

      const { data: participantes } = await supabase
        .from("bolao_participantes")
        .select("user_id")
        .in("bolao_id", bolaoIds);

      const userIds = [...new Set((participantes || []).map((p: any) => p.user_id))];
      if (userIds.length === 0) continue;

      const { data: palpites } = await supabase
        .from("palpites")
        .select("user_id")
        .in("jogo_id", jogoIds)
        .in("bolao_id", bolaoIds)
        .in("user_id", userIds);

      const jaPalpitaram = new Set((palpites || []).map((p: any) => p.user_id));
      const semPalpite = userIds.filter((id: string) => !jaPalpitaram.has(id));

      if (semPalpite.length === 0) {
        logGeral.push(`Todos palpitaram no ${campNome}!`);
        continue;
      }

      const { data: jaEnviados } = await supabase
        .from("email_reminders_sent")
        .select("user_id")
        .eq("rodada_key", rodadaKey)
        .in("user_id", semPalpite);

      const jaReceberam = new Set((jaEnviados || []).map((e: any) => e.user_id));
      const paraEnviar = semPalpite.filter((id: string) => !jaReceberam.has(id));

      const jogoStr = `${primeiroJogo.time_a} x ${primeiroJogo.time_b}`;
      const horaJogo = new Date(primeiroJogo.data_hora).toLocaleString("pt-BR", {
        weekday: "long", day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });

      for (const userId of paraEnviar) {
        const lista = userPendencias.get(userId) || [];
        lista.push({ campeonato: campNome, jogo: jogoStr, hora: horaJogo, rodadaKey });
        userPendencias.set(userId, lista);
      }

      logGeral.push(`${campNome}: ${paraEnviar.length} para notificar (${jaReceberam.size} ja receberam)`);
    }

    // -- 5. Buscar profiles com email valido e que NAO fizeram opt_out --
    const allUserIds = [...userPendencias.keys()];

    if (allUserIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Ninguem para notificar", enviados: 0, log: logGeral }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, email, email_unsubscribe_token")
      .in("id", allUserIds)
      .eq("email_opt_out", false)
      .not("email", "is", null)
      .neq("email", "");

    const destinatarios = (profiles || []).filter((p: any) =>
      p.email && p.email.includes("@") && !p.email.toLowerCase().startsWith("fake")
    );

    // -- 6. Enviar 1 email por usuario --
    let totalEnviados = 0;
    let totalErros = 0;

    for (const dest of destinatarios) {
      const pendencias = userPendencias.get(dest.id);
      if (!pendencias || pendencias.length === 0) continue;

      const campNames = pendencias.map((p) => p.campeonato);
      const subject = campNames.length === 1
        ? `${firstName(dest.nome)}, seus palpites do ${campNames[0]} estao pendentes`
        : `${firstName(dest.nome)}, voce tem palpites pendentes em ${campNames.length} campeonatos`;

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
            html: buildEmailHtml(dest.nome || "Torcedor", pendencias, dest.email_unsubscribe_token),
          }),
        });

        if (res.ok) {
          totalEnviados++;
          for (const p of pendencias) {
            await supabase.from("email_reminders_sent").insert({
              user_id: dest.id,
              rodada_key: p.rodadaKey,
              campeonato: p.campeonato,
            }).then(() => {});
          }
          const tituloNotif = campNames.length === 1
            ? `Palpites pendentes - ${campNames[0]}`
            : `Palpites pendentes em ${campNames.length} campeonatos`;
          const mensagemNotif = campNames.length === 1
            ? `${pendencias[0].jogo} comeca ${pendencias[0].hora}. Faca seus palpites!`
            : `Voce tem jogos sem palpite em: ${campNames.join(", ")}. Nao perca pontos!`;
          await supabase.from("notificacoes").insert({
            user_id: dest.id,
            tipo: "palpite_pendente",
            titulo: tituloNotif,
            mensagem: mensagemNotif,
            dados: { rota: "/home" },
            lida: false,
            push_enviada: false,
          }).then(() => {});
        } else {
          totalErros++;
          const errText = await res.text();
          logGeral.push(`Erro ${dest.email}: ${errText.substring(0, 200)}`);
        }
      } catch (e) {
        totalErros++;
        logGeral.push(`Erro ${dest.email}: ${String(e)}`);
      }

      await sleep(DELAY_MS);
    }

    logGeral.push(`Total: ${totalEnviados} emails enviados para ${destinatarios.length} usuarios`);

    return new Response(
      JSON.stringify({
        ok: true,
        enviados: totalEnviados,
        erros: totalErros,
        usuarios_pendentes: allUserIds.length,
        usuarios_com_email: destinatarios.length,
        jogos_encontrados: jogosProximos.length,
        campeonatos: campIds.length,
        log: logGeral,
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
