-- ═══════════════════════════════════════════════════════
-- Bolão na Copa — Push Notifications & In-App Feedback
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Tokens FCM dos dispositivos
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android', -- 'android' | 'ios' | 'web'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id) WHERE ativo = true;

-- 2. Central de notificações in-app
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,       -- 'palpite_pendente', 'jogo_encerrado', 'ranking_update', etc.
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  dados JSONB DEFAULT '{}', -- { bolao_id, jogo_id, rota, icone, etc }
  lida BOOLEAN DEFAULT false,
  push_enviada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON notificacoes(user_id, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_cleanup ON notificacoes(created_at);

-- 3. Preferências de notificação do usuário
CREATE TABLE IF NOT EXISTS notificacao_preferencias (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_ativo BOOLEAN DEFAULT true,
  palpite_pendente BOOLEAN DEFAULT true,
  jogo_encerrado BOOLEAN DEFAULT true,
  ranking_update BOOLEAN DEFAULT true,
  novo_participante BOOLEAN DEFAULT true,
  evento_especial BOOLEAN DEFAULT true,
  horario_silencio_inicio TIME DEFAULT NULL,
  horario_silencio_fim TIME DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de controle para não duplicar notificações
CREATE TABLE IF NOT EXISTS notificacao_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  referencia TEXT NOT NULL, -- Ex: "palpite_pendente:jogo_abc123:bolao_xyz"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, referencia)
);

CREATE INDEX IF NOT EXISTS idx_notificacao_log_ref ON notificacao_log(user_id, referencia);

-- ═══ RLS (Row Level Security) ═══

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao_preferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao_log ENABLE ROW LEVEL SECURITY;

-- push_tokens: user gerencia seus próprios tokens
CREATE POLICY "push_tokens_own" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- notificacoes: user lê e atualiza as próprias
CREATE POLICY "notificacoes_select_own" ON notificacoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notificacoes_update_own" ON notificacoes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role pode inserir (edge functions)
CREATE POLICY "notificacoes_insert_service" ON notificacoes
  FOR INSERT WITH CHECK (true); -- Edge functions usam service_role key

-- preferencias: user gerencia as próprias
CREATE POLICY "notificacao_prefs_own" ON notificacao_preferencias
  FOR ALL USING (auth.uid() = user_id);

-- log: service role insere, user pode ler
CREATE POLICY "notificacao_log_select" ON notificacao_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notificacao_log_insert" ON notificacao_log
  FOR INSERT WITH CHECK (true);

-- ═══ Função helper: criar notificação + dedup ═══

CREATE OR REPLACE FUNCTION criar_notificacao(
  p_user_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensagem TEXT,
  p_dados JSONB DEFAULT '{}',
  p_referencia TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notificacao_id UUID;
  v_pref_ativo BOOLEAN;
BEGIN
  -- Verificar se o tipo está habilitado nas preferências do user
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM notificacao_preferencias WHERE user_id = $1), true)',
    p_tipo
  ) INTO v_pref_ativo USING p_user_id;

  -- Se user desabilitou esse tipo, não cria
  IF NOT COALESCE(v_pref_ativo, true) THEN
    RETURN NULL;
  END IF;

  -- Verificar dedup (se referencia fornecida)
  IF p_referencia IS NOT NULL THEN
    -- Tenta inserir no log. Se já existir (UNIQUE violation), retorna NULL
    BEGIN
      INSERT INTO notificacao_log (user_id, tipo, referencia)
      VALUES (p_user_id, p_tipo, p_referencia);
    EXCEPTION WHEN unique_violation THEN
      RETURN NULL; -- Já foi notificado
    END;
  END IF;

  -- Criar notificação
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, dados)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensagem, p_dados)
  RETURNING id INTO v_notificacao_id;

  RETURN v_notificacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Cleanup automático (rodar via pg_cron ou manualmente) ═══

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notificacoes WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM notificacao_log WHERE created_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ═══ Realtime: habilitar para notificacoes ═══
-- No Supabase Dashboard > Database > Replication, habilite a tabela 'notificacoes'
-- Ou rode:
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
