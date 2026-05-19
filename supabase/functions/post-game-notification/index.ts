// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: post-game-notification
//
// Roda via cron a cada ~30min. Aguarda todos os jogos de uma
// janela/campeonato encerrarem e envia 1 push consolidado
// por usuario por campeonato com o resumo de todos os jogos.
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELAY_MS = 200;
const LOOKBACK_HOURS = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Construir mensagem consolidada ──
function buildConsolidado(
  campNome: string,
  jogos: { timeA: string; timeB: string; placarA: number; placarB: number; pontos: number | null }[],
  posicao: number | null,
  totalPart: number
): { titulo: string; mensagem: string } {
  const totalPontos = jogos.reduce((sum, j) => sum + (j.pontos || 0), 0);
  const temExato = jogos.some((j) => j.pontos !== null && j.pontos >= 10);
  const resultados = jogos
    .map((j) => `${j.timeA} ${j.placarA}x${j.placarB} ${j.timeB} (${j.pontos ?? 0}pts)`)
    .join(" | ");

  if (jogos.length === 1) {
    const j = jogos[0];
    const resultado = `${j.timeA} ${j.placarA} x ${j.placarB} ${j.timeB}`;
    if (temExato) {
      return {
        titulo: `🎯 PLACAR EXATO! ${resultado}`,
        mensagem: `Incrível! +${totalPontos} pts no ${campNome}! ${posicao ? `Você está em ${posicao}º de ${totalPart}.` : ""}`,
      };
    }
    if (totalPontos > 0) {
      return {
        titulo: `⚽ ${resultado} — +${totalPontos} pts!`,
        mensagem: `${posicao ? `Você está em ${posicao}º de ${totalPart} no ${campNome}.` : `Confira o ranking do ${campNome}!`}`,
      };
    }
    return {
      titulo: `⚽ ${resultado} — 0 pts`,
      mensagem: `Não foi dessa vez no ${campNome}. ${posicao ? `Você está em ${posicao}º.` : ""} A próxima rodada pode mudar tudo!`,
    };
  }

  // Múltiplos jogos
  if (temExato) {
    return {
      titulo: `🎯 ${campNome} — +${totalPontos} pts com placar exato!`,
      mensagem: `${jogos.length} jogos encerraram. ${resultados}. ${posicao ? `Você está em ${posicao}º de ${totalPart}.` : ""}`,
    };
  }
  if (totalPontos > 0) {
    return {
      titulo: `⚽ ${campNome} — +${totalPontos} pts em ${jogos.length} jogos!`,
      mensagem: `${resultados}. ${posicao ? `Você está em ${posicao}º de ${totalPart}.` : "Confira o ranking!"}`,
    };
  }
  return {
    titulo: `⚽ ${campNome} — ${jogos.length} jogos encerraram`,
    mensagem: `${resultados}. ${posicao ? `Você está em ${posicao}º.` : ""} A próxima rodada pode mudar tudo!`,
  };
}

