// Script para atualizar jogos como encerrados manualmente
// Execute: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node update-jogos-encerrados.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('Uso: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node update-jogos-encerrados.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const updates = [
  {
    desc: 'Rosario 0 x 0 Independiente del Valle',
    time_a: 'Rosario',
    time_b_like: '%Independiente del Valle%',
    placar_time_a: 0,
    placar_time_b: 0,
  },
  {
    desc: 'Universidad Central de Venezuela 3 x 1 Libertad',
    time_a_like: '%Universidad Central%',
    time_b: 'Libertad',
    placar_time_a: 3,
    placar_time_b: 1,
  },
];

for (const u of updates) {
  // Buscar o jogo
  let query = supabase.from('jogos').select('id, time_a, time_b, status, placar_time_a, placar_time_b');

  if (u.time_a) query = query.eq('time_a', u.time_a);
  if (u.time_a_like) query = query.ilike('time_a', u.time_a_like);
  if (u.time_b) query = query.eq('time_b', u.time_b);
  if (u.time_b_like) query = query.ilike('time_b', u.time_b_like);

  query = query.neq('status', 'encerrado');

  const { data: jogos, error: fetchErr } = await query;

  if (fetchErr) {
    console.log(`Erro ao buscar ${u.desc}:`, fetchErr.message);
    continue;
  }

  if (!jogos || jogos.length === 0) {
    console.log(`Jogo nao encontrado (ou ja encerrado): ${u.desc}`);
    continue;
  }

  if (jogos.length > 1) {
    console.log(`Multiplos jogos encontrados para ${u.desc}:`, jogos);
    console.log('Pulando para evitar update errado...');
    continue;
  }

  const jogo = jogos[0];
  console.log(`Encontrado: [${jogo.id}] ${jogo.time_a} vs ${jogo.time_b} (status: ${jogo.status})`);

  const { error: updateErr } = await supabase
    .from('jogos')
    .update({
      status: 'encerrado',
      placar_time_a: u.placar_time_a,
      placar_time_b: u.placar_time_b,
    })
    .eq('id', jogo.id);

  if (updateErr) {
    console.log(`Erro ao atualizar ${u.desc}:`, updateErr.message);
  } else {
    console.log(`Atualizado: ${jogo.time_a} ${u.placar_time_a} x ${u.placar_time_b} ${jogo.time_b} -> encerrado`);
  }
}

console.log('Concluido!');
