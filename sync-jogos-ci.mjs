// ============================================
// Bolão na Copa - Smart Live Sync (GitHub Actions)
// Verifica últimos 5 dias + buffer de fuso horário
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FOOTBALL_DATA_TOKEN) {
  console.log('❌ Variáveis de ambiente não configuradas.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const isFullSync = process.argv.includes('--full');

// ---- Helpers ----
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

const FASE_MAP = {
  GROUP_STAGE: 'Fase de Grupos', LAST_16: 'Oitavas de Final',
  LAST_32: 'Fase Eliminatória', QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinal', FINAL: 'Final', THIRD_PLACE: 'Terceiro Lugar',
  PLAYOFF: 'Repescagem', LEAGUE_STAGE: 'Liga', REGULAR_SEASON: 'Liga',
  ROUND_OF_16: 'Oitavas de Final', ROUND_OF_32: 'Fase Eliminatória',
};

// ═══════════════════════════════════════════
// MODO LIVE: Atualiza jogos pendentes
// - Janela de 5 dias atrás
// - Buffer +4h no futuro para fuso BRT->UTC
// - Recupera encerrados sem placar
// ═══════════════════════════════════════════
async function syncLive() {
  const now = new Date();
  console.log(`⚡ Smart Sync - ${now.toISOString()}\n`);

  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  fiveDaysAgo.setHours(0, 0, 0, 0);

  const fourHoursAhead = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: games, error } = await supabase
    .from('jogos')
    .select('id, api_football_id, status, data_hora, time_a, time_b, placar_time_a, placar_time_b')
    .gte('data_hora', fiveDaysAgo.toISOString())
    .lte('data_hora', fourHoursAhead.toISOString())
    .or('status.eq.ao_vivo,status.eq.agendado,and(status.eq.encerrado,placar_time_a.is.null)');

  if (error) {
    console.log('❌ Erro Supabase:', error.message);
    process.exit(1);
  }

  if (!games || games.length === 0) {
    console.log('😴 Nenhum jogo pendente nos últimos 5 dias.');
    console.log('   (API football-data.org NAO foi chamada)');
    return;
  }

  console.log(`📋 ${games.length} jogo(s) pendente(s):\n`);

  let updated = 0;
  for (const game of games) {
    if (!game.api_football_id) {
      console.log(`  ⚠️ ${game.time_a} vs ${game.time_b} - sem api_football_id`);
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

    const changed =
      game.status !== newStatus ||
      game.placar_time_a !== placarA ||
      game.placar_time_b !== placarB;

    if (!changed) {
      console.log(`  ⏩ ${game.time_a} vs ${game.time_b} - sem alteracao`);
      await new Promise(r => setTimeout(r, 7000));
      continue;
    }

    const { error: err } = await supabase
      .from('jogos')
      .update(updateData)
      .eq('id', game.id);

    const emoji = newStatus === 'ao_vivo' ? '🔴' : newStatus === 'encerrado' ? '✅' : '⏳';
    const placar = placarA != null ? `${placarA} x ${placarB}` : '? x ?';

    if (err) {
      console.log(`  ❌ ${game.time_a} vs ${game.time_b}: ${err.message}`);
    } else {
      console.log(`  ${emoji} ${game.time_a} ${placar} ${game.time_b} [${game.status} -> ${newStatus}]`);
      updated++;
    }

    await new Promise(r => setTimeout(r, 7000));
  }

  if (updated > 0) {
    await supabase.from('sync_log').insert({
      campeonato_api_id: 0, tipo: 'github-actions-smart', jogos_atualizados: updated,
    });
  }

  console.log(`\n🎉 ${updated} jogo(s) atualizado(s)`);
}

// ═══════════════════════════════════════════
// MODO FULL: Sync completo de todos os campeonatos
// Roda 1x por semana para pegar novos jogos
// ═══════════════════════════════════════════
async function syncFull() {
  console.log('🔄 Sync COMPLETO - Atualizando todos os campeonatos\n');

  const CAMPEONATOS = [
    { code: 'BSA', id: 2013, nome: 'Brasileirao',      season: 2026 },
    { code: 'WC',  id: 2000, nome: 'Copa do Mundo',    season: 2026 },
    { code: 'CL',  id: 2001, nome: 'Champions League', season: 2025 },
    { code: 'CLI', id: 2152, nome: 'Libertadores',     season: 2026 },
  ];

  let totalUpdated = 0;

  for (const camp of CAMPEONATOS) {
    console.log(`\n📡 ${camp.nome} (${camp.code})...`);

    const { data: campData } = await supabase
      .from('campeonatos')
      .select('id')
      .eq('api_football_id', camp.id)
      .single();

    if (!campData) {
      console.log(`  ❌ Campeonato nao encontrado no banco`);
      continue;
    }

    const data = await fdFetch(`/competitions/${camp.code}/matches?season=${camp.season}`);
    if (!data?.matches) {
      console.log(`  ❌ Sem jogos retornados`);
      continue;
    }

    console.log(`  📋 ${data.matches.length} jogos`);
    let count = 0;

    for (const match of data.matches) {
      const home = match.homeTeam || {};
      const away = match.awayTeam || {};
      const score = match.score || {};
      const ft = score.fullTime || {};

      const { error } = await supabase.rpc('upsert_jogo', {
        p_api_football_id: match.id,
        p_campeonato_id: campData.id,
        p_time_a: home.shortName || home.name || 'TBD',
        p_time_b: away.shortName || away.name || 'TBD',
        p_logo_time_a: home.crest || null,
        p_logo_time_b: away.crest || null,
        p_data_hora: match.utcDate,
        p_fase: FASE_MAP[match.stage] || match.stage || null,
        p_rodada: match.matchday ? `Rodada ${match.matchday}` : null,
        p_placar_time_a: ft.home ?? null,
        p_placar_time_b: ft.away ?? null,
        p_status: mapStatus(match.status),
      });

      if (!error) count++;
    }

    console.log(`  ✅ ${count} jogos sincronizados`);
    totalUpdated += count;

    await new Promise(r => setTimeout(r, 7000));
  }

  if (totalUpdated > 0) {
    await supabase.from('sync_log').insert({
      campeonato_api_id: 0, tipo: 'github-actions-full', jogos_atualizados: totalUpdated,
    });
  }

  console.log(`\n🎉 Total: ${totalUpdated} jogos sincronizados`);
}

// ---- Main ----
async function main() {
  if (isFullSync) {
    await syncFull();
  } else {
    await syncLive();
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
