// ═══════════════════════════════════════════════════════════
// CONSOLIDAÇÃO v4 — Schema v5 (canal + social + power-users)
//
// Mudanças vs v3:
// - Lê palpites por canal (web/android/ios/null) 
// - Lê palpites em campeonato ativo vs futuro
// - Lê bolões "vivos socialmente"
// - Estima receita potencial AdMob por canal Android
// - Inclui top campeonatos do dia (cross-reference com v_palpites_por_campeonato)
// ═══════════════════════════════════════════════════════════

const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const round = (v, d = 2) => Number(Number(v).toFixed(d));

const safeGetJson = (nodeName) => {
  try {
    const item = $(nodeName).first();
    return item?.json ?? null;
  } catch (e) {
    return null;
  }
};

// Status de cada fonte
const fontes_de_dados = {
  supabase_kpis: 'nao_configurada',
  supabase_historico: 'nao_configurada',
  supabase_campeonatos: 'nao_configurada',
  admob: 'nao_configurada',
  meta_ads: 'nao_configurada',
  google_ads: 'nao_configurada'
};

// === Supabase KPIs ===
const kpisRaw = safeGetJson('Supabase: v_kpis_diarios');
const kpis = Array.isArray(kpisRaw) ? (kpisRaw[0] || {}) : (kpisRaw || {});
fontes_de_dados.supabase_kpis = kpis && Object.keys(kpis).length > 0 ? 'ativa' : 'erro';

// === Histórico 30d ===
const histRaw = safeGetJson('Supabase: histórico 30d');
const historico = Array.isArray(histRaw) ? histRaw : (histRaw ? [histRaw] : []);
fontes_de_dados.supabase_historico = historico.length > 0 ? 'ativa' : 'sem_dados';

// === Top campeonatos do dia (NOVO v5) ===
// Esse node é OPCIONAL — se você adicionou ao workflow, lê dele
const campsRaw = safeGetJson('Supabase: palpites por campeonato');
const top_campeonatos_dia = Array.isArray(campsRaw) ? campsRaw : (campsRaw ? [campsRaw] : []);
fontes_de_dados.supabase_campeonatos = top_campeonatos_dia.length > 0 ? 'ativa' : 'sem_dados';

// === AdMob (v6: breakdown por ad unit) ===
let admobImpressoes = 0, admobReceita = 0, ecpm = 0, fillRate = 0, admobCliques = 0, admobCtr = 0;
let admobRows = [];
let adUnitsAgg = {};
let formatsAgg = {};
let platformsAgg = {};
try {
  const admobRaw = safeGetJson('AdMob: receita & eCPM');
  if (admobRaw === null) {
    fontes_de_dados.admob = 'nao_configurada';
  } else {
    fontes_de_dados.admob = 'ativa';
    const rawArr = Array.isArray(admobRaw) ? admobRaw : [admobRaw];
    // AdMob API retorna array com header, rows..., footer. Cada row tem .row { dimensionValues, metricValues }
    admobRows = rawArr.filter(r => r?.row?.metricValues).map(r => r.row);
    
    if (admobRows.length === 0) {
      fontes_de_dados.admob = 'sem_dados';
    } else {
      for (const row of admobRows) {
        const m = row.metricValues || {};
        const d = row.dimensionValues || {};
        const imp = num(m?.IMPRESSIONS?.integerValue);
        const req = num(m?.AD_REQUESTS?.integerValue);
        const match = num(m?.MATCHED_REQUESTS?.integerValue);
        const earn = round(num(m?.ESTIMATED_EARNINGS?.microsValue) / 1_000_000, 4);
        const cli = num(m?.CLICKS?.integerValue);
        const rpm = num(m?.IMPRESSION_RPM?.doubleValue);
        const ctrRow = num(m?.IMPRESSION_CTR?.doubleValue);
        const matchRow = num(m?.MATCH_RATE?.doubleValue);
        
        admobImpressoes += imp;
        admobReceita += earn;
        admobCliques += cli;
        
        const adUnitId = d?.AD_UNIT?.value || 'unknown';
        const adUnitName = d?.AD_UNIT?.displayLabel || adUnitId;
        const fmt = d?.FORMAT?.value || 'unknown';
        const plat = d?.PLATFORM?.value || 'unknown';
        
        // por ad unit
        const auKey = adUnitId;
        if (!adUnitsAgg[auKey]) adUnitsAgg[auKey] = { id: adUnitId, nome: adUnitName, formato: fmt, plataforma: plat, impressoes: 0, requests: 0, matched: 0, receita: 0, cliques: 0 };
        adUnitsAgg[auKey].impressoes += imp;
        adUnitsAgg[auKey].requests += req;
        adUnitsAgg[auKey].matched += match;
        adUnitsAgg[auKey].receita += earn;
        adUnitsAgg[auKey].cliques += cli;
        
        // por formato
        if (!formatsAgg[fmt]) formatsAgg[fmt] = { formato: fmt, impressoes: 0, receita: 0, requests: 0, matched: 0 };
        formatsAgg[fmt].impressoes += imp;
        formatsAgg[fmt].receita += earn;
        formatsAgg[fmt].requests += req;
        formatsAgg[fmt].matched += match;
        
        // por plataforma
        if (!platformsAgg[plat]) platformsAgg[plat] = { plataforma: plat, impressoes: 0, receita: 0 };
        platformsAgg[plat].impressoes += imp;
        platformsAgg[plat].receita += earn;
      }
      
      admobReceita = round(admobReceita, 2);
      ecpm = admobImpressoes > 0 ? round((admobReceita / admobImpressoes) * 1000, 2) : 0;
      const totalReq = Object.values(adUnitsAgg).reduce((s, u) => s + u.requests, 0);
      const totalMatch = Object.values(adUnitsAgg).reduce((s, u) => s + u.matched, 0);
      fillRate = totalReq > 0 ? round((totalMatch / totalReq) * 100, 2) : 0;
      admobCtr = admobImpressoes > 0 ? round((admobCliques / admobImpressoes) * 100, 2) : 0;
    }
  }
} catch (e) { fontes_de_dados.admob = 'erro'; }

