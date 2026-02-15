// ═══════════════════════════════════════════════════════
// Supabase Edge Function: send-push-notification
// Envia push via Firebase Cloud Messaging (HTTP v1 API)
// ═══════════════════════════════════════════════════════
//
// Deploy: supabase functions deploy send-push-notification
//
// Variáveis de ambiente necessárias (no Supabase Dashboard):
// - FIREBASE_PROJECT_ID: ID do projeto Firebase
// - FIREBASE_CLIENT_EMAIL: Email da service account
// - FIREBASE_PRIVATE_KEY: Chave privada da service account (PEM)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Gerar JWT para autenticar com Firebase ──
async function getFirebaseAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const privateKeyPem = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  // Encode header + payload
  const enc = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const toSign = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${toSign}.${sigB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ── Enviar via FCM HTTP v1 ──
async function sendFCM(
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID")!;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          android: {
            priority: "high",
            notification: {
              channel_id: "bolao_default",
              icon: "ic_notification",
              color: "#2E7D32",
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("FCM error:", err);

    // Token inválido → desativar
    if (err.includes("UNREGISTERED") || err.includes("INVALID_ARGUMENT")) {
      return false; // Sinaliza token inválido
    }
  }

  return res.ok;
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

    const {
      user_id,
      tipo,
      titulo,
      mensagem,
      dados = {},
      referencia = null,
    } = await req.json();

    if (!user_id || !titulo || !mensagem) {
      return new Response(
        JSON.stringify({ error: "user_id, titulo, mensagem obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Criar notificação in-app (com dedup via referencia)
    let notificacaoId = null;
    if (referencia) {
      const { data } = await supabase.rpc("criar_notificacao", {
        p_user_id: user_id,
        p_tipo: tipo || "sistema",
        p_titulo: titulo,
        p_mensagem: mensagem,
        p_dados: dados,
        p_referencia: referencia,
      });
      notificacaoId = data;
    } else {
      const { data } = await supabase
        .from("notificacoes")
        .insert({
          user_id,
          tipo: tipo || "sistema",
          titulo,
          mensagem,
          dados,
        })
        .select("id")
        .single();
      notificacaoId = data?.id;
    }

    // Se dedup bloqueou (já enviada), retorna ok sem push
    if (!notificacaoId) {
      return new Response(
        JSON.stringify({ ok: true, duplicada: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar preferência do user
    const { data: prefs } = await supabase
      .from("notificacao_preferencias")
      .select("push_ativo")
      .eq("user_id", user_id)
      .single();

    if (prefs && !prefs.push_ativo) {
      return new Response(
        JSON.stringify({ ok: true, push: "desativada_pelo_user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Buscar tokens FCM ativos
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", user_id)
      .eq("ativo", true);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, push: "sem_token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Enviar push para todos os dispositivos
    const accessToken = await getFirebaseAccessToken();
    let pushEnviada = false;

    for (const t of tokens) {
      const success = await sendFCM(accessToken, t.token, titulo, mensagem, {
        tipo: tipo || "sistema",
        rota: dados.rota || "",
        bolao_id: dados.bolao_id || "",
        jogo_id: dados.jogo_id || "",
      });

      if (success) {
        pushEnviada = true;
      } else {
        // Desativar token inválido
        await supabase
          .from("push_tokens")
          .update({ ativo: false })
          .eq("id", t.id);
      }
    }

    // 5. Marcar notificação como enviada
    if (pushEnviada) {
      await supabase
        .from("notificacoes")
        .update({ push_enviada: true })
        .eq("id", notificacaoId);
    }

    return new Response(
      JSON.stringify({ ok: true, notificacao_id: notificacaoId, push: pushEnviada }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
