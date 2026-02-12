// ============================================
// Bolão na Copa - Sincronização de Jogos
// Usando football-data.org API v4 (GRÁTIS)
// ============================================
// Execute: node sync-jogos.mjs
// Requer:  npm install @supabase/supabase-js
// ============================================

import { createClient } from '@supabase/supabase-js';

// ⚠️ CONFIGURE AQUI:
const SUPABASE_URL = 'https://hvgsdxcdufekksxgqyoj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z3NkeGNkdWZla2tzeGdxeW9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwODcxOSwiZXhwIjoyMDg2NDg0NzE5fQ.XfQhnbccVV-m4_pmGqNr18WxGZrnuWzDFiNP7UBmmeo';
const FOOTBALL_DATA_TOKEN = 'd71ade413a674835a2285ad938ba30f6'; // football-data.org > Account > API Token

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// football-data.org competition codes (gratuitos no free tier)
// BSA = Brasileirão Série A (id: 2013) → season 2026
// CL  = Champions League (id: 2001) → season 2025 (25/26, mata-mata fev-maio 2026)
// WC  = World Cup (id: 2000) → season 2026
const CAMPEONATOS = [
  { code: 'BSA', id: 2013, nome: 'Brasileirão', season: 2026 },
  { code: 'WC',  id: 2000, nome: 'Copa do Mundo', season: 2026 },
  { code: 'CL',  id: 2001, nome: 'Champions League', season: 2025 },
];

// ---- Helpers ----
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

// ---- Sync ----
async function syncCampeonato(camp) {
  console.log(`\n📡 Sincronizando: ${camp.nome} (code=${camp.code}, season=${camp.season})`);

  // Buscar campeonato_id no Supabase
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

  // Buscar jogos da temporada específica
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
      p_fase: match.stage || null,
      p_rodada: match.matchday ? `Rodada ${match.matchday}` : (match.stage || null),
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

  // Log
  await supabase.from('sync_log').insert({
    campeonato_api_id: camp.id,
    tipo: 'football-data.org',
    jogos_atualizados: count,
  });

  console.log(`  ✅ ${count} jogos sincronizados`);
  return count;
}

// ---- Main ----
async function main() {
  console.log('🏆 Bolão na Copa - Sincronização via football-data.org');
  console.log('======================================================\n');

  // Testar Supabase
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

  // Testar football-data.org
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

    // Respeitar rate limit (10 req/min no free)
    console.log('  ⏳ Aguardando 7s (rate limit)...');
    await new Promise(r => setTimeout(r, 7000));
  }

  console.log(`\n🎉 Total: ${total} jogos sincronizados!`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
