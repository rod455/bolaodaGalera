// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: push-copa-countdown
//
// Push semanal de contagem regressiva da Copa + CTA de convite
// - Usuários COM bolão → incentiva convidar amigos
// - Usuários SEM bolão → incentiva criar e convidar
// - Respeita limite de 3 pushs/semana por usuário (tipo copa)
// - Roda toda segunda-feira às 12h BRT via GitHub Actions
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const COPA_DATE = new Date("2026-06-11T00:00:00Z");
const MAX_PUSHS_SEMANA = 3;
const TIPO_REFERENCIA = "copa_countdown";

const ALLOWED_ORIGINS = [
  "https://bolaonacopa.com.br",
  "https://www.bolaonacopa.com.br",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Mensagens variadas para não repetir
const MENSAGENS_COM_BOLAO = [
  {
    titulo: "⚽ Copa em {dias} dias!",
    mensagem: "Seu bolão já tem participantes, mas dá tempo de chamar mais! Compartilhe o código e dispute com a galera.",
  },
  {
    titulo: "🏆 Faltam {dias} dias para a Copa!",
    mensagem: "Quanto mais amigos no bolão, mais divertido fica. Mande o convite agora!",
  },
  {
    titulo: "🔥 Contagem regressiva: {dias} dias!",
    mensagem: "A Copa está chegando! Chame aquele amigo que acha que entende de futebol pro bolão.",
  },
  {
    titulo: "⏰ {dias} dias para o primeiro jogo!",
    mensagem: "Seu bolão precisa de mais gente! Compartilhe o link e monte o grupo dos palpiteiros.",
  },
];

const MENSAGENS_SEM_BOLAO = [
  {
    titulo: "⚽ Copa em {dias} dias — cadê seu bolão?",
    mensagem: "Crie seu bolão em 10 segundos e convide seus amigos. Quem acerta mais lidera o ranking!",
  },
  {
    titulo: "🏆 Faltam {dias} dias! Crie seu bolão!",
    mensagem: "Ainda dá tempo de montar o melhor bolão entre amigos. Crie agora e compartilhe!",
  },
  {
    titulo: "🔥 {dias} dias para a Copa — sem bolão?",
    mensagem: "Não vai ficar de fora, né? Crie seu bolão grátis e desafie a galera!",
  },
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Autenticação
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (token !== SERVICE_KEY && apikey !== SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const diasParaCopa = Math.max(0, Math.ceil((COPA_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (diasParaCopa === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Copa ja comecou, push desativado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar usuários com push token ativo
    const { data: tokensData } = await supabase
      .from("push_tokens")
      .select("user_id")
      .eq("ativo", true);

    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum token ativo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(tokensData.map((t: any) => t.user_id))];

    // Verificar limite de 3 pushs/semana por usuário (tipo copa)
    const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPushs } = await supabase
      .from("notificacoes")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", seteDiasAtras)
      .like("referencia", "copa_%");

    // Contar pushs por user nos últimos 7 dias
    const pushCount: Record<string, number> = {};
    (recentPushs || []).forEach((n: any) => {
      pushCount[n.user_id] = (pushCount[n.user_id] || 0) + 1;
    });

    // Filtrar quem pode receber (< MAX_PUSHS_SEMANA)
    const elegiveisIds = userIds.filter((uid) => (pushCount[uid] || 0) < MAX_PUSHS_SEMANA);

    if (elegiveisIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Todos ja atingiram limite semanal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar quem tem bolão privado criado
    const { data: criadoresData } = await supabase
      .from("boloes")
      .select("criador_id")
      .eq("is_nacional", false)
      .in("criador_id", elegiveisIds);

    const criadores = new Set((criadoresData || []).map((b: any) => b.criador_id));

    // Verificar quem participa de algum bolão privado
    const { data: participantesData } = await supabase
      .from("bolao_participantes")
      .select("user_id, boloes(is_nacional)")
      .in("user_id", elegiveisIds);

    const temBolaoPrivado = new Set<string>();
    (participantesData || []).forEach((p: any) => {
      if (p.boloes && !p.boloes.is_nacional) {
        temBolaoPrivado.add(p.user_id);
      }
    });

    // Buscar o bolão privado de cada usuário para o CTA
    const { data: participacoesData } = await supabase
      .from("bolao_participantes")
      .select("user_id, bolao_id, boloes(is_nacional)")
      .in("user_id", elegiveisIds);

    // Mapa user_id → primeiro bolão privado
    const userBolao: Record<string, string> = {};
    (participacoesData || []).forEach((p: any) => {
      if (p.boloes && !p.boloes.is_nacional && !userBolao[p.user_id]) {
        userBolao[p.user_id] = p.bolao_id;
      }
    });

    // Enviar push para cada usuário elegível
    let enviados = 0;
    let erros = 0;
    const semana = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

    for (const userId of elegiveisIds) {
      const temBolao = temBolaoPrivado.has(userId) || criadores.has(userId);
      const msgs = temBolao ? MENSAGENS_COM_BOLAO : MENSAGENS_SEM_BOLAO;
      const msg = msgs[semana % msgs.length];

      const titulo = msg.titulo.replace("{dias}", String(diasParaCopa));
      const mensagem = msg.mensagem.replace("{dias}", String(diasParaCopa));
      const referencia = `${TIPO_REFERENCIA}_${diasParaCopa}d_${userId.substring(0, 8)}`;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            tipo: "copa_countdown",
            titulo,
            mensagem,
            dados: { rota: temBolao && userBolao[userId] ? `/bolao/${userBolao[userId]}` : "/criar" },
            referencia,
          }),
        });

        if (res.ok) {
          enviados++;
        } else {
          erros++;
        }
      } catch {
        erros++;
      }

      // Rate limit: 100ms entre cada push
      await new Promise((r) => setTimeout(r, 100));
    }

    const resultado = {
      ok: true,
      dias_para_copa: diasParaCopa,
      total_elegiveis: elegiveisIds.length,
      com_bolao: temBolaoPrivado.size,
      sem_bolao: elegiveisIds.length - temBolaoPrivado.size,
      enviados,
      erros,
    };

    console.log("[Copa Countdown]", JSON.stringify(resultado));

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Copa Countdown] Erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