// Calcular eCPM por ad unit e ranquear
const adUnitsArr = Object.values(adUnitsAgg).map(u => ({
  ...u,
  receita: round(u.receita, 2),
  ecpm_brl: u.impressoes > 0 ? round((u.receita / u.impressoes) * 1000, 2) : 0,
  match_rate_pct: u.requests > 0 ? round((u.matched / u.requests) * 100, 2) : 0,
  ctr_pct: u.impressoes > 0 ? round((u.cliques / u.impressoes) * 100, 2) : 0
}));

const top_ad_units_por_receita = [...adUnitsArr].sort((a, b) => b.receita - a.receita).slice(0, 5);
const top_ad_units_por_ecpm = [...adUnitsArr].filter(u => u.impressoes >= 50).sort((a, b) => b.ecpm_brl - a.ecpm_brl).slice(0, 5);
const ad_units_baixo_desempenho = [...adUnitsArr].filter(u => u.requests >= 100 && (u.match_rate_pct < 70 || u.ecpm_brl < 3)).sort((a, b) => b.requests - a.requests).slice(0, 5);

const formatsArr = Object.values(formatsAgg).map(f => ({
  ...f,
  receita: round(f.receita, 2),
  ecpm_brl: f.impressoes > 0 ? round((f.receita / f.impressoes) * 1000, 2) : 0,
  match_rate_pct: f.requests > 0 ? round((f.matched / f.requests) * 100, 2) : 0,
  pct_receita: 0
})).sort((a, b) => b.receita - a.receita);
const totalReceitaFmt = formatsArr.reduce((s, f) => s + f.receita, 0);
formatsArr.forEach(f => { f.pct_receita = totalReceitaFmt > 0 ? round((f.receita / totalReceitaFmt) * 100, 2) : 0; });

const platformsArr = Object.values(platformsAgg).map(p => ({
  ...p,
  receita: round(p.receita, 2),
  ecpm_brl: p.impressoes > 0 ? round((p.receita / p.impressoes) * 1000, 2) : 0
})).sort((a, b) => b.receita - a.receita);

