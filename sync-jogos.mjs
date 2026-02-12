// ============================================
// Bolão na Copa - Sincronização de Jogos
// Usando football-data.org API v4 (GRÁTIS)
// ============================================
// Execute: node sync-jogos.mjs          → sync completo
// Execute: node sync-jogos.mjs --live   → atualiza só placares ao vivo
// Requer:  npm install @supabase/supabase-js
// ============================================

import { createClient } from '@supabase/supabase-js';

// ⚠️ CONFIGURE AQUI:
const SUPABASE_URL = 'https://hvgsdxcdufekksxgqyoj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z3NkeGNkdWZla2tzeGdxeW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwODcxOSwiZXhwIjoyMDg2NDg0NzE5fQ.XfQhnbccVV-m4_pmGqNr18WxGZrnuWzDFiNP7UBmmeo';
const FOOTBALL_DATA_TOKEN = 'd71ade413a674835a2285ad938ba30f6'; // football-data.org > Account > API Token

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// football-data.org competition codes (gratuitos no free tier)
const CAMPEONATOS = [
  { code: 'BSA', id: 2013, nome: 'Brasileirão', season: 2026 },
  { code: 'WC',  id: 2000, nome: 'Copa do Mundo', season: 2026 },
  { code: 'CL',  id: 2001, nome: 'Champions League', season: 2025 },
];

// ---- Helpers ----
const FASE_MAP = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_16: 'Oitavas de Final',
  LAST_32: 'Fase Eliminatória',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal',
  FINAL: 'Final',
  THIRD_PLACE: 'Terceiro Lugar',
  PLAYOFF: 'Repescagem',
  LEAGUE_STAGE: 'Liga',
  REGULAR_SEASON: 'Liga',
  ROUND_OF_16: 'Oitavas de Final',
  ROUND_OF_32: 'Fase Eliminatória',
};
function traduzirFase(stage) {
  if (!stage) return null;
  return FASE_MAP[stage] || FASE_MAP[stage.toUpperCase()] || stage;
}