// ── Processamento em background ──
async function processarNotificacoes(supabase: any, jogosPorCamp: Map<string, any[]>, campNomes: Map<string, string>) {
  let totalEnviados = 0;
  let totalSkipped = 0;
  const logGeral: string[] = [];

  for (const [campId, jogos] of jogosPorCamp) {
    const campNome = campNomes.get(campId) || "Campeonato";
    const jogoIds = jogos.map((j: any) => j.id);

    // Dedup key: todos os jogos desse campeonato nessa janela
    const dedupBase = jogoIds.sort().join("_").substring(0, 150);

    // Buscar bolões desse campeonato
    const { data: bcData } = await supabase
      .from("bolao_campeonatos")
      .select("bolao_id")
      .eq("campeonato_id", campId);

    const bolaoIds = [...new Set((bcData || []).map((b: any) => b.bolao_id))];
    if (bolaoIds.length === 0) continue;

    // Coletar todos os participantes (dedup por user)
    const userBolaoMap = new Map<string, { bolaoId: string; posicao: number | null; totalPart: number }>();

    for (const bolaoId of bolaoIds) {
      const { data: participantes } = await supabase
        .from("bolao_participantes")
        .select("user_id, posicao_ranking")
        .eq("bolao_id", bolaoId);

      if (!participantes || participantes.length === 0) continue;
      const totalPart = participantes.length;

      for (const part of participantes) {
        // Guardar o primeiro bolão encontrado para cada user (para rota)
        if (!userBolaoMap.has(part.user_id)) {
          userBolaoMap.set(part.user_id, {
            bolaoId,
            posicao: part.posicao_ranking,
            totalPart,
          });
        }
      }
    }

    // Para cada usuário único, buscar pontos em todos os jogos
    for (const [userId, info] of userBolaoMap) {
      const referencia = `postgame_consolidated_${campId}_${dedupBase}_${userId}`;

      // Buscar pontos do usuário em todos os jogos dessa janela
      const { data: palpites } = await supabase
        .from("palpites")
        .select("jogo_id, pontos")
        .eq("user_id", userId)
        .in("jogo_id", jogoIds);

      const palpiteMap = new Map((palpites || []).map((p: any) => [p.jogo_id, p.pontos]));

      const jogosComPontos = jogos.map((j: any) => ({
        timeA: j.time_a,
        timeB: j.time_b,
        placarA: j.placar_time_a,
        placarB: j.placar_time_b,
        pontos: palpiteMap.get(j.id) ?? null,
      }));

      const { titulo, mensagem } = buildConsolidado(
        campNome,
        jogosComPontos,
        info.posicao,
        info.totalPart
      );

      try {
        const { error } = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            tipo: "jogo_encerrado",
            titulo,
            mensagem,
            dados: {
              rota: `/bolao/${info.bolaoId}`,
              bolao_id: info.bolaoId,
            },
            referencia,
          },
        });

        if (error) totalSkipped++;
        else totalEnviados++;
      } catch (_e) {
        totalSkipped++;
      }

      await sleep(DELAY_MS);
    }

    const resultados = jogos.map((j: any) => `${j.time_a} ${j.placar_time_a}x${j.placar_time_b} ${j.time_b}`).join(", ");
    logGeral.push(`✅ ${campNome}: ${jogos.length} jogos (${resultados}) → ${userBolaoMap.size} usuarios`);
  }

  console.log(`🎉 Concluído: ${totalEnviados} enviados, ${totalSkipped} skipped`);
  logGeral.forEach((l) => console.log(l));
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
    const lookback = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

    // ── 1. Jogos encerrados nas últimas horas ──
    const { data: jogosEncerrados } = await supabase
      .from("jogos")
      .select("id, time_a, time_b, placar_time_a, placar_time_b, campeonato_id, data_hora")
      .eq("status", "encerrado")
      .gte("data_hora", lookback.toISOString())
      .order("data_hora", { ascending: false });

    if (!jogosEncerrados || jogosEncerrados.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Sem jogos recém-encerrados", enviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Agrupar por campeonato ──
    const jogosPorCamp = new Map<string, any[]>();
    for (const jogo of jogosEncerrados) {
      const lista = jogosPorCamp.get(jogo.campeonato_id) || [];
      lista.push(jogo);
      jogosPorCamp.set(jogo.campeonato_id, lista);
    }

    // ── 3. Verificar se a janela de cada campeonato fechou ──
    // Só envia se NÃO tem mais jogos em andamento ou agendados
    // para hoje nesse campeonato
    const hoje = now.toISOString().substring(0, 10); // YYYY-MM-DD
    // Buffer de 4h para cobrir fuso BRT (UTC-3) + margem
    const fimDoDia = new Date(new Date(`${hoje}T23:59:59.999Z`).getTime() + 4 * 60 * 60 * 1000).toISOString();
    const campsProntos = new Map<string, any[]>();
    const campsAguardando: string[] = [];

    const campIds = [...jogosPorCamp.keys()];
    const { data: campeonatos } = await supabase
      .from("campeonatos")
      .select("id, nome_popular")
      .in("id", campIds);
    const campNomes = new Map((campeonatos || []).map((c: any) => [c.id, c.nome_popular]));

    for (const [campId, jogosEncerradosCamp] of jogosPorCamp) {
      const campNome = campNomes.get(campId) || "Campeonato";

      // Verificar se ainda tem jogos em andamento OU agendados hoje
      const { data: jogosRestantes } = await supabase
        .from("jogos")
        .select("id, status")
        .eq("campeonato_id", campId)
        .in("status", ["ao_vivo", "agendado"])
        .gte("data_hora", lookback.toISOString())
        .lte("data_hora", fimDoDia)
        .limit(1);

      if (jogosRestantes && jogosRestantes.length > 0) {
        campsAguardando.push(`${campNome}: ainda tem jogos pendentes`);
        continue;
      }

      // Janela fechou — todos os jogos desse campeonato hoje terminaram
      campsProntos.set(campId, jogosEncerradosCamp);
    }

    if (campsProntos.size === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "Aguardando janelas fecharem",
          enviados: 0,
          aguardando: campsAguardando,
          jogos_encerrados: jogosEncerrados.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Processar em background ──
    const responseData = {
      ok: true,
      message: "Processando em background",
      campeonatos_prontos: campsProntos.size,
      campeonatos_aguardando: campsAguardando.length,
      aguardando: campsAguardando,
    };

    // @ts-ignore - EdgeRuntime disponível no ambiente Supabase
    EdgeRuntime.waitUntil(processarNotificacoes(supabase, campsProntos, campNomes));

    return new Response(
      JSON.stringify(responseData),
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

