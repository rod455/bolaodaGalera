// ============================================================
// Enviar Email de Lembrete: Semifinal Palmeiras x São Paulo
// Execute: node enviar-lembrete-semifinal.mjs
// Requer: npm install @supabase/supabase-js dotenv
// ============================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.log('❌ Configure SUPABASE_URL, SUPABASE_SERVICE_KEY e RESEND_API_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BOLAO_ID = '71851d2a-88fa-4ec4-a780-7c1e450869ef';
const JOGO_ID = '4c695093-8f25-4833-abf7-679f0054cd7e';
const FROM_EMAIL = 'Bolão na Copa <noreply@bolaonacopa.com.br>';
const DELAY_MS = 600; // Resend rate limit

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildEmailHtml(nome) {
  const firstName = nome?.split(' ')[0] || 'Torcedor';
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
      <h1 style="color:white;font-size:22px;margin:0;">⚽ Semifinal do Paulistão!</h1>
    </div>

    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;">
      <p style="font-size:16px;color:#1f2937;margin-top:0;">
        E aí, <strong>${firstName}</strong>! 👋
      </p>
      
      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        Ainda dá tempo de fazer seus palpites para a <strong>semifinal</strong> entre <strong>Palmeiras</strong> e <strong>São Paulo</strong>! 🏆
      </p>

      <div style="background:linear-gradient(135deg,#065f46,#047857);border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
        <p style="font-size:11px;color:#a7f3d0;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Semifinal — Paulistão 2026</p>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px;">
          <div style="text-align:center;">
            <p style="font-size:18px;font-weight:800;color:white;margin:0;">Palmeiras</p>
          </div>
          <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 14px;">
            <span style="font-size:16px;font-weight:800;color:#fbbf24;">VS</span>
          </div>
          <div style="text-align:center;">
            <p style="font-size:18px;font-weight:800;color:white;margin:0;">São Paulo</p>
          </div>
        </div>
        <p style="font-size:12px;color:#6ee7b7;margin:12px 0 0;">📍 Lembre-se: palpites fecham 10min antes do jogo!</p>
      </div>

      <p style="font-size:14px;color:#4b5563;line-height:1.7;">
        Não deixe pra depois — cada palpite conta na sua pontuação! Quem não palpita, não pontua. 😉
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="https://bolaonacopa.com.br/bolao/${BOLAO_ID}/palpites" 
           style="background:linear-gradient(135deg,#16a34a,#15803d);color:white;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(22,163,74,0.3);">
          Fazer meus palpites →
        </a>
      </div>

      <div style="background:#fffbeb;border-radius:12px;padding:14px;margin:20px 0;border-left:4px solid #f59e0b;">
        <p style="font-size:13px;color:#92400e;margin:0;">
          🏆 <strong>Lembrete:</strong> O bolão do Paulistão vale <strong>R$200 em prêmio</strong> para o 1º lugar! Não fique de fora.
        </p>
      </div>

      <p style="font-size:12px;color:#9ca3af;line-height:1.5;text-align:center;">
        Boa sorte no palpite! 🍀
      </p>
    </div>

    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
      Bolão na Copa © 2026 · Você recebeu este email porque participa do Bolão do Paulistão.
    </p>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('📧 Enviando lembretes: Semifinal Palmeiras x São Paulo\n');

  // Buscar participantes sem palpite
  const { data: participantes } = await supabase
    .from('bolao_participantes')
    .select('user_id')
    .eq('bolao_id', BOLAO_ID);

  const { data: palpitesFeitos } = await supabase
    .from('palpites')
    .select('user_id')
    .eq('bolao_id', BOLAO_ID)
    .eq('jogo_id', JOGO_ID);

  const jaFez = new Set((palpitesFeitos || []).map(p => p.user_id));
  const semPalpite = (participantes || [])
    .filter(p => !jaFez.has(p.user_id))
    .map(p => p.user_id);

  console.log(`👥 Total participantes: ${participantes?.length || 0}`);
  console.log(`✅ Já palpitaram: ${jaFez.size}`);
  console.log(`📩 Sem palpite: ${semPalpite.length}\n`);

  if (semPalpite.length === 0) {
    console.log('🎉 Todos já palpitaram!');
    return;
  }

  // Buscar emails
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nome, email')
    .in('id', semPalpite)
    .not('email', 'is', null)
    .neq('email', '');

  const destinatarios = (profiles || []).filter(p => p.email?.includes('@'));
  console.log(`📬 Emails válidos: ${destinatarios.length}\n`);

  let enviados = 0;
  let erros = 0;

  for (const dest of destinatarios) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [dest.email],
          subject: `${dest.nome?.split(' ')[0] || 'Ei'}, Palmeiras x São Paulo — faça seu palpite! ⚽`,
          html: buildEmailHtml(dest.nome),
        }),
      });

      if (res.ok) {
        enviados++;
        console.log(`  ✅ ${dest.nome} (${dest.email})`);
      } else {
        erros++;
        const err = await res.text();
        console.log(`  ❌ ${dest.email}: ${err}`);
      }
    } catch (e) {
      erros++;
      console.log(`  ❌ ${dest.email}: ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n🎉 Concluído! ${enviados} enviados, ${erros} erros`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