// === Meta Ads (v6: breakdown por campanha) ===
let gastoMeta = 0, impressoesMeta = 0, cliquesMeta = 0, ctrMeta = 0, alcanceMeta = 0, freqMeta = 0;
let metaCampanhas = [];
let metaCadastrosAttr = 0;
try {
  const metaRaw = safeGetJson('Meta Ads: gastos D-1');
  if (metaRaw === null) {
    fontes_de_dados.meta_ads = 'nao_configurada';
  } else {
    fontes_de_dados.meta_ads = 'ativa';
    const campanhas = metaRaw?.data || [];
    if (campanhas.length === 0) {
      fontes_de_dados.meta_ads = 'sem_dados';
    } else {
      let totalReach = 0, totalFreqWeighted = 0;
      for (const c of campanhas) {
        const sp = round(num(c.spend), 2);
        const imp = num(c.impressions);
        const cli = num(c.clicks);
        const ctr = num(c.ctr);
        const reach = num(c.reach);
        const freq = num(c.frequency);
        const actions = c.actions || [];
        const cpas = c.cost_per_action_type || [];
        // detectar conversões (cadastros): action_type contendo 'complete_registration' ou 'lead'
        const cadastros = actions
          .filter(a => /complete_registration|lead|registration|sign_up/i.test(a.action_type))
          .reduce((s, a) => s + num(a.value), 0);
        const cpaCadastro = cpas
          .filter(a => /complete_registration|lead|registration|sign_up/i.test(a.action_type))
          .map(a => num(a.value))[0] || (cadastros > 0 ? round(sp / cadastros, 2) : null);
        
        gastoMeta += sp;
        impressoesMeta += imp;
        cliquesMeta += cli;
        totalReach += reach;
        totalFreqWeighted += freq * imp;
        metaCadastrosAttr += cadastros;
        
        metaCampanhas.push({
          nome: c.campaign_name || 'sem_nome',
          gasto: sp,
          impressoes: imp,
          cliques: cli,
          ctr_pct: ctr,
          alcance: reach,
          frequencia: freq,
          cadastros_attr: cadastros,
          cpa_cadastro: cpaCadastro,
          cpc: cli > 0 ? round(sp / cli, 2) : null
        });
      }
      gastoMeta = round(gastoMeta, 2);
      ctrMeta = impressoesMeta > 0 ? round((cliquesMeta / impressoesMeta) * 100, 2) : 0;
      alcanceMeta = totalReach;
      freqMeta = impressoesMeta > 0 ? round(totalFreqWeighted / impressoesMeta, 2) : 0;
    }
  }
} catch (e) { fontes_de_dados.meta_ads = 'erro'; }

// Rankings de campanhas Meta
const top_meta_por_gasto = [...metaCampanhas].sort((a, b) => b.gasto - a.gasto).slice(0, 5);
const top_meta_por_ctr = [...metaCampanhas].filter(c => c.impressoes >= 500).sort((a, b) => b.ctr_pct - a.ctr_pct).slice(0, 5);
const meta_campanhas_baixo_desempenho = [...metaCampanhas].filter(c => c.gasto >= 5 && (c.ctr_pct < 0.5 || c.frequencia > 4)).sort((a, b) => b.gasto - a.gasto).slice(0, 5);
const meta_campanhas_top_cadastros = [...metaCampanhas].filter(c => c.cadastros_attr > 0).sort((a, b) => b.cadastros_attr - a.cadastros_attr).slice(0, 5);

// === Google Ads ===
let gastoGoogle = 0, impressoesGoogle = 0, cliquesGoogle = 0;
try {
  const gAdsRaw = safeGetJson('Google Ads: gastos D-1');
  if (gAdsRaw === null) {
    fontes_de_dados.google_ads = 'nao_configurada';
  } else {
    fontes_de_dados.google_ads = 'ativa';
    const results = gAdsRaw?.results || [];
    if (results.length > 0) {
      for (const r of results) {
        gastoGoogle += num(r?.metrics?.costMicros) / 1_000_000;
        impressoesGoogle += num(r?.metrics?.impressions);
        cliquesGoogle += num(r?.metrics?.clicks);
      }
      gastoGoogle = round(gastoGoogle, 2);
    } else {
      fontes_de_dados.google_ads = 'sem_dados';
    }
  }
} catch (e) { fontes_de_dados.google_ads = 'erro'; }

// === Cálculos derivados ===

