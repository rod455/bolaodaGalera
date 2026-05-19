-- ============================================================================
-- 03-functions.sql: 24 funcoes/RPCs do app
-- Idempotente: usa CREATE OR REPLACE FUNCTION.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calcular_nivel(p_xp integer)
 RETURNS TABLE(nivel integer, titulo text)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_xp >= 2500 THEN RETURN QUERY SELECT 8, 'Rei do Bolão'::TEXT;
  ELSIF p_xp >= 1500 THEN RETURN QUERY SELECT 7, 'Lenda'::TEXT;
  ELSIF p_xp >= 1000 THEN RETURN QUERY SELECT 6, 'Mestre'::TEXT;
  ELSIF p_xp >= 600 THEN RETURN QUERY SELECT 5, 'Craque'::TEXT;
  ELSIF p_xp >= 350 THEN RETURN QUERY SELECT 4, 'Estrategista'::TEXT;
  ELSIF p_xp >= 150 THEN RETURN QUERY SELECT 3, 'Apostador'::TEXT;
  ELSIF p_xp >= 50 THEN RETURN QUERY SELECT 2, 'Palpiteiro'::TEXT;
  ELSE RETURN QUERY SELECT 1, 'Torcedor'::TEXT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_pontos_palpite(p_palpite_a integer, p_palpite_b integer, p_real_a integer, p_real_b integer, p_modo text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  pontos integer := 0;
  real_vencedor text;
  palpite_vencedor text;
  real_diff integer;
  palpite_diff integer;
BEGIN
  IF p_real_a > p_real_b THEN real_vencedor := 'A';
  ELSIF p_real_a < p_real_b THEN real_vencedor := 'B';
  ELSE real_vencedor := 'E';
  END IF;

  IF p_palpite_a > p_palpite_b THEN palpite_vencedor := 'A';
  ELSIF p_palpite_a < p_palpite_b THEN palpite_vencedor := 'B';
  ELSE palpite_vencedor := 'E';
  END IF;

  real_diff := p_real_a - p_real_b;
  palpite_diff := p_palpite_a - p_palpite_b;

  IF p_palpite_a = p_real_a AND p_palpite_b = p_real_b THEN
    CASE p_modo
      WHEN 'casual' THEN RETURN 10;
      WHEN 'placar_correto' THEN RETURN 10;
      WHEN 'amador' THEN RETURN 10;
      WHEN 'profissional' THEN RETURN 20;
      WHEN 'fanatico' THEN RETURN 20;
      WHEN 'tudo_ou_nada' THEN RETURN 10;
      WHEN 'vencedor_ou_nada' THEN RETURN 5;
      ELSE RETURN 10;
    END CASE;
  END IF;

  IF p_modo IN ('tudo_ou_nada', 'placar_correto') THEN
    RETURN 0;
  END IF;

  IF p_modo = 'casual' THEN
    IF palpite_vencedor = real_vencedor THEN
      IF real_vencedor = 'E' THEN pontos := 5;
      ELSE pontos := 3;
      END IF;
    END IF;
    RETURN pontos;
  END IF;

  IF p_modo = 'vencedor_ou_nada' THEN
    IF palpite_vencedor = real_vencedor THEN RETURN 5; END IF;
    RETURN 0;
  END IF;

  IF p_modo = 'amador' THEN
    IF palpite_vencedor = real_vencedor THEN
      IF real_vencedor = 'E' THEN pontos := pontos + 5;
      ELSE pontos := pontos + 3;
      END IF;
    END IF;
    IF palpite_diff = real_diff THEN pontos := pontos + 3; END IF;
    IF p_palpite_a = p_real_a THEN pontos := pontos + 2; END IF;
    IF p_palpite_b = p_real_b THEN pontos := pontos + 2; END IF;
    RETURN pontos;
  END IF;

  IF p_modo IN ('profissional', 'fanatico') THEN
    IF palpite_vencedor = real_vencedor THEN
      pontos := pontos + 5;
      IF real_vencedor = 'E' THEN
        pontos := pontos + 3;
      ELSE
        IF palpite_diff = real_diff THEN pontos := pontos + 5; END IF;
        IF (real_vencedor = 'A' AND p_palpite_a = p_real_a) OR
           (real_vencedor = 'B' AND p_palpite_b = p_real_b) THEN
          pontos := pontos + 2;
        END IF;
        IF (real_vencedor = 'A' AND p_palpite_b = p_real_b) OR
           (real_vencedor = 'B' AND p_palpite_a = p_real_a) THEN
          pontos := pontos + 2;
        END IF;
      END IF;
    END IF;
    RETURN pontos;
  END IF;

  IF palpite_vencedor = real_vencedor THEN
    IF real_vencedor = 'E' THEN RETURN 5;
    ELSE RETURN 3;
    END IF;
  END IF;

  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  NEW.referral_code := v_code;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dar_xp(p_user_id uuid, p_acao text, p_xp integer, p_referencia text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xp_total INTEGER;
  v_nivel INTEGER;
  v_titulo TEXT;
  v_exists BOOLEAN;
BEGIN
  IF p_referencia IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM xp_log
      WHERE user_id = p_user_id AND acao = p_acao AND referencia = p_referencia
    ) INTO v_exists;
    IF v_exists THEN RETURN FALSE; END IF;
  END IF;

  IF p_acao = 'compartilhar' THEN
    SELECT EXISTS(
      SELECT 1 FROM xp_log
      WHERE user_id = p_user_id AND acao = 'compartilhar'
        AND created_at::date = now()::date
    ) INTO v_exists;
    IF v_exists THEN RETURN FALSE; END IF;
  END IF;

  INSERT INTO xp_log (user_id, acao, xp, referencia)
  VALUES (p_user_id, p_acao, p_xp, p_referencia);

  INSERT INTO user_xp (user_id, xp_total)
  VALUES (p_user_id, p_xp)
  ON CONFLICT (user_id) DO UPDATE
  SET xp_total = user_xp.xp_total + p_xp;

  SELECT ux.xp_total INTO v_xp_total FROM user_xp ux WHERE ux.user_id = p_user_id;
  SELECT cn.nivel, cn.titulo INTO v_nivel, v_titulo FROM calcular_nivel(v_xp_total) cn;

  UPDATE user_xp SET nivel = v_nivel, titulo = v_titulo WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.processar_referral(p_referred_id uuid, p_referral_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id UUID;
  v_convites INTEGER;
BEGIN
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = p_referral_code;
  IF v_referrer_id IS NULL THEN RETURN FALSE; END IF;
  IF v_referrer_id = p_referred_id THEN RETURN FALSE; END IF;

  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, p_referred_id, 'aceito')
  ON CONFLICT (referred_id) DO NOTHING;

  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_referred_id;
  PERFORM dar_xp(v_referrer_id, 'convite', 30, p_referred_id::text);

  SELECT COUNT(*) INTO v_convites FROM referrals
  WHERE referrer_id = v_referrer_id AND status = 'aceito';

  UPDATE user_xp SET convites_aceitos = v_convites WHERE user_id = v_referrer_id;

  IF v_convites = 10 THEN
    UPDATE profiles
    SET plano = 'premium_pro',
        plano_expira_em = GREATEST(COALESCE(plano_expira_em, now()), now()) + INTERVAL '1 month'
    WHERE id = v_referrer_id;
  ELSIF v_convites = 20 THEN
    UPDATE profiles
    SET plano = 'premium_pro',
        plano_expira_em = GREATEST(COALESCE(plano_expira_em, now()), now()) + INTERVAL '3 months'
    WHERE id = v_referrer_id;
  ELSIF v_convites = 30 THEN
    UPDATE profiles
    SET plano = 'premium_pro',
        plano_expira_em = GREATEST(COALESCE(plano_expira_em, now()), now()) + INTERVAL '1 year'
    WHERE id = v_referrer_id;
  END IF;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aplicar_cortesia(p_user_id uuid, p_bolao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plano TEXT;
  v_ate DATE;
BEGIN
  SELECT cortesia_plano, cortesia_ate INTO v_plano, v_ate
  FROM boloes WHERE id = p_bolao_id;

  IF v_plano IS NOT NULL AND v_ate IS NOT NULL THEN
    UPDATE profiles
    SET plano_cortesia = v_plano, plano_cortesia_ate = v_ate
    WHERE id = p_user_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_cortesia_copa_sem_ads()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM boloes b
    JOIN profiles p ON p.id = b.criador_id
    WHERE b.id = NEW.bolao_id
    AND p.plano = 'copa_sem_ads'
  ) THEN
    UPDATE profiles
    SET plano_cortesia = 'premium_pro',
        plano_cortesia_ate = '2026-07-20'
    WHERE id = NEW.user_id
    AND (plano = 'free' OR plano IS NULL);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.banner_clique(p_banner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE banners SET cliques = cliques + 1 WHERE id = p_banner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.banner_impressao(p_banner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE banners SET impressoes = impressoes + 1 WHERE id = p_banner_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM notificacoes WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM notificacao_log WHERE created_at < now() - INTERVAL '7 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_notificacao(p_user_id uuid, p_tipo text, p_titulo text, p_mensagem text, p_dados jsonb DEFAULT '{}'::jsonb, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notificacao_id UUID;
  v_pref_ativo BOOLEAN;
BEGIN
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM notificacao_preferencias WHERE user_id = $1), true)',
    p_tipo
  ) INTO v_pref_ativo USING p_user_id;

  IF NOT COALESCE(v_pref_ativo, true) THEN
    RETURN NULL;
  END IF;

  IF p_referencia IS NOT NULL THEN
    BEGIN
      INSERT INTO notificacao_log (user_id, tipo, referencia)
      VALUES (p_user_id, p_tipo, p_referencia);
    EXCEPTION WHEN unique_violation THEN
      RETURN NULL;
    END;
  END IF;

  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, dados)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensagem, p_dados)
  RETURNING id INTO v_notificacao_id;

  RETURN v_notificacao_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fix_team_logo(p_team_name text, p_logo_url text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER := 0;
  r INTEGER;
BEGIN
  UPDATE jogos SET logo_time_a = p_logo_url
  WHERE time_a = p_team_name AND (logo_time_a IS NULL OR logo_time_a = '');
  GET DIAGNOSTICS r = ROW_COUNT;
  updated_count := updated_count + r;

  UPDATE jogos SET logo_time_b = p_logo_url
  WHERE time_b = p_team_name AND (logo_time_b IS NULL OR logo_time_b = '');
  GET DIAGNOSTICS r = ROW_COUNT;
  updated_count := updated_count + r;

  RETURN updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_jogo(p_api_football_id bigint, p_campeonato_id uuid, p_time_a text, p_time_b text, p_logo_time_a text DEFAULT NULL::text, p_logo_time_b text DEFAULT NULL::text, p_data_hora timestamp with time zone DEFAULT NULL::timestamp with time zone, p_fase text DEFAULT NULL::text, p_rodada text DEFAULT NULL::text, p_placar_time_a integer DEFAULT NULL::integer, p_placar_time_b integer DEFAULT NULL::integer, p_status text DEFAULT 'agendado'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.jogos (
    api_football_id, campeonato_id, time_a, time_b,
    logo_time_a, logo_time_b, data_hora, fase, rodada,
    placar_time_a, placar_time_b, status, atualizado_em
  ) VALUES (
    p_api_football_id, p_campeonato_id, p_time_a, p_time_b,
    p_logo_time_a, p_logo_time_b, p_data_hora, p_fase, p_rodada,
    p_placar_time_a, p_placar_time_b, p_status, now()
  )
  ON CONFLICT (api_football_id) DO UPDATE SET
    time_a = EXCLUDED.time_a,
    time_b = EXCLUDED.time_b,
    logo_time_a = COALESCE(EXCLUDED.logo_time_a, jogos.logo_time_a),
    logo_time_b = COALESCE(EXCLUDED.logo_time_b, jogos.logo_time_b),
    data_hora = COALESCE(EXCLUDED.data_hora, jogos.data_hora),
    fase = COALESCE(EXCLUDED.fase, jogos.fase),
    rodada = COALESCE(EXCLUDED.rodada, jogos.rodada),
    placar_time_a = COALESCE(EXCLUDED.placar_time_a, jogos.placar_time_a),
    placar_time_b = COALESCE(EXCLUDED.placar_time_b, jogos.placar_time_b),
    status = EXCLUDED.status,
    atualizado_em = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalcular_pontos_jogo(p_jogo_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_real_a integer;
  v_real_b integer;
  v_real_90_a integer;
  v_real_90_b integer;
  v_time_a text;
  v_time_b text;
  v_fase text;
  v_bolao record;
  v_palpite record;
  v_pontos integer;
  v_total integer := 0;
  v_modo text;
  v_time_fav text;
  v_prorrogacao boolean;
  v_usar_a integer;
  v_usar_b integer;
  v_is_mata_mata boolean;
BEGIN
  SELECT placar_time_a, placar_time_b, placar_90min_a, placar_90min_b, time_a, time_b, fase
  INTO v_real_a, v_real_b, v_real_90_a, v_real_90_b, v_time_a, v_time_b, v_fase
  FROM public.jogos WHERE id = p_jogo_id;

  IF v_real_a IS NULL OR v_real_b IS NULL THEN
    RETURN 0;
  END IF;

  v_is_mata_mata := v_fase IS NOT NULL
    AND v_fase NOT ILIKE '%grupo%'
    AND v_fase NOT ILIKE '%GROUP%'
    AND v_fase NOT ILIKE '%Liga%'
    AND v_fase NOT ILIKE '%LEAGUE%';

  FOR v_palpite IN
    SELECT p.id, p.placar_time_a, p.placar_time_b, p.bolao_id, p.user_id
    FROM public.palpites p
    WHERE p.jogo_id = p_jogo_id
  LOOP
    SELECT modo_pontuacao, time_favorito, COALESCE(prorrogacao_conta, true)
    INTO v_modo, v_time_fav, v_prorrogacao
    FROM public.boloes WHERE id = v_palpite.bolao_id;

    v_modo := COALESCE(v_modo, 'casual');

    IF v_is_mata_mata AND NOT v_prorrogacao AND v_real_90_a IS NOT NULL THEN
      v_usar_a := v_real_90_a;
      v_usar_b := v_real_90_b;
    ELSE
      v_usar_a := v_real_a;
      v_usar_b := v_real_b;
    END IF;

    IF v_modo = 'fanatico' AND v_time_fav IS NOT NULL
       AND v_time_a != v_time_fav AND v_time_b != v_time_fav THEN
      v_pontos := 0;
    ELSE
      v_pontos := public.calcular_pontos_palpite(
        v_palpite.placar_time_a,
        v_palpite.placar_time_b,
        v_usar_a,
        v_usar_b,
        v_modo
      );
    END IF;

    UPDATE public.palpites SET pontos = v_pontos WHERE id = v_palpite.id;
    v_total := v_total + 1;
  END LOOP;

  FOR v_bolao IN
    SELECT DISTINCT bolao_id FROM public.palpites WHERE jogo_id = p_jogo_id
  LOOP
    UPDATE public.bolao_participantes bp
    SET pontuacao_total = COALESCE((
      SELECT SUM(COALESCE(p.pontos, 0))
      FROM public.palpites p
      JOIN public.jogos j ON j.id = p.jogo_id
      JOIN public.boloes b ON b.id = p.bolao_id
      WHERE p.user_id = bp.user_id
        AND p.bolao_id = bp.bolao_id
        AND (
          b.modo_pontuacao != 'fanatico'
          OR b.time_favorito IS NULL
          OR j.time_a = b.time_favorito
          OR j.time_b = b.time_favorito
        )
    ), 0)
    WHERE bp.bolao_id = v_bolao.bolao_id;

    WITH ranked AS (
      SELECT user_id,
        ROW_NUMBER() OVER (ORDER BY pontuacao_total DESC, user_id) as pos
      FROM public.bolao_participantes
      WHERE bolao_id = v_bolao.bolao_id
    )
    UPDATE public.bolao_participantes bp
    SET posicao_ranking = ranked.pos
    FROM ranked
    WHERE bp.bolao_id = v_bolao.bolao_id AND bp.user_id = ranked.user_id;
  END LOOP;

  RETURN v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_calcular_pontos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_is_bar BOOLEAN := false;
BEGIN
  IF NEW.status = 'ao_vivo' AND (OLD.placar_time_a IS DISTINCT FROM NEW.placar_time_a OR OLD.placar_time_b IS DISTINCT FROM NEW.placar_time_b) THEN
    SELECT EXISTS (
      SELECT 1 FROM palpites p
      JOIN boloes b ON b.id = p.bolao_id
      WHERE p.jogo_id = NEW.id
      AND (b.tema->>'tipo_cadastro') = 'bar'
    ) INTO v_is_bar;
  END IF;

  IF (NEW.status = 'encerrado' AND (OLD.status IS DISTINCT FROM 'encerrado' OR OLD.placar_time_a IS DISTINCT FROM NEW.placar_time_a OR OLD.placar_time_b IS DISTINCT FROM NEW.placar_time_b))
     OR (v_is_bar AND NEW.status = 'ao_vivo' AND (OLD.placar_time_a IS DISTINCT FROM NEW.placar_time_a OR OLD.placar_time_b IS DISTINCT FROM NEW.placar_time_b))
  THEN
    PERFORM public.recalcular_pontos_jogo(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalcular_streak(p_bolao_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_streak int := 0;
  v_max_streak int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.pontos
    FROM palpites p
    JOIN jogos j ON j.id = p.jogo_id
    WHERE p.bolao_id = p_bolao_id
      AND p.user_id = p_user_id
      AND j.status = 'encerrado'
      AND p.pontos IS NOT NULL
    ORDER BY j.data_hora DESC
  LOOP
    IF rec.pontos > 0 THEN
      v_streak := v_streak + 1;
      IF v_streak > v_max_streak THEN
        v_max_streak := v_streak;
      END IF;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  v_max_streak := v_streak;

  v_streak := 0;
  FOR rec IN
    SELECT p.pontos
    FROM palpites p
    JOIN jogos j ON j.id = p.jogo_id
    WHERE p.bolao_id = p_bolao_id
      AND p.user_id = p_user_id
      AND j.status = 'encerrado'
      AND p.pontos IS NOT NULL
    ORDER BY j.data_hora ASC
  LOOP
    IF rec.pontos > 0 THEN
      v_streak := v_streak + 1;
    ELSE
      IF v_streak > v_max_streak THEN
        v_max_streak := v_streak;
      END IF;
      v_streak := 0;
    END IF;
  END LOOP;
  IF v_streak > v_max_streak THEN
    v_max_streak := v_streak;
  END IF;

  v_streak := 0;
  FOR rec IN
    SELECT p.pontos
    FROM palpites p
    JOIN jogos j ON j.id = p.jogo_id
    WHERE p.bolao_id = p_bolao_id
      AND p.user_id = p_user_id
      AND j.status = 'encerrado'
      AND p.pontos IS NOT NULL
    ORDER BY j.data_hora DESC
  LOOP
    IF rec.pontos > 0 THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  UPDATE bolao_participantes
  SET streak_atual = v_streak,
      streak_recorde = GREATEST(COALESCE(streak_recorde, 0), v_max_streak)
  WHERE bolao_id = p_bolao_id AND user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tv_get_palpites(p_bolao_id uuid, p_jogo_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
  v_count INT;
BEGIN
  SELECT status INTO v_status FROM jogos WHERE id = p_jogo_id;

  SELECT COUNT(*) INTO v_count
  FROM palpites WHERE bolao_id = p_bolao_id AND jogo_id = p_jogo_id;

  IF v_status IN ('ao_vivo', 'encerrado') THEN
    RETURN jsonb_build_object(
      'count', v_count,
      'palpites', (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', p.user_id,
          'placar_time_a', p.placar_time_a,
          'placar_time_b', p.placar_time_b
        ))
        FROM palpites p
        WHERE p.bolao_id = p_bolao_id AND p.jogo_id = p_jogo_id
      )
    );
  END IF;

  RETURN jsonb_build_object('count', v_count, 'palpites', NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.inscrever_corporativo(p_user_id uuid, p_nome text, p_email text, p_area_empresa text DEFAULT NULL::text, p_bolao_codigo text DEFAULT NULL::text, p_mesa_numero text DEFAULT NULL::text, p_mesa_nome text DEFAULT NULL::text, p_jogo_id uuid DEFAULT NULL::uuid, p_placar_a integer DEFAULT NULL::integer, p_placar_b integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bolao_id UUID;
  v_aprovacao BOOLEAN;
  v_status TEXT;
  v_tipo_cadastro TEXT;
  v_jogo_status TEXT;
BEGIN
  INSERT INTO profiles (id, nome, email, area_empresa, mesa_numero, mesa_nome)
  VALUES (p_user_id, p_nome, p_email, p_area_empresa, p_mesa_numero, p_mesa_nome)
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    area_empresa = COALESCE(EXCLUDED.area_empresa, profiles.area_empresa),
    mesa_numero = COALESCE(EXCLUDED.mesa_numero, profiles.mesa_numero),
    mesa_nome = COALESCE(EXCLUDED.mesa_nome, profiles.mesa_nome);

  SELECT id, COALESCE(aprovacao_entrada, false), tema->>'tipo_cadastro'
  INTO v_bolao_id, v_aprovacao, v_tipo_cadastro
  FROM boloes
  WHERE codigo_convite = UPPER(p_bolao_codigo);

  IF v_bolao_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bolão não encontrado');
  END IF;

  IF v_tipo_cadastro = 'bar' AND p_jogo_id IS NOT NULL THEN
    SELECT status INTO v_jogo_status FROM jogos WHERE id = p_jogo_id;
    IF v_jogo_status IN ('ao_vivo', 'encerrado') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Palpites encerrados - jogo já iniciado');
    END IF;
  END IF;

  v_status := CASE WHEN v_aprovacao THEN 'pendente' ELSE 'ativo' END;

  INSERT INTO bolao_participantes (bolao_id, user_id, status)
  VALUES (v_bolao_id, p_user_id, v_status)
  ON CONFLICT DO NOTHING;

  IF p_jogo_id IS NOT NULL AND p_placar_a IS NOT NULL AND p_placar_b IS NOT NULL THEN
    INSERT INTO palpites (jogo_id, user_id, bolao_id, placar_time_a, placar_time_b)
    VALUES (p_jogo_id, p_user_id, v_bolao_id, p_placar_a, p_placar_b)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.inscrever_por_email(p_email text, p_bolao_id uuid, p_area_empresa text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM profiles WHERE email = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  IF p_area_empresa IS NOT NULL AND p_area_empresa <> '' THEN
    UPDATE profiles SET area_empresa = p_area_empresa WHERE id = v_user_id;
  END IF;

  INSERT INTO bolao_participantes (bolao_id, user_id, status)
  VALUES (p_bolao_id, v_user_id, 'pendente')
  ON CONFLICT (bolao_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_inactive_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inactive_user RECORD;
BEGIN
  FOR inactive_user IN
    SELECT id
    FROM auth.users
    WHERE last_sign_in_at IS NOT NULL
      AND last_sign_in_at < NOW() - INTERVAL '90 days'
  LOOP
    DELETE FROM palpites WHERE user_id = inactive_user.id;
    DELETE FROM bolao_participantes WHERE user_id = inactive_user.id;
    DELETE FROM eventos_ranking WHERE user_id = inactive_user.id;
    DELETE FROM boloes
    WHERE criador_id = inactive_user.id
      AND id NOT IN (SELECT DISTINCT bolao_id FROM bolao_participantes);
    DELETE FROM profiles WHERE id = inactive_user.id;
    DELETE FROM auth.users WHERE id = inactive_user.id;
    RAISE NOTICE 'Usuario inativo excluido: %', inactive_user.id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_usuarios_fake(p_bolao_id uuid, p_quantidade integer, p_com_pontos boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_i INT;
  v_nome TEXT;
  v_fake_id UUID;
  v_email TEXT;
  v_campeonato_id UUID;
  v_nomes TEXT[] := ARRAY[
    'Lucas Silva','Gabriel Santos','Mateus Oliveira','Pedro Costa','Rafael Lima',
    'Bruno Souza','Felipe Pereira','Gustavo Ferreira','Leonardo Almeida','Thiago Ribeiro'
  ];
BEGIN
  SELECT campeonato_id INTO v_campeonato_id FROM boloes WHERE id = p_bolao_id;

  FOR v_i IN 1..p_quantidade LOOP
    v_fake_id := gen_random_uuid();
    v_nome := v_nomes[1 + floor(random() * array_length(v_nomes, 1))::int] || ' ' || v_i::text;
    v_email := 'fake_' || replace(v_fake_id::text, '-', '') || '@fake.bolao.app';

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_fake_id, '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      crypt('fakepassword123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', v_nome),
      false, '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO profiles (id, nome, email)
    VALUES (v_fake_id, v_nome, v_email)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO bolao_participantes (bolao_id, user_id)
    VALUES (p_bolao_id, v_fake_id)
    ON CONFLICT DO NOTHING;

    IF p_com_pontos THEN
      INSERT INTO palpites (user_id, bolao_id, jogo_id, placar_time_a, placar_time_b, pontos)
      SELECT
        v_fake_id, p_bolao_id, j.id,
        floor(random() * 4)::int,
        floor(random() * 4)::int,
        CASE
          WHEN random() < 0.10 THEN 5
          WHEN random() < 0.35 THEN 3
          WHEN random() < 0.55 THEN 1
          ELSE 0
        END
      FROM jogos j
      WHERE j.campeonato_id = v_campeonato_id
        AND j.status = 'encerrado'
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;
