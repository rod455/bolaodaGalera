// ===============================================================
// Supabase Edge Function: push-palpite-urgente
//
// Roda via cron a cada 30min. Encontra jogos que comecam em
// menos de 1h e envia push notification para quem nao palpitou.
// Usa tabela push_reminders_sent para dedup.
//
// CORRIGIDO: removido insert manual de notificacoes em batch.
// send-push-notification e o unico responsavel pelo insert,
// usando referencia como protecao de dedup.
// ===============================================================

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

const HOURS_BEFORE = 1;
const BATCH_SIZE = 10;
const MAX_USERS = 200;

const MENSAGENS = [
  {
    titulo: "Falta menos de 1h! Seus palpites estao pendentes",
    corpo: "Seus amigos ja palpitaram. Nao fique para tras! Abra o app e registre seus palpites agora.",
  },
  {
    titulo: "Corre! O jogo ja vai comecar",
    corpo: "Nao deixe seus amigos passarem na frente! Faca seus palpites antes que seja tarde.",
  },
  {
    titulo: "Ultima chance de palpitar!",
    corpo: "O jogo comeca em menos de 1 hora e voce ainda nao fez seus palpites. Vai perder pontos!",
  },
  {
    titulo: "Seus amigos ja palpitaram, e voce?",
    corpo: "Falta pouco pro jogo e seus palpites estao em branco. Cada ponto conta no ranking!",
  },
];

function randomMsg() {
  return MENSAGENS[Math.floor(Math.random() * MENSAGENS.length)];
}

// Processar um lote de usuarios em paralelo
async function processarBatch(
  supabase: any,
  userIds: string[],
  dedupKey: string,
  logGeral: string[]
): Promise<{ enviados: number; semToken: number; erros: number }> {
  let enviados = 0;
  let semToken = 0;
  let erros = 0;

  // Enviar push em paralelo
  // send-push-notification e o unico responsavel pelo insert da notificacao
  // usando referencia como protecao de dedup — evita duplicatas
  const pushPromises = userIds.map(async (userId) => {
    const msg = randomMsg();
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: userId,
          tipo: "palpite_pendente",
          titulo: msg.titulo,
          mensagem: msg.corpo,
          dados: { rota: "/home" },
          referencia: `push_urgente_${dedupKey}_${userId}`,
        },
      });

      if (error) {
        erros++;
      } else if (data?.push === "sem_token") {
        semToken++;
      } else if (data?.duplicada) {
        // ja enviada, ignorar
      } else {
        enviados++;
      }
    } catch (e) {
      erros++;
      logGeral.push(`Erro usuario ${userId}: ${String(e)}`);
    }
  });

  await Promise.all(pushPromises);

  // Registrar dedup em batch
  const dedupRows = userIds.map((userId) => ({
    user_id: userId,
    rodada_key: dedupKey,
  }));
  await supabase.from("push_reminders_sent").insert(dedupRows);

  return { enviados, semToken, erros };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const now = new Date();
    const limite = new Date(now.getTime() + HOURS_BEFORE * 60 * 60 * 1000);

    // -- 1. Jogos agendados na proxima 1h --
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
        JSON.stringify({ ok: true, message: "Sem jogos na proxima 1h", enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -- 2. Agrupar por campeonato --
    const jogosPorCamp = new Map<string, string[]>();
    for (const jogo of jogosProximos) {
      const ids = jogosPorCamp.get(jogo.campeonato_id) || [];
      ids.push(jogo.id);
      jogosPorCamp.set(jogo.campeonato_id, ids);
    }

    // -- 3. Para cada campeonato, encontrar quem nao palpitou --
    const usersPendentes = new Set<string>();
    const logGeral: string[] = [];

    const campIds = [...jogosPorCamp.keys()];
    const { data: campeonatos } = await supabase
      .from("campeonatos")
      .select("id, nome_popular")
      .in("id", campIds);
    const campNomes = new Map((campeonatos || []).map((c: any) => [c.id, c.nome_popular]));

    for (const [campId, jogoIds] of jogosPorCamp) {
      const campNome = campNomes.get(campId) || "Campeonato";

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
        .in("user_id", userIds);

      const jaPalpitaram = new Set((palpites || []).map((p: any) => p.user_id));
      const semPalpite = userIds.filter((id: string) => !jaPalpitaram.has(id));

      for (const uid of semPalpite) {
        usersPendentes.add(uid);
      }

      logGeral.push(`${campNome}: ${semPalpite.length}/${userIds.length} sem palpite`);
    }

    if (usersPendentes.size === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Todos palpitaram!", enviados: 0, log: logGeral }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -- 4. Dedup --
    const dedupKey = jogosProximos.map((j: any) => j.id).sort().join("_").substring(0, 180);

    const { data: jaEnviados } = await supabase
      .from("push_reminders_sent")
      .select("user_id")
      .eq("rodada_key", dedupKey)
      .in("user_id", [...usersPendentes]);

    const jaReceberam = new Set((jaEnviados || []).map((e: any) => e.user_id));
    const paraEnviar = [...usersPendentes].filter((id) => !jaReceberam.has(id));

    if (paraEnviar.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Todos ja receberam push", enviados: 0, pendentes: usersPendentes.size, log: logGeral }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -- 5. Filtrar fakes --
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", paraEnviar);

    const usersValidos = (profiles || [])
      .filter((p: any) => !p.email?.toLowerCase().startsWith("fake"))
      .map((p: any) => p.id);

    if (usersValidos.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Nenhum usuario valido para push", enviados: 0, log: logGeral }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -- 6. Limitar e processar em batches --
    const usersParaProcessar = usersValidos.slice(0, MAX_USERS);
    logGeral.push(`${usersParaProcessar.length} usuarios para processar (limite: ${MAX_USERS})`);

    let totalEnviados = 0;
    let totalSemToken = 0;
    let totalErros = 0;

    for (let i = 0; i < usersParaProcessar.length; i += BATCH_SIZE) {
      const batch = usersParaProcessar.slice(i, i + BATCH_SIZE);
      const resultado = await processarBatch(supabase, batch, dedupKey, logGeral);
      totalEnviados += resultado.enviados;
      totalSemToken += resultado.semToken;
      totalErros += resultado.erros;
    }

    logGeral.push(`Push: ${totalEnviados} enviados, ${totalSemToken} sem token, ${totalErros} erros`);

    return new Response(
      JSON.stringify({
        ok: true,
        enviados: totalEnviados,
        sem_token: totalSemToken,
        erros: totalErros,
        usuarios_pendentes: usersPendentes.size,
        usuarios_validos: usersValidos.length,
        usuarios_processados: usersParaProcessar.length,
        ja_receberam: jaReceberam.size,
        jogos: jogosProximos.length,
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
