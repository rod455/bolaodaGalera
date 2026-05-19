-- ============================================================================
-- 04-indexes.sql: indexes nao-PK/nao-UNIQUE para performance
-- Idempotente: CREATE INDEX IF NOT EXISTS.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_analysis_log_date ON public.agent_analysis_log USING btree (analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_log_score ON public.agent_analysis_log USING btree (health_score);
CREATE INDEX IF NOT EXISTS idx_agent_events_pending ON public.agent_events USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_agent_events_source ON public.agent_events USING btree (source_agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_target ON public.agent_events USING btree (target_agent, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON public.agent_events USING btree (event_type, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banners_ativos ON public.banners USING btree (ativo, data_inicio, data_fim) WHERE (ativo = true);
CREATE INDEX IF NOT EXISTS idx_banners_home_ativo ON public.banners_home USING btree (ativo, posicao) WHERE (ativo = true);
CREATE INDEX IF NOT EXISTS idx_bolao_campeonatos_bolao ON public.bolao_campeonatos USING btree (bolao_id);
CREATE INDEX IF NOT EXISTS idx_bolao_campeonatos_camp ON public.bolao_campeonatos USING btree (campeonato_id);
CREATE INDEX IF NOT EXISTS idx_bolao_part_bolao ON public.bolao_participantes USING btree (bolao_id);
CREATE INDEX IF NOT EXISTS idx_bolao_part_user ON public.bolao_participantes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_bolao_participantes_status ON public.bolao_participantes USING btree (bolao_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON public.daily_metrics USING btree (date DESC);
CREATE INDEX IF NOT EXISTS idx_email_reminders_rodada ON public.email_reminders_sent USING btree (rodada_key);
CREATE INDEX IF NOT EXISTS idx_email_reminders_user ON public.email_reminders_sent USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_ativo ON public.eventos_especiais USING btree (bolao_id, ativo);
CREATE INDEX IF NOT EXISTS idx_eventos_bolao ON public.eventos_especiais USING btree (bolao_id);
CREATE INDEX IF NOT EXISTS idx_eventos_ranking ON public.eventos_ranking USING btree (evento_id, pontos DESC);
CREATE INDEX IF NOT EXISTS idx_jogos_api_id ON public.jogos USING btree (api_football_id);
CREATE INDEX IF NOT EXISTS idx_jogos_campeonato ON public.jogos USING btree (campeonato_id);
CREATE INDEX IF NOT EXISTS idx_jogos_campeonato_rodada ON public.jogos USING btree (campeonato_id, rodada);
CREATE INDEX IF NOT EXISTS idx_jogos_data_hora ON public.jogos USING btree (data_hora);
CREATE INDEX IF NOT EXISTS idx_jogos_status ON public.jogos USING btree (status);
CREATE INDEX IF NOT EXISTS idx_mm_ciclos_bolao ON public.mata_mata_ciclos USING btree (bolao_id, status);
CREATE INDEX IF NOT EXISTS idx_mm_escolhas_ciclo ON public.mata_mata_escolhas USING btree (ciclo_id, rodada);
CREATE INDEX IF NOT EXISTS idx_mm_escolhas_user ON public.mata_mata_escolhas USING btree (ciclo_id, user_id);
CREATE INDEX IF NOT EXISTS idx_mm_part_ciclo ON public.mata_mata_participantes USING btree (ciclo_id, status);
CREATE INDEX IF NOT EXISTS idx_notificacao_log_ref ON public.notificacao_log USING btree (user_id, referencia);
CREATE INDEX IF NOT EXISTS idx_notificacoes_cleanup ON public.notificacoes USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON public.notificacoes USING btree (user_id, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_palpites_bolao ON public.palpites USING btree (bolao_id);
CREATE INDEX IF NOT EXISTS idx_palpites_bolao_jogo ON public.palpites USING btree (bolao_id, jogo_id);
CREATE INDEX IF NOT EXISTS idx_palpites_jogo ON public.palpites USING btree (jogo_id);
CREATE INDEX IF NOT EXISTS idx_palpites_user ON public.palpites USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles USING btree (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_unsubscribe_token ON public.profiles USING btree (email_unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_push_reminders_rodada ON public.push_reminders_sent USING btree (rodada_key);
CREATE INDEX IF NOT EXISTS idx_push_reminders_user ON public.push_reminders_sent USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens USING btree (user_id) WHERE (ativo = true);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals USING btree (referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON public.relatorios_executivos USING btree (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_acao ON public.xp_log USING btree (user_id, acao);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_ref ON public.xp_log USING btree (user_id, acao, referencia);
