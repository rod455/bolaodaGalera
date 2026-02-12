// ============================================
// Bolão na Copa - Sincronização de Jogos
// ============================================
// Execute: node sync-jogos.mjs
// Requer:  npm install @supabase/supabase-js
// ============================================

import { createClient } from '@supabase/supabase-js';

// ⚠️ CONFIGURE AQUI:
const SUPABASE_URL = 'https://fccdsfhsinwczrkpgnbw.supabase.co';
const SUPABASE_SERVICE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Settings > API > secret/service_role key
const API_FOOTBALL_KEY = 'SUA_API_FOOTBALL_KEY_AQUI';     // dashboard.api-football.com > Account > My Access

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  console.log(`\n📡 Sincronizando: ${camp.nome} (league=${camp.api_id}, season=${camp.season})`);

  const { data: campData } = await supabase
    .from('campeonatos')
    .select('id')
    .eq('api_football_id', camp.api_id)
    .single();

  if (!campData) {
    console.log(`  ❌ Campeonato ${camp.nome} não encontrado no banco`);
    return 0;
  }

  const url = `https://v3.football.api-sports.io/fixtures?league=${camp.api_id}&season=${camp.season}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY }
  });
  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    console.log(`  ❌ Erro API:`, json.errors);
    await supabase.from('sync_log').insert({
      campeonato_api_id: camp.api_id, tipo: 'fixtures', erro: JSON.stringify(json.errors),
    });
    return 0;
  }

  const fixtures = json.response || [];
  console.log(`  📋 ${fixtures.length} jogos encontrados`);

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

  await supabase.from('sync_log').insert({
    campeonato_api_id: camp.api_id, tipo: 'fixtures', jogos_atualizados: count,
  });

  console.log(`  ✅ ${count} jogos sincronizados`);
  return count;
}

async function main() {
  console.log('🏆 Bolão na Copa - Sincronização de Jogos');
  console.log('=========================================');

  let total = 0;
  for (const camp of CAMPEONATOS) {
    total += await syncCampeonato(camp);
  }

  console.log(`\n🎉 Total: ${total} jogos sincronizados`);
}

main().catch(console.error);
