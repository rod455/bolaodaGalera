-- ============================================================================
-- 07-rls-policies.sql: Row Level Security + policies
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- ============================================================================

-- ---- Habilitar RLS em todas as tabelas ----
ALTER TABLE public.agent_analysis_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners_home ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_campeonatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_moderadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campeonatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_especiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_mata_ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_mata_escolhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_mata_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacao_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacao_preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_executivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulador_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_log ENABLE ROW LEVEL SECURITY;

-- ---- Policies de leitura publica (campeonatos, jogos, banners) ----
DROP POLICY IF EXISTS "Campeonatos visiveis" ON public.campeonatos;
CREATE POLICY "Campeonatos visiveis" ON public.campeonatos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Jogos visiveis" ON public.jogos;
CREATE POLICY "Jogos visiveis" ON public.jogos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Boloes visiveis" ON public.boloes;
CREATE POLICY "Boloes visiveis" ON public.boloes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Cupons visiveis" ON public.cupons;
CREATE POLICY "Cupons visiveis" ON public.cupons FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS banners_read_all ON public.banners;
CREATE POLICY banners_read_all ON public.banners FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS banners_admin_write ON public.banners;
CREATE POLICY banners_admin_write ON public.banners FOR ALL TO public USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Banners visiveis para todos" ON public.banners_home;
CREATE POLICY "Banners visiveis para todos" ON public.banners_home FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Banners quiz visiveis para todos" ON public.banners_quiz;
CREATE POLICY "Banners quiz visiveis para todos" ON public.banners_quiz FOR SELECT TO public USING (true);

-- ---- Profiles ----
DROP POLICY IF EXISTS "Perfis visiveis" ON public.profiles;
CREATE POLICY "Perfis visiveis" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Criar proprio perfil" ON public.profiles;
CREATE POLICY "Criar proprio perfil" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Editar proprio perfil" ON public.profiles;
CREATE POLICY "Editar proprio perfil" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);

-- ---- Boloes (criar/editar/deletar) ----
DROP POLICY IF EXISTS "Criar bolao" ON public.boloes;
CREATE POLICY "Criar bolao" ON public.boloes FOR INSERT TO public WITH CHECK (auth.uid() = criador_id);

DROP POLICY IF EXISTS "Editar bolao" ON public.boloes;
CREATE POLICY "Editar bolao" ON public.boloes FOR UPDATE TO public USING (
  auth.uid() = criador_id
  OR auth.uid() IN (SELECT user_id FROM public.bolao_moderadores WHERE bolao_id = boloes.id)
);

DROP POLICY IF EXISTS "Deletar bolao" ON public.boloes;
CREATE POLICY "Deletar bolao" ON public.boloes FOR DELETE TO public USING (auth.uid() = criador_id AND is_nacional = false);

-- ---- Bolao participantes ----
DROP POLICY IF EXISTS "Ver participantes" ON public.bolao_participantes;
CREATE POLICY "Ver participantes" ON public.bolao_participantes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Entrar no bolao" ON public.bolao_participantes;
CREATE POLICY "Entrar no bolao" ON public.bolao_participantes FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sair do bolao" ON public.bolao_participantes;
CREATE POLICY "Sair do bolao" ON public.bolao_participantes FOR DELETE TO public USING (
  auth.uid() = user_id
  OR auth.uid() IN (SELECT criador_id FROM public.boloes WHERE id = bolao_participantes.bolao_id)
);

DROP POLICY IF EXISTS "Moderador pode aprovar participantes" ON public.bolao_participantes;
CREATE POLICY "Moderador pode aprovar participantes" ON public.bolao_participantes FOR UPDATE TO public USING (
  auth.uid() IN (
    SELECT criador_id FROM public.boloes WHERE id = bolao_participantes.bolao_id
    UNION
    SELECT user_id FROM public.bolao_moderadores WHERE bolao_id = bolao_participantes.bolao_id
  )
) WITH CHECK (
  auth.uid() IN (
    SELECT criador_id FROM public.boloes WHERE id = bolao_participantes.bolao_id
    UNION
    SELECT user_id FROM public.bolao_moderadores WHERE bolao_id = bolao_participantes.bolao_id
  )
);

-- ---- Palpites ----
DROP POLICY IF EXISTS "Ver palpites" ON public.palpites;
CREATE POLICY "Ver palpites" ON public.palpites FOR SELECT TO public USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.jogos j WHERE j.id = palpites.jogo_id AND j.status IN ('ao_vivo', 'encerrado'))
);

DROP POLICY IF EXISTS "Criar palpite" ON public.palpites;
CREATE POLICY "Criar palpite" ON public.palpites FOR INSERT TO public WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.jogos
    WHERE id = palpites.jogo_id AND status = 'agendado' AND data_hora > (now() + INTERVAL '10 minutes')
  )
);

