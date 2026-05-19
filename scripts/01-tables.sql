-- ============================================================================
-- 01-tables.sql: criar todas as 32 tabelas (sem constraints, sem FKs)
-- Idempotente: CREATE TABLE IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_analysis_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent text NOT NULL DEFAULT 'data'::text,
  analysis_date date NOT NULL,
  metrics_snapshot jsonb NOT NULL,
  health_score integer,
  summary text,
  anomalies jsonb DEFAULT '[]'::jsonb,
  opportunities jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  model_used text DEFAULT 'claude-sonnet-4-20250514'::text,
  tokens_input integer,
  tokens_output integer,
  latency_ms integer,
  human_rating integer,
  human_feedback text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text,
  event_type text NOT NULL,
  severity text DEFAULT 'medium'::text,
  title text NOT NULL,
  description text,
  payload jsonb DEFAULT '{}'::jsonb,
  related_metric text,
  metric_value numeric,
  metric_change_pct numeric,
  status text DEFAULT 'pending'::text,
  processed_by text,
  processed_at timestamp with time zone,
  response_payload jsonb,
  metric_date date,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'auto_promo'::text,
  imagem_url text,
  titulo text NOT NULL,
  subtitulo text,
  cor_fundo text DEFAULT '#166534'::text,
  cor_texto text DEFAULT '#FFFFFF'::text,
  emoji text,
  cta_texto text DEFAULT 'Saiba mais'::text,
  cta_rota text,
  cta_url text,
  apenas_free boolean DEFAULT false,
  apenas_premium boolean DEFAULT false,
  ativo boolean DEFAULT true,
  peso integer DEFAULT 1,
  impressoes integer DEFAULT 0,
  cliques integer DEFAULT 0,
  data_inicio timestamp with time zone DEFAULT now(),
  data_fim timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners_home (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  emoji text DEFAULT '🏆'::text,
  badge_texto text,
  cta_texto text DEFAULT 'PARTICIPAR AGORA'::text,
  cta_texto_participando text DEFAULT 'VER MEUS PALPITES'::text,
  bolao_id uuid,
  link text,
  ativo boolean DEFAULT true,
  posicao integer DEFAULT 0,
  mostrar_para text DEFAULT 'todos'::text,
  data_inicio timestamp with time zone DEFAULT now(),
  data_fim timestamp with time zone,
  estilo text DEFAULT 'premium'::text,
  cor_fundo text,
  cor_texto text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  imagem_url text,
  imagem_fundo_url text,
  segmento text DEFAULT 'todos'::text,
  dias_desde_cadastro_min integer,
  dias_desde_cadastro_max integer,
  tem_bolao_privado boolean,
  qtd_participantes_min integer,
  imagem_mobile_url text
);

CREATE TABLE IF NOT EXISTS public.banners_quiz (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  emoji text DEFAULT '⚽'::text,
  cta_texto text DEFAULT 'Começar o Quiz'::text,
  link text NOT NULL,
  imagem_url text,
  imagem_mobile_url text,
  cor_fundo text DEFAULT '#14532d'::text,
  cor_texto text DEFAULT '#facc15'::text,
  ativo boolean DEFAULT true,
  posicao integer DEFAULT 1,
  data_inicio timestamp with time zone DEFAULT now(),
  data_fim timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bolao_campeonatos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL,
  campeonato_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bolao_moderadores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bolao_participantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pontuacao_total integer DEFAULT 0,
  posicao_ranking integer,
  joined_at timestamp with time zone DEFAULT now(),
  time_favorito text,
  streak_atual integer DEFAULT 0,
  streak_recorde integer DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo'::text
);