const novosCadastros = num(kpis?.novos_cadastros_dia);
const cadastrosReferidos = num(kpis?.cadastros_referidos_dia);
const totalUsuarios = num(kpis?.total_usuarios);
const cadastrosEmailConfirmado = num(kpis?.cadastros_email_confirmado);
const taxaConfirmacaoEmail = num(kpis?.taxa_confirmacao_email_pct);
const ativacaoCriouBolao = num(kpis?.ativacao_criou_bolao);
const ativacaoEntrouBolao = num(kpis?.ativacao_entrou_bolao);
const ativacaoPalpitou = num(kpis?.ativacao_palpitou);
const ativados24h = num(kpis?.ativados_24h);
const taxaAtivacao = num(kpis?.taxa_ativacao_pct);
const dau = num(kpis?.dau);
const wau = num(kpis?.wau);
const mau = num(kpis?.mau);
const stickiness = num(kpis?.stickiness_pct);
const palpitesDia = num(kpis?.total_palpites_dia);
const usuariosComStreak = num(kpis?.usuarios_com_streak);
const streakMedio = num(kpis?.streak_medio);
const usuariosPontuandoDia = num(kpis?.usuarios_pontuando_dia);
const boloesCriadosDia = num(kpis?.boloes_criados_dia);
const boloesPrivadosDia = num(kpis?.boloes_privados_dia);
const boloesPublicosDia = num(kpis?.boloes_publicos_dia);
const boloesComAmigosDia = num(kpis?.boloes_com_amigos_dia);
const totalParticipacoesDia = num(kpis?.total_participacoes_dia);
const participacoesOrganicasDia = num(kpis?.participacoes_organicas_dia);
const boloesEmCampAtivoDia = num(kpis?.boloes_em_camp_ativo_dia);
const boloesEmCampFuturoDia = num(kpis?.boloes_em_camp_futuro_dia);
const usuariosPresosCampFuturo = num(kpis?.usuarios_presos_camp_futuro);
const totalPremium = num(kpis?.total_premium);
const totalPremiumBasico = num(kpis?.total_premium_basico);
const totalPremiumPro = num(kpis?.total_premium_pro);
const novasAssinaturas = num(kpis?.novas_assinaturas_dia);

// ═══ NOVO v5: Métricas de canal ═══
const palpitesAndroid = num(kpis?.palpites_android);
const palpitesWeb = num(kpis?.palpites_web);
const palpitesIos = num(kpis?.palpites_ios);
const palpitesOrigemNull = num(kpis?.palpites_origem_null);
const pctPalpitesAndroid = num(kpis?.pct_palpites_android);

const palpitesEmCampAtivo = num(kpis?.palpites_em_camp_ativo);
const palpitesEmCampFuturo = num(kpis?.palpites_em_camp_futuro);
const boloesSocialmenteVivos = num(kpis?.boloes_socialmente_vivos);
const powerUsersTop10 = num(kpis?.power_users_top10_palpites);

// % palpites em campeonato ativo (foco do produto hoje)
const pctPalpitesAtivo = palpitesDia > 0 
  ? round((palpitesEmCampAtivo / palpitesDia) * 100, 2) 
  : 0;

// % com origem identificada
const palpitesComOrigem = palpitesAndroid + palpitesWeb + palpitesIos;
const pctOrigemIdentificada = palpitesDia > 0
  ? round((palpitesComOrigem / palpitesDia) * 100, 2)
  : 0;

// Receita potencial por canal (só Android tem ads ativos)
// Estimativa simples: cada palpite ~5 impressões de ad
const impressoesAdmobEstimadasAndroid = palpitesAndroid * 5;
const receitaAdmobEstimada = ecpm > 0 
  ? round((impressoesAdmobEstimadasAndroid / 1000) * ecpm, 2)
  : null;

// Taxa de bolões "sociais"
const taxaBoloesSociais = boloesPrivadosDia > 0 
  ? round((boloesComAmigosDia / boloesPrivadosDia) * 100, 2) 
  : 0;

// % bolões em camp ativo
const pctBoloesEmCampAtivo = boloesCriadosDia > 0
  ? round((boloesEmCampAtivoDia / boloesCriadosDia) * 100, 2)
  : 0;

// CAC
const temDadosMidia = fontes_de_dados.meta_ads === 'ativa' || fontes_de_dados.google_ads === 'ativa';
const gastoTotal = round(gastoMeta + gastoGoogle, 2);
const cacBlended = (temDadosMidia && novosCadastros > 0) ? round(gastoTotal / novosCadastros, 2) : null;
const cacMeta = (fontes_de_dados.meta_ads === 'ativa' && novosCadastros > 0) ? round(gastoMeta / novosCadastros, 2) : null;
const cacGoogle = (fontes_de_dados.google_ads === 'ativa' && novosCadastros > 0) ? round(gastoGoogle / novosCadastros, 2) : null;

let cadastrosOrganicosEst = null;
let cadastrosPagosEst = null;
if (temDadosMidia) {
  cadastrosOrganicosEst = gastoTotal > 0 && cacBlended > 0
    ? Math.max(0, novosCadastros - Math.round(gastoTotal / Math.max(cacBlended, 1)))
    : novosCadastros;
  cadastrosPagosEst = novosCadastros - cadastrosOrganicosEst;
}

