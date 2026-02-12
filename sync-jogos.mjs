// ============================================
// Bolão na Copa - Sincronização de Jogos
// ============================================
// Execute: node sync-jogos.mjs
// ============================================

import { createClient } from '@supabase/supabase-js';

// ⚠️ CONFIGURE AQUI:
const SUPABASE_URL = 'https://fccdsfhsinwczrkpgnbw.supabase.co';

// ⚠️ IMPORTANTE: Use a key da aba "Legacy anon, service_role API keys"
// A key "service_role" que começa com "eyJ..." (NÃO a sb_secret_...)
// A nova key (sb_secret_) ainda não funciona com o @supabase/supabase-js
const SUPABASE_SERVICE_KEY = 'COLE_A_LEGACY_SERVICE_ROLE_KEY_AQUI';

const API_FOOTBALL_KEY = '41efb11a73658034dcb9f515f5341850';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---- DEBUG: Testar conexão primeiro ----
console.log('🔍 Testando conexão com Supabase...');
const { data: testData, error: testError } = await supabase
  .from('campeonatos')
  .select('id, api_football_id, nome')
  .limit(5);

if (testError) {
  console.log('❌ ERRO na conexão:', testError.message);
  console.log('   Detalhes:', JSON.stringify(testError, null, 2));
  console.log('\n💡 Dica: Vá em Settings > API Keys > aba "Legacy anon, service_role API keys"');
  console.log('   Copie a key "service_role" com label "secret" (começa com eyJ...)');
  process.exit(1);
}

if (!testData || testData.length === 0) {
  console.log('⚠️ Conexão OK, mas nenhum campeonato encontrado.');
  console.log('   Verifique se rodou o SQL schema no Supabase.');
  process.exit(1);
}

console.log(`✅ Conexão OK! ${testData.length} campeonatos encontrados:`);
testData.forEach(c => console.log(`   - ${c.nome} (api_id: ${c.api_football_id})`));
console.log('');

// ---- Config ----
const CAMPEONATOS = [
  { api_id: 475, season: 2026, nome: 'Paulistão' },
  { api_id: 1,   season: 2026, nome: 'Copa do Mundo' },
  { api_id: 2,   season: 2025, nome: 'Champions League' },
];

function mapStatus(apiStatus) {
  const map = {
    'TBD': 'agendado', 'NS': 'agendado', 'PST': 'adiado',
    '1H': 'ao_vivo', '2H': 'ao_vivo', 'HT': 'ao_vivo',
    'ET': 'ao_vivo', 'BT': 'ao_vivo', 'P': 'ao_vivo', 'LIVE': 'ao_vivo',
    'FT': 'encerrado', 'AET': 'encerrado', 'PEN': 'encerrado',
    'SUSP': 'adiado', 'INT': 'adiado',
    'CANC': 'cancelado', 'ABD': 'cancelado', 'AWD': 'cancelado', 'WO': 'cancelado',
  };
  return map[apiStatus] || 'agendado';
}

async function syncCampeonato(camp) {
  console.log(`📡 Sincronizando: ${camp.nome} (league=${camp.api_id}, season=${camp.season})`);

  const { data: campData, error: campError } = await supabase
    .from('campeonatos')
    .select('id')
    .eq('api_football_id', camp.api_id)
    .single();

  if (campError || !campData) {
    console.log(`  ❌ Campeonato ${camp.nome} não encontrado`);
    if (campError) console.log(`  Erro: ${campError.message}`);
    return 0;
  }

  console.log(`  ✅ Campeonato ID: ${campData.id}`);

  const url = `https://v3.football.api-sports.io/fixtures?league=${camp.api_id}&season=${camp.season}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY }
  });
  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    console.log(`  ❌ Erro API-Football:`, json.errors);
    return 0;
  }

  const fixtures = json.response || [];
  console.log(`  📋 ${fixtures.length} jogos encontrados na API`);

  let count = 0;
  for (const fix of fixtures) {
    const { error } = await supabase.rpc('upsert_jogo', {
      p_api_football_id: fix.fixture.id,
      p_campeonato_id: campData.id,
      p_time_a: fix.teams.home.name,
      p_time_b: fix.teams.away.name,
      p_logo_time_a: fix.teams.home.logo,
      p_logo_time_b: fix.teams.away.logo,
      p_data_hora: fix.fixture.date,
      p_fase: fix.league.round || null,
      p_rodada: fix.league.round || null,
      p_placar_time_a: fix.goals.home,
      p_placar_time_b: fix.goals.away,
      p_status: mapStatus(fix.fixture.status.short),
    });

    if (error) {
      console.log(`  ⚠️ Erro jogo ${fix.fixture.id}:`, error.message);
    } else {
      count++;
    }
  }

  console.log(`  ✅ ${count} jogos sincronizados\n`);
  return count;
}

// ---- Main ----
console.log('🏆 Bolão na Copa - Sincronização de Jogos');
console.log('=========================================\n');

let total = 0;
for (const camp of CAMPEONATOS) {
  total += await syncCampeonato(camp);
}

console.log(`🎉 Total: ${total} jogos sincronizados`);