DROP POLICY IF EXISTS "Editar palpite" ON public.palpites;
CREATE POLICY "Editar palpite" ON public.palpites FOR UPDATE TO public USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.jogos
    WHERE id = palpites.jogo_id AND status = 'agendado' AND data_hora > (now() + INTERVAL '10 minutes')
  )
);

DROP POLICY IF EXISTS "Deletar palpite" ON public.palpites;
CREATE POLICY "Deletar palpite" ON public.palpites FOR DELETE TO public USING (
  auth.uid() = user_id
  OR auth.uid() IN (SELECT criador_id FROM public.boloes WHERE id = palpites.bolao_id)
);

-- ---- Moderadores ----
DROP POLICY IF EXISTS "Criador pode gerenciar moderadores" ON public.bolao_moderadores;
CREATE POLICY "Criador pode gerenciar moderadores" ON public.bolao_moderadores FOR ALL TO public USING (
  EXISTS (SELECT 1 FROM public.boloes b WHERE b.id = bolao_moderadores.bolao_id AND b.criador_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.boloes b WHERE b.id = bolao_moderadores.bolao_id AND b.criador_id = auth.uid())
);

DROP POLICY IF EXISTS "Participantes podem ver moderadores do bolao" ON public.bolao_moderadores;
CREATE POLICY "Participantes podem ver moderadores do bolao" ON public.bolao_moderadores FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM public.bolao_participantes bp WHERE bp.bolao_id = bolao_moderadores.bolao_id AND bp.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.boloes b WHERE b.id = bolao_moderadores.bolao_id AND b.criador_id = auth.uid())
);

DROP POLICY IF EXISTS "Moderadores podem inserir moderadores" ON public.bolao_moderadores;
CREATE POLICY "Moderadores podem inserir moderadores" ON public.bolao_moderadores FOR INSERT TO public WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bolao_moderadores bm
    JOIN public.boloes b ON b.id = bm.bolao_id
    WHERE bm.bolao_id = bolao_moderadores.bolao_id
      AND bm.user_id = auth.uid()
      AND b.mod_pode_promover = true
  )
);

DROP POLICY IF EXISTS "Moderadores podem remover moderadores" ON public.bolao_moderadores;
CREATE POLICY "Moderadores podem remover moderadores" ON public.bolao_moderadores FOR DELETE TO public USING (
  EXISTS (
    SELECT 1 FROM public.bolao_moderadores bm
    JOIN public.boloes b ON b.id = bm.bolao_id
    WHERE bm.bolao_id = bolao_moderadores.bolao_id
      AND bm.user_id = auth.uid()
      AND b.mod_pode_promover = true
  )
);

-- ---- bolao_campeonatos ----
DROP POLICY IF EXISTS "Qualquer um pode ver campeonatos de boloes" ON public.bolao_campeonatos;
CREATE POLICY "Qualquer um pode ver campeonatos de boloes" ON public.bolao_campeonatos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Criador pode gerenciar campeonatos do bolao" ON public.bolao_campeonatos;
CREATE POLICY "Criador pode gerenciar campeonatos do bolao" ON public.bolao_campeonatos FOR INSERT TO public WITH CHECK (
  EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_campeonatos.bolao_id AND criador_id = auth.uid())
);

DROP POLICY IF EXISTS "Criador pode remover campeonatos do bolao" ON public.bolao_campeonatos;
CREATE POLICY "Criador pode remover campeonatos do bolao" ON public.bolao_campeonatos FOR DELETE TO public USING (
  EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_campeonatos.bolao_id AND criador_id = auth.uid())
);

-- ---- Eventos especiais ----
DROP POLICY IF EXISTS "Criador pode gerenciar eventos" ON public.eventos_especiais;
CREATE POLICY "Criador pode gerenciar eventos" ON public.eventos_especiais FOR ALL TO public USING (
  criador_id = auth.uid()
  OR bolao_id IN (SELECT id FROM public.boloes WHERE criador_id = auth.uid())
);

