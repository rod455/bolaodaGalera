// ═══════════════════════════════════════════════════════
// Bolão na Copa - Check Pending Palpites & Notify
// Roda via GitHub Actions a cada 30 minutos
// ═══════════════════════════════════════════════════════
//
// Lógica:
// 1. Busca jogos que começam entre 50min e 70min a partir de agora
// 2. Para cada jogo, busca os bolões associados ao campeonato
// 3. Para cada bolão, busca participantes que NÃO palpitaram
// 4. Envia notificação push (via Edge Function) para cada um
//
// Dedup: usa referencia "palpite_pendente:{jogo_id}:{bolao_id}"
// para nunca enviar 2x pro mesmo user/jogo/bolão

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Formatar hora para mensagem ──
function formatHora(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

// ── Enviar notificação via Edge Function ──
async function sendNotification(userId, tipo, titulo, mensagem, dados, referencia) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { user_id: userId, tipo, titulo, mensagem, dados, referencia },
    });

    if (error) {
      console.log(`  ⚠️ Erro ao notificar ${userId.substring(0, 8)}...: ${error.message}`);
      return false;
    }

    if (data?.duplicada) {
      return false; // Já notificado
    }

    return true;
  } catch (err) {
    console.log(`  ⚠️ Erro: ${err.message}`);
    return false;
  }
}

// ── Main ──
async function main() {
  console.log('🔔 Check Pending Palpites - ' + new Date().toISOString());

  const now = new Date();
  // Janela: jogos que começam entre 50min e 70min a partir de agora
  // (roda a cada 30min, então ~1h antes do jogo)
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);

  console.log(`  📅 Janela: ${windowStart.toISOString()} a ${windowEnd.toISOString()}`);

  // 1. Buscar jogos na janela
  const { data: jogos, error: jogosErr } = await supabase
    .from('jogos')
    .select('id, time_a, time_b, data_hora, campeonato_id')
    .eq('status', 'agendado')
    .gte('data_hora', windowStart.toISOString())
    .lte('data_hora', windowEnd.toISOString());

  if (jogosErr) {
    console.error('❌ Erro ao buscar jogos:', jogosErr.message);
    process.exit(1);
  }

  if (!jogos || jogos.length === 0) {
    console.log('  ✅ Nenhum jogo na janela de 1h. Saindo.');
    return;
  }

  console.log(`  ⚽ ${jogos.length} jogo(s) encontrado(s)`);

  let totalNotificados = 0;

  for (const jogo of jogos) {
    console.log(`\n  📋 ${jogo.time_a} vs ${jogo.time_b} (${formatHora(jogo.data_hora)})`);

    // 2. Buscar bolões deste campeonato
    const { data: boloes } = await supabase
      .from('boloes')
      .select('id, nome')
      .eq('campeonato_id', jogo.campeonato_id);

    if (!boloes || boloes.length === 0) {
      console.log('     Nenhum bolão para este campeonato');
      continue;
    }

    for (const bolao of boloes) {
      // 3. Buscar participantes do bolão
      const { data: participantes } = await supabase
        .from('bolao_participantes')
        .select('user_id')
        .eq('bolao_id', bolao.id);

      if (!participantes || participantes.length === 0) continue;

      const userIds = participantes.map(p => p.user_id);

      // 4. Buscar quem JÁ palpitou neste jogo neste bolão
      const { data: palpites } = await supabase
        .from('palpites')
        .select('user_id')
        .eq('bolao_id', bolao.id)
        .eq('jogo_id', jogo.id)
        .in('user_id', userIds);

      const jaPalpitou = new Set((palpites || []).map(p => p.user_id));
      const pendentes = userIds.filter(uid => !jaPalpitou.has(uid));

      if (pendentes.length === 0) {
        console.log(`     ${bolao.nome}: todos já palpitaram ✅`);
        continue;
      }

      console.log(`     ${bolao.nome}: ${pendentes.length} pendente(s)`);

      // 5. Notificar cada um
      for (const userId of pendentes) {
        const referencia = `palpite_pendente:${jogo.id}:${bolao.id}`;
        const hora = formatHora(jogo.data_hora);

        const enviada = await sendNotification(
          userId,
          'palpite_pendente',
          `⚽ ${jogo.time_a} x ${jogo.time_b} às ${hora}`,
          `Falta ~1h! Faça seu palpite no bolão "${bolao.nome}" antes que feche.`,
          {
            bolao_id: bolao.id,
            bolao_nome: bolao.nome,
            jogo_id: jogo.id,
            rota: `/bolao/${bolao.id}/palpites?jogo=${jogo.id}`,
          },
          referencia
        );

        if (enviada) totalNotificados++;
      }

      // Pequena pausa para não sobrecarregar
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n🎉 Total: ${totalNotificados} notificação(ões) enviada(s)`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
