-- ════════════════════════════════════════════════════════════════════════
-- Pos-restore: itens que pg_dump --schema=public nao consegue migrar
--
-- Roda DEPOIS de 01_schema.sql + 02_seed.sql no projeto novo
-- (dtfqmxmmbbfmfpouzqzt). Idempotente — pode rodar varias vezes.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Trigger no schema auth (pg_dump --schema=public NAO pega) ──────────
-- handle_new_user() cria automaticamente um row em public.profiles quando
-- um usuario novo eh criado em auth.users. Sem isso, signup quebra.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ─── Cron jobs (pg_cron) ────────────────────────────────────────────────
-- ATENCAO: estes jobs precisam do service_role_key disponivel via vault.
-- Antes de rodar, configure o vault no dashboard:
--   Database > Vault > New secret
--     name:  service_role_key
--     value: <SERVICE_ROLE_KEY do projeto novo>
--
-- Os jobs abaixo apontam para o projeto NOVO (dtfqmxmmbbfmfpouzqzt).
-- Comente blocos individualmente se nao quiser habilitar todos.

-- Garantir extension pg_cron habilitada (no Supabase, fazer pelo dashboard
-- em Database > Extensions). Se nao estiver habilitada, este bloco falha
-- e os jobs nao sao criados — descomente apos habilitar:

/*
SELECT cron.schedule(
  'delete-inactive-users',
  '0 3 * * *',
  $$SELECT public.delete_inactive_users();$$
);

SELECT cron.schedule(
  'palpite-reminder-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dtfqmxmmbbfmfpouzqzt.supabase.co/functions/v1/send-palpite-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'push-palpite-urgente-30min',
  '0,30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dtfqmxmmbbfmfpouzqzt.supabase.co/functions/v1/push-palpite-urgente',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
*/
