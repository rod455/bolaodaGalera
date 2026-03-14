import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MOTIVOS = [
  "Recebo emails demais",
  "Os emails nao sao relevantes para mim",
  "Nao lembro de ter me cadastrado",
  "Prefiro acompanhar so pelo app",
  "Outro motivo",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return htmlResponse(paginaErro("Token nao encontrado. Verifique o link do email."));
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nome, email_opt_out")
    .eq("email_unsubscribe_token", token)
    .single();

  if (error || !profile) {
    return htmlResponse(paginaErro("Nao encontramos sua conta. O link pode ter expirado."));
  }

  if (req.method === "GET") {
    if (profile.email_opt_out) {
      return htmlResponse(paginaSucesso("Voce ja havia solicitado o descadastro anteriormente."));
    }
    return htmlResponse(paginaMotivo(token));
  }

  if (req.method === "POST") {
    const formData = await req.formData();
    const motivo = formData.get("motivo")?.toString() || "";
    const motivoOutro = formData.get("motivo_outro")?.toString() || "";

    if (!motivo) {
      return htmlResponse(paginaMotivo(token, "Por favor, selecione um motivo antes de continuar."));
    }

    const motivoFinal = motivo === "Outro motivo" && motivoOutro.trim()
      ? `Outro: ${motivoOutro.trim()}`
      : motivo;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_opt_out: true, email_opt_out_reason: motivoFinal })
      .eq("id", profile.id);

    if (updateError) {
      return htmlResponse(paginaErro("Ocorreu um erro. Tente novamente mais tarde."));
    }

    return htmlResponse(paginaSucesso("Voce nao recebera mais emails de engajamento do Bolao na Copa. Sua conta continua ativa normalmente."));
  }

  return htmlResponse(paginaErro("Metodo nao suportado."));
});

function htmlResponse(content: string) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bolao na Copa - Descadastro</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; padding:20px; background:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:white; border-radius:16px; padding:36px 32px; max-width:460px; width:100%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .logo { text-align:center; margin-bottom:20px; }
    .logo img { width:56px; height:56px; }
    h1 { font-size:20px; color:#111827; margin:0 0 8px; text-align:center; }
    .subtitle { font-size:14px; color:#6b7280; text-align:center; margin:0 0 28px; line-height:1.5; }
    .motivos { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
    .motivo-label { display:flex; align-items:center; gap:12px; padding:14px 16px; border:2px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all 0.15s; font-size:14px; color:#374151; }
    .motivo-label:hover { border-color:#16a34a; background:#f0fdf4; }
    input[type="radio"] { display:none; }
    input[type="radio"]:checked + .motivo-label { border-color:#16a34a; background:#f0fdf4; color:#15803d; font-weight:600; }
    .radio-icon { width:20px; height:20px; border-radius:50%; border:2px solid #d1d5db; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
    input[type="radio"]:checked + .motivo-label .radio-icon { border-color:#16a34a; background:#16a34a; }
    input[type="radio"]:checked + .motivo-label .radio-icon::after { content:''; width:8px; height:8px; border-radius:50%; background:white; display:block; }
    #campo-outro { display:none; margin-bottom:12px; }
    #campo-outro textarea { width:100%; padding:12px; border:2px solid #e5e7eb; border-radius:10px; font-size:14px; color:#374151; resize:vertical; min-height:80px; font-family:inherit; outline:none; }
    #campo-outro textarea:focus { border-color:#16a34a; }
    .erro { background:#fef2f2; border:1px solid #fecaca; color:#dc2626; padding:12px 16px; border-radius:8px; font-size:13px; margin-bottom:16px; text-align:center; }
    .btn { display:block; width:100%; padding:14px; background:#dc2626; color:white; border:none; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; }
    .btn:hover { background:#b91c1c; }
    .icon-grande { font-size:52px; text-align:center; margin-bottom:12px; }
    .btn-voltar { display:inline-block; background:#16a34a; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:15px; font-weight:600; margin-top:8px; }
    .center { text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <img src="https://hvgsdxcdufekksxgqyoj.supabase.co/storage/v1/object/public/iconesapp/604913%20(512%20x%20512%20px).png" alt="Bolao na Copa">
    </div>
    ${body}
  </div>
  <script>
    document.querySelectorAll('input[name="motivo"]').forEach(function(el) {
      el.addEventListener('change', function() {
        var c = document.getElementById('campo-outro');
        if (c) c.style.display = this.value === 'Outro motivo' ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

function paginaMotivo(token: string, erroMsg?: string): string {
  const erroHtml = erroMsg ? `<div class="erro">${erroMsg}</div>` : "";
  const motivosHtml = MOTIVOS.map((m) => `
    <div>
      <input type="radio" name="motivo" id="m_${m.replace(/\s/g,'_')}" value="${m}">
      <label for="m_${m.replace(/\s/g,'_')}" class="motivo-label">
        <span class="radio-icon"></span>${m}
      </label>
    </div>`).join("");

  return layout(`
    <h1>Sentimos sua falta</h1>
    <p class="subtitle">Antes de sair, pode nos dizer o motivo?<br>Sua opiniao nos ajuda a melhorar.</p>
    ${erroHtml}
    <form method="POST" action="?token=${token}">
      <div class="motivos">${motivosHtml}</div>
      <div id="campo-outro">
        <textarea name="motivo_outro" placeholder="Conte o que aconteceu..."></textarea>
      </div>
      <button type="submit" class="btn">Confirmar descadastro</button>
    </form>
  `);
}

function paginaSucesso(mensagem: string): string {
  return layout(`
    <div class="icon-grande">&#x2705;</div>
    <h1>Descadastro realizado</h1>
    <p class="subtitle">${mensagem}</p>
    <div class="center"><a href="https://bolaonacopa.com.br" class="btn-voltar">Voltar ao app</a></div>
  `);
}

function paginaErro(mensagem: string): string {
  return layout(`
    <div class="icon-grande">&#x274C;</div>
    <h1>Algo deu errado</h1>
    <p class="subtitle">${mensagem}</p>
    <div class="center"><a href="https://bolaonacopa.com.br" class="btn-voltar">Voltar ao app</a></div>
  `);
}