CREATE TABLE IF NOT EXISTS public.boloes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  imagem_url text,
  codigo_convite text NOT NULL,
  criador_id uuid,
  campeonato_id uuid,
  modo_pontuacao text NOT NULL DEFAULT 'casual'::text,
  regras_ativas text[] DEFAULT '{}'::text[],
  is_publico boolean DEFAULT false,
  is_nacional boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  time_favorito text,
  imagem_posicao text DEFAULT 'center 50%'::text,
  estados_destaque text[] DEFAULT '{}'::text[],
  imagem_url_mobile text,
  tema jsonb,
  aprovacao_entrada boolean NOT NULL DEFAULT false,
  mod_pode_promover boolean DEFAULT false,
  cortesia_plano text,
  cortesia_ate date,
  prorrogacao_conta boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.campeonatos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_football_id integer NOT NULL,
  nome text NOT NULL,
  nome_popular text,
  temporada integer NOT NULL,
  logo_url text,
  pais text,
  tipo text DEFAULT 'nacional'::text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  visivel boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  desconto_percentual integer NOT NULL,
  planos_validos text[],
  max_usos integer,
  usos_atuais integer DEFAULT 0,
  expira_em timestamp with time zone,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  dau integer DEFAULT 0,
  mau integer DEFAULT 0,
  new_signups integer DEFAULT 0,
  sessions integer DEFAULT 0,
  avg_session_duration_sec numeric(10,2) DEFAULT 0,
  funnel_signup integer DEFAULT 0,
  funnel_create_pool integer DEFAULT 0,
  funnel_join_pool integer DEFAULT 0,
  funnel_first_bet integer DEFAULT 0,
  funnel_invite_friend integer DEFAULT 0,
  funnel_payment integer DEFAULT 0,
  active_pools integer DEFAULT 0,
  new_pools integer DEFAULT 0,
  total_bets_today integer DEFAULT 0,
  avg_bets_per_user numeric(10,2) DEFAULT 0,
  total_participants integer DEFAULT 0,
  new_participants integer DEFAULT 0,
  xp_distributed integer DEFAULT 0,
  referral_signups integer DEFAULT 0,
  avg_user_level numeric(5,2) DEFAULT 0,
  revenue_stripe numeric(12,2) DEFAULT 0,
  revenue_ads numeric(12,2) DEFAULT 0,
  revenue_total numeric(12,2) GENERATED ALWAYS AS (revenue_stripe + revenue_ads) STORED,
  active_subscriptions integer DEFAULT 0,
  new_subscriptions integer DEFAULT 0,
  churned_subscriptions integer DEFAULT 0,
  arpu numeric(10,4) DEFAULT 0,
  new_installs integer DEFAULT 0,
  uninstalls integer DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  new_reviews integer DEFAULT 0,
  crashes integer DEFAULT 0,
  anr_count integer DEFAULT 0,
  push_sent integer DEFAULT 0,
  push_opened integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  collection_status text DEFAULT 'pending'::text,
  collection_errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_reminders_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rodada_key text NOT NULL,
  campeonato text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_especiais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL,
  criador_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_ranking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pontos integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.jogos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_football_id integer,
  campeonato_id uuid NOT NULL,
  time_a text NOT NULL,
  time_b text NOT NULL,
  logo_time_a text,
  logo_time_b text,
  data_hora timestamp with time zone NOT NULL,
  fase text,
  rodada text,
  placar_time_a integer,
  placar_time_b integer,
  status text NOT NULL DEFAULT 'agendado'::text,
  atualizado_em timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  placar_90min_a integer,
  placar_90min_b integer
);

