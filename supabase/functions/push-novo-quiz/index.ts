// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: push-novo-quiz
// Push para anunciar novo quiz — com FCM direto (sem chamar outra edge function)
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_PUSHS_SEMANA = 3;

// ── Firebase Auth ──
async function getFirebaseAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const privateKeyPem = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const headerB64 = enc({ alg: "RS256", typ: "JWT" });
  const payloadB64 = enc({ iss: clientEmail, sub: clientEmail, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/firebase.messaging" });
  const toSign = `${headerB64}.${payloadB64}`;
  const pemBody = privateKeyPem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${toSign}.${sigB64}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendFCM(accessToken: string, fcmToken: string, title: string, body: string, data: Record<string, string> = {}): Promise<boolean> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: fcmToken, notification: { title, body }, data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" }, android: { priority: "high", notification: { channel_id: "bolao_default", icon: "ic_notification", color: "#2E7D32" } } } }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (err.includes("UNREGISTERED") || err.includes("INVALID_ARGUMENT")) return false;
  }
  return res.ok;
}

serve(async (req) => {
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Auth
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const validKeys = [Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("CUSTOM_SERVICE_KEY")].filter(Boolean);
    if (!validKeys.some((k) => k === token || k === apikey)) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const quizId = body.quiz_id || "quiz_jogador";
    const quizNome = body.quiz_nome || "Qual jogador você seria na vida?";
    const quizRota = body.quiz_rota || "/quiz/jogador";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date();

    // Buscar tokens ativos
    const { data: tokensData } = await supabase.from("push_tokens").select("user_id, token").eq("ativo", true);
    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum token ativo" }), { headers: corsHeaders });
    }

    // Agrupar tokens por user
    const userTokens: Record<string, string[]> = {};
    tokensData.forEach((t: any) => {
      if (!userTokens[t.user_id]) userTokens[t.user_id] = [];
      userTokens[t.user_id].push(t.token);
    });
    const userIds = Object.keys(userTokens);

    // Limite 3 pushs/semana
    const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPushs } = await supabase.from("notificacoes").select("user_id").in("user_id", userIds).gte("created_at", seteDiasAtras).like("referencia", "copa_%");
    const pushCount: Record<string, number> = {};
    (recentPushs || []).forEach((n: any) => { pushCount[n.user_id] = (pushCount[n.user_id] || 0) + 1; });
    const elegiveisIds = userIds.filter((uid) => (pushCount[uid] || 0) < MAX_PUSHS_SEMANA);

    if (elegiveisIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Todos ja atingiram limite semanal" }), { headers: corsHeaders });
    }

    // Filtrar por bolão se necessário
    let finalIds = elegiveisIds;
    if (!body.enviar_para_todos) {
      const { data: participantesData } = await supabase.from("bolao_participantes").select("user_id").in("user_id", elegiveisIds);
      const temBolao = new Set((participantesData || []).map((p: any) => p.user_id));
      finalIds = elegiveisIds.filter((uid) => temBolao.has(uid));
    }

    const titulo = `🆕 Novo Quiz: ${quizNome}`;
    const mensagem = "Responda e descubra seu resultado! Compartilhe com os amigos do bolão.";

    // Obter token Firebase uma vez
    let accessToken: string;
    try {
      accessToken = await getFirebaseAccessToken();
    } catch (err) {
      console.error("[Novo Quiz] Firebase auth failed:", err);
      return new Response(JSON.stringify({ error: "Firebase auth failed" }), { status: 500, headers: corsHeaders });
    }

    let enviados = 0;
    let pushEnviados = 0;
    let erros = 0;

    // Processar em batches
    for (let i = 0; i < finalIds.length; i += 50) {
      const batch = finalIds.slice(i, i + 50);

      // Inserir notificações in-app
      const notificacoes = batch.map((userId) => ({
        user_id: userId,
        tipo: "novo_quiz",
        titulo,
        mensagem,
        dados: { rota: quizRota },
        referencia: `copa_quiz_${quizId}_${userId.substring(0, 8)}`,
        lida: false,
        push_enviada: false,
      }));
      await supabase.from("notificacoes").insert(notificacoes);
      enviados += batch.length;

      // Enviar FCM para cada user do batch
      for (const userId of batch) {
        const tokens = userTokens[userId] || [];
        for (const fcmToken of tokens) {
          try {
            const ok = await sendFCM(accessToken, fcmToken, titulo, mensagem, { tipo: "novo_quiz", rota: quizRota });
            if (ok) {
              pushEnviados++;
              // Marcar push_enviada = true
              await supabase.from("notificacoes").update({ push_enviada: true }).eq("user_id", userId).eq("referencia", `copa_quiz_${quizId}_${userId.substring(0, 8)}`);
            } else {
              // Token inválido — desativar
              await supabase.from("push_tokens").update({ ativo: false }).eq("token", fcmToken);
            }
          } catch {
            erros++;
          }
        }
      }
    }

    const resultado = { ok: true, quiz_id: quizId, total_elegiveis: finalIds.length, notificacoes_criadas: enviados, push_enviados: pushEnviados, erros };
    console.log("[Novo Quiz Push]", JSON.stringify(resultado));
    return new Response(JSON.stringify(resultado), { headers: corsHeaders });
  } catch (err) {
    console.error("[Novo Quiz Push] Erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