async function fdFetch(endpoint) {
  const url = `https://api.football-data.org/v4${endpoint}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
  });

  if (res.status === 429) {
    console.log('  ⏳ Rate limit atingido. Aguardando 60s...');
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
    'SCHEDULED': 'agendado',
    'TIMED': 'agendado',
    'IN_PLAY': 'ao_vivo',
    'PAUSED': 'ao_vivo',
    'EXTRA_TIME': 'ao_vivo',
    'PENALTY_SHOOTOUT': 'ao_vivo',
    'FINISHED': 'encerrado',
    'SUSPENDED': 'adiado',
    'POSTPONED': 'adiado',
    'CANCELLED': 'cancelado',
    'AWARDED': 'encerrado',
  };
  return map[apiStatus] || 'agendado';
}

// ---- Sync Completo ----
async function syncCampeonato(camp) {
  console.log(`\n📡 Sincronizando: ${camp.nome} (code=${camp.code}, season=${camp.season})`);

  const { data: campData, error: campError } = await supabase
    .from('campeonatos')
    .select('id')
    .eq('api_football_id', camp.id)
    .single();

  if (campError || !campData) {
    console.log(`  ❌ ${camp.nome} não encontrado no banco Supabase`);
    if (campError) console.log(`  Erro: ${campError.message}`);
    return 0;
  }

  console.log(`  ✅ Campeonato encontrado: ${campData.id}`);

  const data = await fdFetch(`/competitions/${camp.code}/matches?season=${camp.season}`);
  if (!data || !data.matches) {
    console.log(`  ❌ Nenhum jogo retornado`);
    return 0;
  }

  const matches = data.matches;
  console.log(`  📋 ${matches.length} jogos encontrados`);

  let count = 0;
  for (const match of matches) {
    const homeTeam = match.homeTeam || {};
    const awayTeam = match.awayTeam || {};
    const score = match.score || {};
    const ft = score.fullTime || {};

    const { error } = await supabase.rpc('upsert_jogo', {
      p_api_football_id: match.id,
      p_campeonato_id: campData.id,
      p_time_a: homeTeam.shortName || homeTeam.name || 'TBD',
      p_time_b: awayTeam.shortName || awayTeam.name || 'TBD',
      p_logo_time_a: homeTeam.crest || null,
      p_logo_time_b: awayTeam.crest || null,
      p_data_hora: match.utcDate,
      p_fase: traduzirFase(match.stage) || null,
      p_rodada: match.matchday ? `Rodada ${match.matchday}` : null,
      p_placar_time_a: ft.home ?? null,
      p_placar_time_b: ft.away ?? null,
      p_status: mapStatus(match.status),
    });

    if (error) {
      console.log(`  ⚠️ Erro jogo ${match.id}: ${error.message}`);
    } else {
      count++;
    }
  }

  await supabase.from('sync_log').insert({
    campeonato_api_id: camp.id,
    tipo: 'football-data.org',
    jogos_atualizados: count,
  });

  console.log(`  ✅ ${count} jogos sincronizados`);
  return count;
}

// ---- Sync LIVE (apenas jogos em andamento) ----
async function syncLiveScores() {
  console.log('⚡ Modo LIVE - Atualizando placares em tempo real');
  console.log('================================================\n');

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Buscar jogos que precisam de atualização
  const { data: games, error } = await supabase
    .from('jogos')
    .select('id, api_football_id, status, data_hora, time_a, time_b, placar_time_a, placar_time_b')
    .or(`and(status.eq.agendado,data_hora.lte.${now.toISOString()}),status.eq.ao_vivo`)
    .gte('data_hora', todayStart.toISOString())
    .lte('data_hora', todayEnd.toISOString());

  if (error) {
    console.log('❌ Erro ao buscar jogos:', error.message);
    return;
  }

  if (!games || games.length === 0) {
    console.log('✅ Nenhum jogo em andamento para atualizar.');
    return;
  }

  console.log(`📋 ${games.length} jogo(s) para atualizar:\n`);

  let updated = 0;
  for (const game of games) {
    if (!game.api_football_id) {
      console.log(`  ⚠️ ${game.time_a} vs ${game.time_b} - sem api_football_id, pulando`);
      continue;
    }

    const matchData = await fdFetch(`/matches/${game.api_football_id}`);
    if (!matchData) continue;

    const score = matchData.score || {};
    const ft = score.fullTime || {};
    const ht = score.halfTime || {};
    const newStatus = mapStatus(matchData.status);

    let placarA = ft.home;
    let placarB = ft.away;
    if (placarA == null && newStatus === 'ao_vivo') {
      placarA = ht.home ?? 0;
      placarB = ht.away ?? 0;
    }

    const updateData = { status: newStatus };
    if (placarA != null) updateData.placar_time_a = placarA;
    if (placarB != null) updateData.placar_time_b = placarB;

    const { error: updateErr } = await supabase
      .from('jogos')
      .update(updateData)
      .eq('id', game.id);

    const emoji = newStatus === 'ao_vivo' ? '🔴' :
                  newStatus === 'encerrado' ? '✅' : '⏳';
    const placarStr = placarA != null ? `${placarA} x ${placarB}` : '? x ?';
    const oldPlacar = `${game.placar_time_a ?? '?'} x ${game.placar_time_b ?? '?'}`;

    if (updateErr) {
      console.log(`  ❌ ${game.time_a} vs ${game.time_b}: erro - ${updateErr.message}`);
    } else {
      console.log(`  ${emoji} ${game.time_a} ${placarStr} ${game.time_b} [${newStatus}] (antes: ${oldPlacar})`);
      updated++;
    }

    // Respeitar rate limit (10 req/min no free tier)
    await new Promise(r => setTimeout(r, 7000));
  }

  if (updated > 0) {
    await supabase.from('sync_log').insert({
      campeonato_api_id: 0,
      tipo: 'live-scores',
      jogos_atualizados: updated,
    }).catch(() => {});
  }

  console.log(`\n🎉 ${updated} jogo(s) atualizado(s)!`);
  console.log(`⏰ ${now.toLocaleTimeString('pt-BR')}`);
}

// ---- Main ----
const isLiveMode = process.argv.includes('--live');

async function main() {
  if (isLiveMode) {
    return syncLiveScores();
  }

  console.log('🏆 Bolão na Copa - Sincronização via football-data.org');
  console.log('======================================================\n');

  console.log('🔍 Testando conexão Supabase...');
  const { data: testData, error: testError } = await supabase
    .from('campeonatos')
    .select('id, api_football_id, nome, nome_popular, temporada');

  if (testError) {
    console.log('❌ Erro Supabase:', testError.message);
    process.exit(1);
  }

  console.log(`✅ Supabase OK! ${testData.length} campeonatos:`);
  testData.forEach(c => console.log(`   - ${c.nome_popular || c.nome} (api_id: ${c.api_football_id}, temporada: ${c.temporada})`));

  console.log('\n🔍 Testando conexão football-data.org...');
  const fdTest = await fdFetch('/competitions/BSA');
  if (!fdTest) {
    console.log('❌ Erro na conexão. Verifique seu token.');
    process.exit(1);
  }
  console.log(`✅ football-data.org OK! (${fdTest.name})\n`);

  let total = 0;
  for (const camp of CAMPEONATOS) {
    total += await syncCampeonato(camp);
    console.log('  ⏳ Aguardando 7s (rate limit)...');
    await new Promise(r => setTimeout(r, 7000));
  }

  console.log(`\n🎉 Total: ${total} jogos sincronizados!`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});

// ============================================
// USO:
//   node sync-jogos.mjs          → sync completo (todos os jogos)
//   node sync-jogos.mjs --live   → atualiza só placares ao vivo
//
// LOOP AUTOMÁTICO (PowerShell):
//   while ($true) { node sync-jogos.mjs --live; Start-Sleep -Seconds 180 }
// ============================================