// MRR
const mrrEstimado = round((totalPremiumBasico * 9.90) + (totalPremiumPro * 14.90), 2);
const arpu = totalUsuarios > 0 ? round((mrrEstimado + admobReceita * 30) / totalUsuarios, 2) : 0;
const ltvEstimado = round(arpu * 6, 2);
const ltvCac = (cacBlended && cacBlended > 0) ? round(ltvEstimado / cacBlended, 2) : null;
const conversaoPremium = totalUsuarios > 0
  ? round((totalPremium / totalUsuarios) * 100, 2)
  : 0;

// Comparativos
const hist7 = historico.slice(-7);
const hist30 = historico;

const avg = (arr, key) => {
  if (!arr || arr.length === 0) return 0;
  const vals = arr.map(r => num(r?.[key])).filter(v => v > 0);
  return vals.length > 0 ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : 0;
};

const delta = (atual, base) => {
  if (!base || base === 0) return null;
  return round(((atual - base) / base) * 100, 2);
};

const comparativos = {
  novos_cadastros: {
    atual: novosCadastros,
    media_7d: avg(hist7, 'novos_cadastros'),
    delta_7d_pct: delta(novosCadastros, avg(hist7, 'novos_cadastros'))
  },
  taxa_ativacao: {
    atual: taxaAtivacao,
    media_7d: avg(hist7, 'taxa_ativacao_pct'),
    delta_7d_pct: delta(taxaAtivacao, avg(hist7, 'taxa_ativacao_pct'))
  },
  dau: {
    atual: dau,
    media_7d: avg(hist7, 'dau'),
    delta_7d_pct: delta(dau, avg(hist7, 'dau'))
  },
  palpites_android: {
    atual: palpitesAndroid,
    media_7d: avg(hist7, 'palpites_android'),
    delta_7d_pct: delta(palpitesAndroid, avg(hist7, 'palpites_android'))
  },
  boloes_socialmente_vivos: {
    atual: boloesSocialmenteVivos,
    media_7d: avg(hist7, 'boloes_socialmente_vivos'),
    delta_7d_pct: delta(boloesSocialmenteVivos, avg(hist7, 'boloes_socialmente_vivos'))
  }
};

const anomalias = [];
for (const [metric, comp] of Object.entries(comparativos)) {
  if (comp.delta_7d_pct !== null && Math.abs(comp.delta_7d_pct) >= 25) {
    anomalias.push({
      metrica: metric,
      direcao: comp.delta_7d_pct > 0 ? 'subiu' : 'caiu',
      delta_pct: comp.delta_7d_pct,
      severidade: Math.abs(comp.delta_7d_pct) >= 50 ? 'alta' : 'media'
    });
  }
}

const primeira_execucao = historico.length === 0;
const dataRef = $('Definir contexto temporal').item.json.data_referencia;

