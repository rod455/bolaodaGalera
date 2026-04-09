// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: push-novo-quiz
//
// Push para anunciar novo quiz — dispara 12h após lançamento
// - Só para usuários com bolão (engajados)
// - Respeita limite de 3 pushs/semana (tipo copa)
// - Parâmetro: quiz_id, quiz_nome, quiz_rota
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_PUSHS_SEMANA = 3;

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Autenticação — aceita service role key de qualquer env var
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader.replace("Bearer ", "");
    const validKeys = [
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      Deno.env.get("CUSTOM_SERVICE_KEY"),
    ].filter(Boolean);
    if (!validKeys.some((k) => k === token || k === apikey)) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    const quizId = body.quiz_id || "quiz_jogador";
    const quizNome = body.quiz_nome || "Qual jogador você seria na vida?";
    const quizRota = body.quiz_rota || "/quiz/jogador";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();

    // Buscar usuários com push token ativo
    const { data: tokensData } = await supabase
      .from("push_tokens")
      .select("user_id")
      .eq("ativo", true);

    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum token ativo" }), {
        headers: corsHeaders,
      });
    }

    const userIds = [...new Set(tokensData.map((t: any) => t.user_id))];

    // Verificar limite de 3 pushs/semana (tipo copa)
    const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPushs } = await supabase
      .from("notificacoes")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", seteDiasAtras)
      .like("referencia", "copa_%");

    const pushCount: Record<string, number> = {};
    (recentPushs || []).forEach((n: any) => {
      pushCount[n.user_id] = (pushCount[n.user_id] || 0) + 1;
    });

    const elegiveisIds = userIds.filter((uid) => (pushCount[uid] || 0) < MAX_PUSHS_SEMANA);

    // Filtrar: quem participa de algum bolão (incluindo nacionais)
    const { data: participantesData } = await supabase
      .from("bolao_participantes")
      .select("user_id")
      .in("user_id", elegiveisIds);

    const temBolao = new Set((participantesData || []).map((p: any) => p.user_id));
    const elegiveisComBolao = body.enviar_para_todos
      ? elegiveisIds
      : elegiveisIds.filter((uid) => temBolao.has(uid));

    if (elegiveisComBolao.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum usuario elegivel" }), {
        headers: corsHeaders,
      });
    }

    let enviados = 0;
    let erros = 0;

    for (const userId of elegiveisComBolao) {
      const referencia = `copa_quiz_${quizId}_${userId.substring(0, 8)}`;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            tipo: "novo_quiz",
            titulo: `🆕 Novo Quiz: ${quizNome}`,
            mensagem: "Responda e descubra seu resultado! Compartilhe com os amigos do bolão.",
            dados: { rota: quizRota },
            referencia,
          }),
        });

        if (res.ok) enviados++;
        else erros++;
      } catch {
        erros++;
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    const resultado = {
      ok: true,
      quiz_id: quizId,
      total_elegiveis: elegiveisComBolao.length,
      enviados,
      erros,
    };

    console.log("[Novo Quiz Push]", JSON.stringify(resultado));

    return new Response(JSON.stringify(resultado), { headers: corsHeaders });
  } catch (err) {
    console.error("[Novo Quiz Push] Erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