CREATE TABLE IF NOT EXISTS public.mata_mata_ciclos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bolao_id uuid NOT NULL,
  ciclo_numero integer NOT NULL DEFAULT 1,
  rodada_atual integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ativo'::text,
  pontos_iniciais integer NOT NULL DEFAULT 20,
  vencedor_id uuid,
  pontos_vencedor integer,
  created_at timestamp with time zone DEFAULT now(),
  finalizado_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.mata_mata_escolhas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rodada integer NOT NULL,
  time_escolhido text NOT NULL,
  jogo_id uuid,
  resultado text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mata_mata_participantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'vivo'::text,
  eliminado_na_rodada integer,
  pontos_ganhos integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacao_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  referencia text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacao_preferencias (
  user_id uuid NOT NULL,
  push_ativo boolean DEFAULT true,
  palpite_pendente boolean DEFAULT true,
  jogo_encerrado boolean DEFAULT true,
  ranking_update boolean DEFAULT true,
  novo_participante boolean DEFAULT true,
  evento_especial boolean DEFAULT true,
  horario_silencio_inicio time without time zone,
  horario_silencio_fim time without time zone,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb,
  lida boolean DEFAULT false,
  push_enviada boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.palpites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  jogo_id uuid NOT NULL,
  user_id uuid NOT NULL,
  bolao_id uuid NOT NULL,
  placar_time_a integer NOT NULL DEFAULT 0,
  placar_time_b integer NOT NULL DEFAULT 0,
  pontos_obtidos integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pontos integer DEFAULT 0,
  origem text,
  avanca text
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  plano text NOT NULL DEFAULT 'free'::text,
  created_at timestamp with time zone DEFAULT now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  plano_expira_em timestamp with time zone,
  estado text,
  referral_code text,
  referred_by uuid,
  email_opt_out boolean DEFAULT false,
  email_unsubscribe_token uuid DEFAULT gen_random_uuid(),
  email_opt_out_reason text,
  plano_cortesia text,
  plano_cortesia_ate date,
  area_empresa text,
  mesa_numero text,
  mesa_nome text,
  mp_payment_id text
);

CREATE TABLE IF NOT EXISTS public.push_reminders_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rodada_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'android'::text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.relatorios_executivos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data_referencia date NOT NULL,
  gerado_em timestamp with time zone NOT NULL DEFAULT now(),
  novos_cadastros integer,
  cadastros_organicos integer,
  cadastros_pagos integer,
  taxa_ativacao_pct numeric(5,2),
  dau integer,
  wau integer,
  mau integer,
  stickiness_pct numeric(5,2),
  gasto_meta_brl numeric(12,2),
  gasto_google_brl numeric(12,2),
  gasto_total_brl numeric(12,2),
  cac_blended_brl numeric(12,2),
  cac_meta_brl numeric(12,2),
  cac_google_brl numeric(12,2),
  admob_impressoes integer,
  admob_receita_brl numeric(12,2),
  ecpm_brl numeric(12,2),
  fill_rate_pct numeric(5,2),
  novas_assinaturas integer,
  cancelamentos integer,
  mrr_brl numeric(12,2),
  arpu_brl numeric(12,2),
  conversao_free_premium_pct numeric(5,2),
  ltv_estimado_brl numeric(12,2),
  ltv_cac_ratio numeric(8,2),
  total_usuarios integer,
  total_premium integer,
  raw_data jsonb,
  resumo_executivo text,
  insights jsonb,
  alertas jsonb,
  acoes_recomendadas jsonb,
  analise_completa text,
  cadastros_email_confirmado integer,
  taxa_confirmacao_email_pct numeric(5,2),
  ativacao_criou_bolao integer,
  ativacao_entrou_bolao integer,
  ativacao_palpitou integer,
  boloes_criados_dia integer,
  boloes_privados_dia integer,
  boloes_com_amigos_dia integer,
  total_participacoes_dia integer,
  boloes_em_camp_ativo_dia integer,
  boloes_em_camp_futuro_dia integer,
  usuarios_presos_camp_futuro integer,
  cadastros_referidos integer,
  usuarios_com_streak integer,
  streak_medio numeric(8,2),
  usuarios_pontuando_dia integer,
  boloes_publicos_dia integer,
  participacoes_organicas_dia integer,
  palpites_android integer,
  palpites_web integer,
  palpites_ios integer,
  palpites_origem_null integer,
  pct_palpites_android numeric(5,2),
  palpites_em_camp_ativo integer,
  palpites_em_camp_futuro integer,
  boloes_socialmente_vivos integer,
  power_users_top10_palpites integer
);

CREATE TABLE IF NOT EXISTS public.simulador_resultados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  campeao text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campeonato_api_id integer NOT NULL,
  tipo text NOT NULL,
  jogos_atualizados integer DEFAULT 0,
  erro text,
  executado_em timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  origem text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_xp (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  xp_total integer NOT NULL DEFAULT 0,
  nivel integer NOT NULL DEFAULT 1,
  titulo text NOT NULL DEFAULT 'Torcedor'::text,
  convites_aceitos integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.xp_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  acao text NOT NULL,
  xp integer NOT NULL,
  referencia text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
