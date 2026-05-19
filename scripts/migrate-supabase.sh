#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Migracao Supabase: hvgsdxcdufekksxgqyoj (antigo) -> dtfqmxmmbbfmfpouzqzt (novo)
#
# Migra: schema completo + seed data (campeonatos, jogos, eventos_especiais,
# banners*) + storage buckets. NAO migra dados de usuarios.
#
# Pre-requisitos:
#   - pg_dump / psql (Postgres 17 client, igual versao do projeto)
#   - supabase CLI logado (supabase login)
#   - SOURCE_DB_URL e TARGET_DB_URL exportados (use a Connection String do
#     dashboard, modo "Session pooler" porta 6543 ou "Direct connection" 5432)
#
# Uso:
#   export SOURCE_DB_URL='postgresql://postgres.hvgsdxcdufekksxgqyoj:PASS@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
#   export TARGET_DB_URL='postgresql://postgres.dtfqmxmmbbfmfpouzqzt:PASS@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
#   ./scripts/migrate-supabase.sh
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

SOURCE_REF="hvgsdxcdufekksxgqyoj"
TARGET_REF="dtfqmxmmbbfmfpouzqzt"

OUT_DIR="./migration-output"
mkdir -p "$OUT_DIR"

# ─── Pre-flight ──────────────────────────────────────────────────────────
: "${SOURCE_DB_URL:?Set SOURCE_DB_URL (connection string do projeto antigo)}"
: "${TARGET_DB_URL:?Set TARGET_DB_URL (connection string do projeto novo)}"

command -v pg_dump >/dev/null || { echo "pg_dump nao encontrado. Instale postgresql-client-17."; exit 1; }
command -v psql    >/dev/null || { echo "psql nao encontrado. Instale postgresql-client-17."; exit 1; }
command -v supabase >/dev/null || { echo "supabase CLI nao encontrado."; exit 1; }

echo "Source: $SOURCE_REF"
echo "Target: $TARGET_REF"
echo

# ─── 1. Schema dump (somente structure, schema public) ───────────────────
echo "[1/6] Dumping schema (public) do antigo..."
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-publications \
  --no-subscriptions \
  --schema=public \
  "$SOURCE_DB_URL" \
  > "$OUT_DIR/01_schema.sql"
echo "      -> $OUT_DIR/01_schema.sql ($(wc -l < "$OUT_DIR/01_schema.sql") linhas)"

# ─── 2. Seed data (sem usuarios) ─────────────────────────────────────────
# Envolve em SET session_replication_role = replica; pra ignorar FKs pra
# tabelas nao migradas (banners_home.bolao_id, eventos_especiais.bolao_id).
echo "[2/6] Dumping seed data (campeonatos, jogos, eventos, banners*)..."
{
  echo "BEGIN;"
  echo "SET session_replication_role = replica;"
  pg_dump \
    --data-only \
    --no-owner \
    --no-privileges \
    --column-inserts \
    -t public.campeonatos \
    -t public.jogos \
    -t public.eventos_especiais \
    -t public.banners \
    -t public.banners_home \
    -t public.banners_quiz \
    "$SOURCE_DB_URL"
  echo "SET session_replication_role = DEFAULT;"
  echo "COMMIT;"
} > "$OUT_DIR/02_seed.sql"
echo "      -> $OUT_DIR/02_seed.sql"

# ─── 3. Storage buckets (so metadata; objetos copiam separado) ───────────
echo "[3/6] Dumping storage buckets..."
psql "$SOURCE_DB_URL" --csv -c \
  "SELECT id, name, public, file_size_limit, COALESCE(array_to_string(allowed_mime_types, ','), '') AS mimes FROM storage.buckets ORDER BY id" \
  > "$OUT_DIR/03_buckets.csv"
echo "      -> $OUT_DIR/03_buckets.csv ($(($(wc -l < "$OUT_DIR/03_buckets.csv") - 1)) buckets)"

# ─── 4. Aplicar schema + seed no projeto novo ────────────────────────────
echo
echo "[4/6] Aplicando schema no projeto novo..."
psql "$TARGET_DB_URL" --single-transaction -v ON_ERROR_STOP=1 < "$OUT_DIR/01_schema.sql"

echo "[4/6] Aplicando seed data..."
psql "$TARGET_DB_URL" --single-transaction -v ON_ERROR_STOP=1 < "$OUT_DIR/02_seed.sql"

# ─── 5. Recriar storage buckets ──────────────────────────────────────────
echo "[5/6] Criando storage buckets no projeto novo..."
tail -n +2 "$OUT_DIR/03_buckets.csv" | while IFS=, read -r id name public size mimes; do
  pub="${public,,}"
  mime_arr="NULL"
  if [ -n "$mimes" ] && [ "$mimes" != '""' ]; then
    mime_arr="ARRAY['${mimes//,/\',\'}']"
  fi
  size_val="${size:-NULL}"
  echo "  - $name (public=$pub)"
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
     VALUES ('$id', '$name', $pub, $size_val, $mime_arr)
     ON CONFLICT (id) DO NOTHING;"
done

# ─── 6. Pos-restore (trigger em auth.users + cron jobs) ──────────────────
echo "[6/6] Aplicando pos-restore (trigger em auth.users + cron jobs)..."
if [ -f "scripts/migrate-post-restore.sql" ]; then
  psql "$TARGET_DB_URL" --single-transaction -v ON_ERROR_STOP=1 \
    < scripts/migrate-post-restore.sql
else
  echo "      AVISO: scripts/migrate-post-restore.sql nao encontrado, pulando."
fi

echo
echo "─── Schema + seed + buckets aplicados. ──────────────────────────────"
echo
echo "PROXIMOS PASSOS MANUAIS:"
echo
echo "1) Deploy das edge functions no projeto novo:"
echo "     supabase functions deploy --project-ref $TARGET_REF --no-verify-jwt"
echo
echo "2) Configurar secrets das edge functions:"
echo "     supabase secrets set --project-ref $TARGET_REF \\"
echo "       STRIPE_SECRET_KEY=... \\"
echo "       STRIPE_WEBHOOK_SECRET=... \\"
echo "       REVENUECAT_WEBHOOK_SECRET=... \\"
echo "       RESEND_API_KEY=... \\"
echo "       FOOTBALL_DATA_TOKEN=... \\"
echo "       CUSTOM_SERVICE_KEY=..."
echo
echo "3) Copiar arquivos dos buckets (avatars, bolao-capas, iconesapp,"
echo "   iconesCampeonatos, logos, banner-capas, bares) usando rclone ou"
echo "   o dashboard. Os objetos NAO sao copiados por este script."
echo
echo "4) Habilitar Auth providers (Apple, Google) no dashboard do projeto novo."
echo
echo "5) Configurar webhooks externos:"
echo "   - Stripe   -> https://$TARGET_REF.supabase.co/functions/v1/stripe-webhook"
echo "   - RevenueCat -> https://$TARGET_REF.supabase.co/functions/v1/revenuecat-webhook"
echo
echo "Done."
