// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: notify-lonely-creators
//
// Roda 1x por semana. Encontra usuarios que criaram boloes
// mas estao sozinhos (1 participante). Se tem jogo nos proximos
// 2 dias, envia notificacao in-app + push incentivando convite.
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
  };
}

const DIAS_ANTES = 2;

const MENSAGENS = [
  {
    titulo: "🏆 Convide seus amigos e ganhe Premium grátis!",
    mensagem: "Seu bolão está esperando mais jogadores! Compartilhe com amigos no WhatsApp e ganhe acesso Premium quando 3 amigos entrarem.",
  },
  {
    titulo: "⚽ Seu bolão precisa de mais jogadores!",
    mensagem: "Tem jogo chegando e você está sozinho no bolão! Convide amigos e ganhe Premium grátis. Quanto mais gente, mais diversão!",
  },
  {
    titulo: "👥 Chame a galera pro seu bolão!",
    mensagem: "Bolão bom é bolão cheio! Compartilhe o código com amigos e ganhe Premium quando 3 entrarem. O próximo jogo já é daqui a pouco!",
  },
];

function randomMsg() {
  return MENSAGENS[Math.floor(Math.random() * MENSAGENS.length)];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: aceita SUPABASE_SERVICE_ROLE_KEY ou CUSTOM_SERVICE_KEY ──
    const validKeys = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CUSTOM_SERVICE_KEY")].filter(Boolean);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (validKeys.length === 0 || !validKeys.includes(token)) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    if (!SUPABASE_URL) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_URL nao configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("CUSTOM_SERVICE_KEY")!;
    const supabase = createClient(SUPABASE_URL, serviceKey);
    const logGeral: string[] = [];

    // ── 1. Bolões com exatamente 1 participante (o criador) ──
    const { data: boloesSolitarios, error: boloesErr } = await supabase
      .rpc("get_lonely_boloes");

    // Se a RPC não existe, fazer a query manualmente
    let boloes: any[] = [];
    if (boloesErr || !boloesSolitarios) {
      // Query manual: bolões com 1 participante, não nacionais
      const { data: allBoloes } = await supabase
        .from("boloes")
        .select("id, nome, criador_id, campeonato_id, codigo_convite")
        .eq("is_nacional", false);

      if (allBoloes && allBoloes.length > 0) {
        for (const bolao of allBoloes) {
          const { count } = await supabase
            .from("bolao_participantes")
            .select("*", { count: "exact", head: true })
            .eq("bolao_id", bolao.id);

          if (count === 1) {
            boloes.push(bolao);
          }
        }
      }
    } else {
      boloes = boloesSolitarios;
    }

    if (boloes.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Nenhum bolao solitario encontrado", enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logGeral.push(`📋 ${boloes.length} boloes com 1 participante encontrados`);

    // ── 2. Verificar quais tem jogo nos proximos 2 dias ──
    const now = new Date();
    const limite = new Date(now.getTime() + DIAS_ANTES * 24 * 60 * 60 * 1000);
    let totalNotificados = 0;
    let totalPush = 0;
    let totalSemJogo = 0;

    for (const bolao of boloes) {
      if (!bolao.campeonato_id) {
        totalSemJogo++;
        continue;
      }

      // Verificar multi-campeonato
      const { data: bcData } = await supabase
        .from("bolao_campeonatos")
        .select("campeonato_id")
        .eq("bolao_id", bolao.id);

      const campIds = bcData && bcData.length > 0
        ? bcData.map((bc: any) => bc.campeonato_id)
        : [bolao.campeonato_id];

      // Tem jogo nos proximos 2 dias?
      const { data: jogos } = await supabase
        .from("jogos")
        .select("id, time_a, time_b, data_hora")
        .in("campeonato_id", campIds)
        .eq("status", "agendado")
        .gt("data_hora", now.toISOString())
        .lte("data_hora", limite.toISOString())
        .order("data_hora", { ascending: true })
        .limit(1);

      if (!jogos || jogos.length === 0) {
        totalSemJogo++;
        continue;
      }

      const proximoJogo = jogos[0];

      // ── 3. Verificar dedup (não enviar mais de 1x por semana por bolão) ──
      const { data: jaNotificou } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("user_id", bolao.criador_id)
        .eq("tipo", "convite_bolao")
        .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (jaNotificou && jaNotificou.length > 0) {
        continue; // Já recebeu esta semana
      }

      // ── 4. Filtrar fakes ──
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("id", bolao.criador_id)
        .single();

      if (!profile || profile.email?.toLowerCase().startsWith("fake")) {
        continue;
      }

      // ── 5. Criar notificação in-app ──
      const msg = randomMsg();
      const rota = `/bolao/${bolao.id}`;

      const { error: notifErr } = await supabase
        .from("notificacoes")
        .insert({
          user_id: bolao.criador_id,
          tipo: "convite_bolao",
          titulo: msg.titulo,
          mensagem: msg.mensagem,
          dados: {
            bolao_id: bolao.id,
            bolao_nome: bolao.nome,
            codigo_convite: bolao.codigo_convite,
            proximo_jogo: `${proximoJogo.time_a} x ${proximoJogo.time_b}`,
            rota,
          },
          lida: false,
          push_enviada: false,
        });

      if (notifErr) {
        logGeral.push(`❌ Notificação ${bolao.nome}: ${notifErr.message}`);
        continue;
      }

      totalNotificados++;

      // ── 6. Enviar push também ──
      try {
        const { data: pushResult, error: pushErr } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: bolao.criador_id,
            tipo: "convite_bolao",
            titulo: msg.titulo,
            mensagem: msg.mensagem,
            dados: { rota },
            referencia: `lonely_${bolao.id}_${now.toISOString().substring(0, 10)}`,
          },
        });

        if (!pushErr && pushResult && !pushResult.duplicada && pushResult.push !== "sem_token") {
          totalPush++;
        }
      } catch (_e) {
        // Push é best-effort, não falha a rotina
      }

      logGeral.push(`✅ ${bolao.nome} → ${profile.nome || profile.email} (jogo: ${proximoJogo.time_a} x ${proximoJogo.time_b})`);
    }

    logGeral.push(`📊 Total: ${totalNotificados} notificados, ${totalPush} push, ${totalSemJogo} sem jogo próximo`);

    return new Response(
      JSON.stringify({
        ok: true,
        boloes_solitarios: boloes.length,
        notificados: totalNotificados,
        push_enviados: totalPush,
        sem_jogo_proximo: totalSemJogo,
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

