-- ============================================================================
-- 02-constraints.sql: PRIMARY KEYs, UNIQUEs e CHECKs
-- Idempotente: usa DO + EXCEPTION para ignorar constraints ja existentes.
-- ============================================================================

-- ---- Primary Keys ----
DO $$ BEGIN ALTER TABLE public.agent_analysis_log ADD CONSTRAINT agent_analysis_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.banners ADD CONSTRAINT banners_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.banners_home ADD CONSTRAINT banners_home_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.banners_quiz ADD CONSTRAINT banners_quiz_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_campeonatos ADD CONSTRAINT bolao_campeonatos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_moderadores ADD CONSTRAINT bolao_moderadores_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_participantes ADD CONSTRAINT bolao_participantes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.boloes ADD CONSTRAINT boloes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.campeonatos ADD CONSTRAINT campeonatos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.cupons ADD CONSTRAINT cupons_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.email_reminders_sent ADD CONSTRAINT email_reminders_sent_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_especiais ADD CONSTRAINT eventos_especiais_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_ranking ADD CONSTRAINT eventos_ranking_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.jogos ADD CONSTRAINT jogos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_ciclos ADD CONSTRAINT mata_mata_ciclos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_escolhas ADD CONSTRAINT mata_mata_escolhas_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_participantes ADD CONSTRAINT mata_mata_participantes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacao_log ADD CONSTRAINT notificacao_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacao_preferencias ADD CONSTRAINT notificacao_preferencias_pkey PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.palpites ADD CONSTRAINT palpites_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_reminders_sent ADD CONSTRAINT push_reminders_sent_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.referrals ADD CONSTRAINT referrals_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.relatorios_executivos ADD CONSTRAINT relatorios_executivos_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.simulador_resultados ADD CONSTRAINT simulador_resultados_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.sync_log ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.xp_log ADD CONSTRAINT xp_log_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ---- Unique Constraints ----
DO $$ BEGIN ALTER TABLE public.bolao_campeonatos ADD CONSTRAINT bolao_campeonatos_bolao_id_campeonato_id_key UNIQUE (bolao_id, campeonato_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_moderadores ADD CONSTRAINT bolao_moderadores_bolao_id_user_id_key UNIQUE (bolao_id, user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_participantes ADD CONSTRAINT bolao_participantes_bolao_id_user_id_key UNIQUE (bolao_id, user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.boloes ADD CONSTRAINT boloes_codigo_convite_key UNIQUE (codigo_convite); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.campeonatos ADD CONSTRAINT campeonatos_api_football_id_key UNIQUE (api_football_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.cupons ADD CONSTRAINT cupons_codigo_key UNIQUE (codigo); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_date_key UNIQUE (date); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.email_reminders_sent ADD CONSTRAINT email_reminders_sent_user_id_rodada_key_key UNIQUE (user_id, rodada_key); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_ranking ADD CONSTRAINT eventos_ranking_evento_id_user_id_key UNIQUE (evento_id, user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.jogos ADD CONSTRAINT jogos_api_football_id_key UNIQUE (api_football_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_ciclos ADD CONSTRAINT mata_mata_ciclos_bolao_id_ciclo_numero_key UNIQUE (bolao_id, ciclo_numero); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_escolhas ADD CONSTRAINT mata_mata_escolhas_ciclo_id_user_id_rodada_key UNIQUE (ciclo_id, user_id, rodada); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_participantes ADD CONSTRAINT mata_mata_participantes_ciclo_id_user_id_key UNIQUE (ciclo_id, user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacao_log ADD CONSTRAINT notificacao_log_user_id_referencia_key UNIQUE (user_id, referencia); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.palpites ADD CONSTRAINT palpites_jogo_id_user_id_bolao_id_key UNIQUE (jogo_id, user_id, bolao_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_reminders_sent ADD CONSTRAINT push_reminders_sent_user_id_rodada_key_key UNIQUE (user_id, rodada_key); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.relatorios_executivos ADD CONSTRAINT relatorios_executivos_data_unique UNIQUE (data_referencia); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_user_id_key UNIQUE (user_id); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- ---- CHECK Constraints ----
DO $$ BEGIN ALTER TABLE public.agent_analysis_log ADD CONSTRAINT agent_analysis_log_human_rating_check CHECK (human_rating >= 1 AND human_rating <= 5); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_analysis_log ADD CONSTRAINT agent_analysis_log_health_score_check CHECK (health_score >= 0 AND health_score <= 100); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'dismissed'::text, 'escalated'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_target_agent_check CHECK (target_agent = ANY (ARRAY['data'::text, 'marketing'::text, 'ads'::text, 'monetization'::text, 'product'::text, 'support'::text, 'orchestrator'::text, 'dashboard'::text, 'all'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_event_type_check CHECK (event_type = ANY (ARRAY['anomaly'::text, 'opportunity'::text, 'action_request'::text, 'action_completed'::text, 'insight'::text, 'alert'::text, 'decision'::text, 'report'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_source_agent_check CHECK (source_agent = ANY (ARRAY['data'::text, 'marketing'::text, 'ads'::text, 'monetization'::text, 'product'::text, 'support'::text, 'orchestrator'::text, 'dashboard'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_severity_check CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_collection_status_check CHECK (collection_status = ANY (ARRAY['pending'::text, 'partial'::text, 'complete'::text, 'error'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_especiais ADD CONSTRAINT eventos_especiais_tipo_check CHECK (tipo = ANY (ARRAY['multiplicador'::text, 'mini_campeonato'::text, 'desafio_jogo'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.jogos ADD CONSTRAINT jogos_status_check CHECK (status = ANY (ARRAY['agendado'::text, 'ao_vivo'::text, 'encerrado'::text, 'adiado'::text, 'cancelado'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_plano_check CHECK (plano = ANY (ARRAY['free'::text, 'premium'::text, 'premium_pro'::text])); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
