// ============================================
// Bolão na Copa - Sync para CI (GitHub Actions)
// Lê chaves de variáveis de ambiente
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.hvgsdxcdufekksxgqyoj.supabase.co;
const SUPABASE_SERVICE_KEY = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z3NkeGNkdWZla2tzeGdxeW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwODcxOSwiZXhwIjoyMDg2NDg0NzE5fQ.XfQhnbccVV-m4_pmGqNr18WxGZrnuWzDFiNP7UBmmeo;
const FOOTBALL_DATA_TOKEN = process.env.d71ade413a674835a2285ad938ba30f6;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FOOTBALL_DATA_TOKEN) {
  console.error('❌ Variáveis de ambiente não configuradas.');
  console.error('   Necessário: SUPABASE_URL, SUPABASE_SERVICE_KEY, FOOTBALL_DATA_TOKEN');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fdFetch(endpoint) {
  const url = `https://api.football-data.org/v4${endpoint}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
  });
  if (res.status === 429) {
    console.log('  ⏳ Rate limit. Aguardando 60s...');
    await new Promise(r => setTimeout(r, 60000));
    return fdFetch(endpoint);
  }
  if (!res.ok) {
    const text = await res.text();
    console.log(`  ❌ HTTP ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

function mapStatus(apiStatus) {
  const map = {
    'SCHEDULED': 'agendado', 'TIMED': 'agendado',
    'IN_PLAY': 'ao_vivo', 'PAUSED': 'ao_vivo',
    'EXTRA_TIME': 'ao_vivo', 'PENALTY_SHOOTOUT': 'ao_vivo',
    'FINISHED': 'encerrado', 'SUSPENDED': 'adiado',
    'POSTPONED': 'adiado', 'CANCELLED': 'cancelado', 'AWARDED': 'encerrado',
  };
  return map[apiStatus] || 'agendado';
}

async function syncLiveScores() {
  console.log('⚡ GitHub Actions - Atualizando placares ao vivo\n');

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const { data: games, error } = await supabase
    .from('jogos')
    .select('id, api_football_id, status, data_hora, time_a, time_b, placar_time_a, placar_time_b')
    .or(`and(status.eq.agendado,data_hora.lte.${now.toISOString()}),status.eq.ao_vivo`)
    .gte('data_hora', todayStart.toISOString())
    .lte('data_hora', todayEnd.toISOString());

  if (error) { console.log('❌ Erro:', error.message); return; }
  if (!games?.length) { console.log('✅ Nenhum jogo para atualizar.'); return; }

  console.log(`📋 ${games.length} jogo(s):\n`);
  let updated = 0;

  for (const game of games) {
    if (!game.api_football_id) continue;
    const matchData = await fdFetch(`/matches/${game.api_football_id}`);
    if (!matchData) continue;

    const score = matchData.score || {};
    const ft = score.fullTime || {};
    const ht = score.halfTime || {};
    const newStatus = mapStatus(matchData.status);

    let placarA = ft.home, placarB = ft.away;
    if (placarA == null && newStatus === 'ao_vivo') {
      placarA = ht.home ?? 0; placarB = ht.away ?? 0;
    }

    const updateData = { status: newStatus };
    if (placarA != null) updateData.placar_time_a = placarA;
    if (placarB != null) updateData.placar_time_b = placarB;

    const { error: err } = await supabase.from('jogos').update(updateData).eq('id', game.id);
    const emoji = newStatus === 'ao_vivo' ? '🔴' : newStatus === 'encerrado' ? '✅' : '⏳';
    const placar = placarA != null ? `${placarA} x ${placarB}` : '? x ?';

    if (err) console.log(`  ❌ ${game.time_a} vs ${game.time_b}: ${err.message}`);
    else { console.log(`  ${emoji} ${game.time_a} ${placar} ${game.time_b} [${newStatus}]`); updated++; }

    await new Promise(r => setTimeout(r, 7000));
  }

  console.log(`\n🎉 ${updated} atualizado(s) - ${now.toISOString()}`);
}

syncLiveScores().catch(err => { console.error('❌', err.message); process.exit(1); });
