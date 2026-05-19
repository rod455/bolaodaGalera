-- ============================================================================
-- 05-foreign-keys.sql: foreign keys entre as tabelas
-- Idempotente: usa DO + EXCEPTION para ignorar FKs ja existentes.
-- ============================================================================

DO $$ BEGIN ALTER TABLE public.banners_home ADD CONSTRAINT banners_home_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_campeonatos ADD CONSTRAINT bolao_campeonatos_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_campeonatos ADD CONSTRAINT bolao_campeonatos_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_moderadores ADD CONSTRAINT bolao_moderadores_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_moderadores ADD CONSTRAINT bolao_moderadores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_participantes ADD CONSTRAINT bolao_participantes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bolao_participantes ADD CONSTRAINT bolao_participantes_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.boloes ADD CONSTRAINT boloes_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.boloes ADD CONSTRAINT boloes_criador_id_fkey FOREIGN KEY (criador_id) REFERENCES public.profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.email_reminders_sent ADD CONSTRAINT email_reminders_sent_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_especiais ADD CONSTRAINT eventos_especiais_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_especiais ADD CONSTRAINT eventos_especiais_criador_id_fkey FOREIGN KEY (criador_id) REFERENCES auth.users(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_ranking ADD CONSTRAINT eventos_ranking_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos_especiais(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.eventos_ranking ADD CONSTRAINT eventos_ranking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.jogos ADD CONSTRAINT jogos_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_ciclos ADD CONSTRAINT mata_mata_ciclos_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_ciclos ADD CONSTRAINT mata_mata_ciclos_vencedor_id_fkey FOREIGN KEY (vencedor_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_escolhas ADD CONSTRAINT mata_mata_escolhas_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.mata_mata_ciclos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_escolhas ADD CONSTRAINT mata_mata_escolhas_jogo_id_fkey FOREIGN KEY (jogo_id) REFERENCES public.jogos(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_escolhas ADD CONSTRAINT mata_mata_escolhas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_participantes ADD CONSTRAINT mata_mata_participantes_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.mata_mata_ciclos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.mata_mata_participantes ADD CONSTRAINT mata_mata_participantes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacao_log ADD CONSTRAINT notificacao_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacao_preferencias ADD CONSTRAINT notificacao_preferencias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.palpites ADD CONSTRAINT palpites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.palpites ADD CONSTRAINT palpites_bolao_id_fkey FOREIGN KEY (bolao_id) REFERENCES public.boloes(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.palpites ADD CONSTRAINT palpites_jogo_id_fkey FOREIGN KEY (jogo_id) REFERENCES public.jogos(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_reminders_sent ADD CONSTRAINT push_reminders_sent_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.push_tokens ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.simulador_resultados ADD CONSTRAINT simulador_resultados_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_xp ADD CONSTRAINT user_xp_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.xp_log ADD CONSTRAINT xp_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