DROP POLICY IF EXISTS "Participantes podem ver eventos" ON public.eventos_especiais;
CREATE POLICY "Participantes podem ver eventos" ON public.eventos_especiais FOR SELECT TO public USING (
  bolao_id IN (SELECT bolao_id FROM public.bolao_participantes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Participantes podem ver ranking eventos" ON public.eventos_ranking;
CREATE POLICY "Participantes podem ver ranking eventos" ON public.eventos_ranking FOR SELECT TO public USING (
  evento_id IN (
    SELECT e.id FROM public.eventos_especiais e
    JOIN public.bolao_participantes bp ON bp.bolao_id = e.bolao_id
    WHERE bp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sistema pode gerenciar ranking eventos" ON public.eventos_ranking;
CREATE POLICY "Sistema pode gerenciar ranking eventos" ON public.eventos_ranking FOR ALL TO public USING (true);

-- ---- Mata-mata ----
DROP POLICY IF EXISTS "Leitura publica ciclos" ON public.mata_mata_ciclos;
CREATE POLICY "Leitura publica ciclos" ON public.mata_mata_ciclos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Insert auth ciclos" ON public.mata_mata_ciclos;
CREATE POLICY "Insert auth ciclos" ON public.mata_mata_ciclos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update auth ciclos" ON public.mata_mata_ciclos;
CREATE POLICY "Update auth ciclos" ON public.mata_mata_ciclos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Leitura publica mm_esc" ON public.mata_mata_escolhas;
CREATE POLICY "Leitura publica mm_esc" ON public.mata_mata_escolhas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Insert proprio mm_esc" ON public.mata_mata_escolhas;
CREATE POLICY "Insert proprio mm_esc" ON public.mata_mata_escolhas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update proprio mm_esc" ON public.mata_mata_escolhas;
CREATE POLICY "Update proprio mm_esc" ON public.mata_mata_escolhas FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leitura publica mm_part" ON public.mata_mata_participantes;
CREATE POLICY "Leitura publica mm_part" ON public.mata_mata_participantes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Insert proprio mm_part" ON public.mata_mata_participantes;
CREATE POLICY "Insert proprio mm_part" ON public.mata_mata_participantes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update proprio mm_part" ON public.mata_mata_participantes;
CREATE POLICY "Update proprio mm_part" ON public.mata_mata_participantes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ---- Notificacoes ----
DROP POLICY IF EXISTS notificacao_log_insert ON public.notificacao_log;
CREATE POLICY notificacao_log_insert ON public.notificacao_log FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS notificacao_log_select ON public.notificacao_log;
CREATE POLICY notificacao_log_select ON public.notificacao_log FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notificacao_prefs_own ON public.notificacao_preferencias;
CREATE POLICY notificacao_prefs_own ON public.notificacao_preferencias FOR ALL TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notificacoes_select_own ON public.notificacoes;
CREATE POLICY notificacoes_select_own ON public.notificacoes FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notificacoes_insert_service ON public.notificacoes;
CREATE POLICY notificacoes_insert_service ON public.notificacoes FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS notificacoes_update_own ON public.notificacoes;
CREATE POLICY notificacoes_update_own ON public.notificacoes FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notificacoes_delete_own ON public.notificacoes;
CREATE POLICY notificacoes_delete_own ON public.notificacoes FOR DELETE TO public USING (auth.uid() = user_id);

-- ---- Push tokens / Referrals / XP ----
DROP POLICY IF EXISTS push_tokens_own ON public.push_tokens;
CREATE POLICY push_tokens_own ON public.push_tokens FOR ALL TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS referrals_insert ON public.referrals;
CREATE POLICY referrals_insert ON public.referrals FOR INSERT TO public WITH CHECK (auth.uid() = referred_id);

DROP POLICY IF EXISTS referrals_read ON public.referrals;
CREATE POLICY referrals_read ON public.referrals FOR SELECT TO public USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS referrals_update ON public.referrals;
CREATE POLICY referrals_update ON public.referrals FOR UPDATE TO public USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS user_xp_read_all ON public.user_xp;
CREATE POLICY user_xp_read_all ON public.user_xp FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS user_xp_insert_own ON public.user_xp;
CREATE POLICY user_xp_insert_own ON public.user_xp FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_xp_update_own ON public.user_xp;
CREATE POLICY user_xp_update_own ON public.user_xp FOR UPDATE TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS xp_log_read_own ON public.xp_log;
CREATE POLICY xp_log_read_own ON public.xp_log FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS xp_log_insert_own ON public.xp_log;
CREATE POLICY xp_log_insert_own ON public.xp_log FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

-- ---- Simulador / Sessions / Sync log ----
DROP POLICY IF EXISTS "Inserir proprio resultado" ON public.simulador_resultados;
CREATE POLICY "Inserir proprio resultado" ON public.simulador_resultados FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Ver proprios resultados" ON public.simulador_resultados;
CREATE POLICY "Ver proprios resultados" ON public.simulador_resultados FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Ver sync log" ON public.sync_log;
CREATE POLICY "Ver sync log" ON public.sync_log FOR SELECT TO public USING (true);

-- ---- Service-role-only (admin) ----
DROP POLICY IF EXISTS "Service role full access" ON public.agent_analysis_log;
CREATE POLICY "Service role full access" ON public.agent_analysis_log FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.agent_events;
CREATE POLICY "Service role full access" ON public.agent_events FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.daily_metrics;
CREATE POLICY "Service role full access" ON public.daily_metrics FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.email_reminders_sent;
CREATE POLICY "Service role full access" ON public.email_reminders_sent FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.push_reminders_sent;
CREATE POLICY "Service role full access" ON public.push_reminders_sent FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.user_sessions;
CREATE POLICY "Service role full access" ON public.user_sessions FOR SELECT TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS block_all_users ON public.relatorios_executivos;
CREATE POLICY block_all_users ON public.relatorios_executivos FOR ALL TO authenticated USING (false);