return [{
  json: {
    data_referencia: dataRef,
    primeira_execucao,
    fontes_de_dados,
    
    // Aquisição
    novos_cadastros: novosCadastros,
    cadastros_referidos: cadastrosReferidos,
    cadastros_organicos: cadastrosOrganicosEst,
    cadastros_pagos: cadastrosPagosEst,
    total_usuarios: totalUsuarios,
    
    // Ativação
    cadastros_email_confirmado: cadastrosEmailConfirmado,
    taxa_confirmacao_email_pct: taxaConfirmacaoEmail,
    ativacao_criou_bolao: ativacaoCriouBolao,
    ativacao_entrou_bolao: ativacaoEntrouBolao,
    ativacao_palpitou: ativacaoPalpitou,
    ativados_24h: ativados24h,
    taxa_ativacao_pct: taxaAtivacao,
    
    // Engajamento
    dau, wau, mau,
    stickiness_pct: stickiness,
    palpites_dia: palpitesDia,
    
    // Engajamento profundo
    usuarios_com_streak: usuariosComStreak,
    streak_medio: streakMedio,
    usuarios_pontuando_dia: usuariosPontuandoDia,
    
    // ═══ NOVO v5: Análise de canal ═══
    canal: {
      palpites_android: palpitesAndroid,
      palpites_web: palpitesWeb,
      palpites_ios: palpitesIos,
      palpites_origem_null: palpitesOrigemNull,
      pct_android: pctPalpitesAndroid,
      pct_origem_identificada: pctOrigemIdentificada,
      receita_admob_estimada_brl: receitaAdmobEstimada
    },
    
    // ═══ NOVO v5: Saúde social ═══
    social: {
      boloes_socialmente_vivos: boloesSocialmenteVivos,
      power_users_top10: powerUsersTop10,
      taxa_boloes_sociais_pct: taxaBoloesSociais
    },
    
    // ═══ NOVO v5: Distribuição de palpites por campeonato ═══
    palpites_em_camp_ativo: palpitesEmCampAtivo,
    palpites_em_camp_futuro: palpitesEmCampFuturo,
    pct_palpites_em_camp_ativo: pctPalpitesAtivo,
    top_campeonatos_dia,  // array com top 10
    
    // Bolões
    boloes_criados_dia: boloesCriadosDia,
    boloes_privados_dia: boloesPrivadosDia,
    boloes_publicos_dia: boloesPublicosDia,
    boloes_com_amigos_dia: boloesComAmigosDia,
    total_participacoes_dia: totalParticipacoesDia,
    participacoes_organicas_dia: participacoesOrganicasDia,
    
    // Contexto de campeonatos
    boloes_em_camp_ativo_dia: boloesEmCampAtivoDia,
    boloes_em_camp_futuro_dia: boloesEmCampFuturoDia,
    pct_boloes_em_camp_ativo: pctBoloesEmCampAtivo,
    usuarios_presos_camp_futuro: usuariosPresosCampFuturo,
    
    // Mídia paga
    gasto_meta_brl: fontes_de_dados.meta_ads === 'ativa' ? gastoMeta : null,
    meta_impressoes: fontes_de_dados.meta_ads === 'ativa' ? impressoesMeta : null,
    meta_cliques: fontes_de_dados.meta_ads === 'ativa' ? cliquesMeta : null,
    meta_ctr_pct: fontes_de_dados.meta_ads === 'ativa' ? ctrMeta : null,
    meta_alcance: fontes_de_dados.meta_ads === 'ativa' ? alcanceMeta : null,
    meta_frequencia: fontes_de_dados.meta_ads === 'ativa' ? freqMeta : null,
    meta_cadastros_attr: fontes_de_dados.meta_ads === 'ativa' ? metaCadastrosAttr : null,
    meta_breakdown: fontes_de_dados.meta_ads === 'ativa' ? {
      total_campanhas: metaCampanhas.length,
      top_por_gasto: top_meta_por_gasto,
      top_por_ctr: top_meta_por_ctr,
      top_por_cadastros: meta_campanhas_top_cadastros,
      baixo_desempenho: meta_campanhas_baixo_desempenho
    } : null,
    gasto_google_brl: fontes_de_dados.google_ads === 'ativa' ? gastoGoogle : null,
    gasto_total_brl: temDadosMidia ? gastoTotal : null,
    cac_blended_brl: cacBlended,
    cac_meta_brl: cacMeta,
    cac_google_brl: cacGoogle,
    
    // AdMob
    admob_impressoes: fontes_de_dados.admob === 'ativa' ? admobImpressoes : null,
    admob_receita_brl: fontes_de_dados.admob === 'ativa' ? admobReceita : null,
    ecpm_brl: fontes_de_dados.admob === 'ativa' ? ecpm : null,
    fill_rate_pct: fontes_de_dados.admob === 'ativa' ? fillRate : null,
    admob_cliques: fontes_de_dados.admob === 'ativa' ? admobCliques : null,
    admob_ctr_pct: fontes_de_dados.admob === 'ativa' ? admobCtr : null,
    admob_breakdown: fontes_de_dados.admob === 'ativa' ? {
      top_ad_units_por_receita,
      top_ad_units_por_ecpm,
      ad_units_baixo_desempenho,
      formatos: formatsArr,
      plataformas: platformsArr,
      total_ad_units: adUnitsArr.length
    } : null,
    
    // Assinaturas
    novas_assinaturas: novasAssinaturas,
    total_premium: totalPremium,
    total_premium_basico: totalPremiumBasico,
    total_premium_pro: totalPremiumPro,
    mrr_brl: mrrEstimado,
    arpu_brl: arpu,
    conversao_free_premium_pct: conversaoPremium,
    ltv_estimado_brl: ltvEstimado,
    ltv_cac_ratio: ltvCac,
    
    // Comparativos
    comparativos,
    anomalias,
    historico_30d: historico
  }
}];
