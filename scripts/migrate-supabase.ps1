# ════════════════════════════════════════════════════════════════════════════
# Migracao Supabase: hvgsdxcdufekksxgqyoj (antigo) -> dtfqmxmmbbfmfpouzqzt (novo)
#
# Versao PowerShell — equivalente a scripts/migrate-supabase.sh para Windows.
#
# Pre-requisitos no PATH: pg_dump (v17), psql (v17), supabase CLI
# Teste com:
#   pg_dump --version ; psql --version ; supabase --version
#
# Uso:
#   .\scripts\migrate-supabase.ps1 `
#     -SourceDbUrl 'postgresql://postgres.hvgsdxcdufekksxgqyoj:PASS@aws-0-sa-east-1.pooler.supabase.com:6543/postgres' `
#     -TargetDbUrl 'postgresql://postgres.dtfqmxmmbbfmfpouzqzt:PASS@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
#
# Se a Execution Policy bloquear o script:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# ════════════════════════════════════════════════════════════════════════════

[CmdletBinding()]
param(
  [string]$SourceDbUrl = $env:SOURCE_DB_URL,
  [string]$TargetDbUrl = $env:TARGET_DB_URL,
  [string]$OutDir = ".\migration-output"
)

$ErrorActionPreference = "Stop"

if (-not $SourceDbUrl) { throw "Faltou -SourceDbUrl (ou env SOURCE_DB_URL)" }
if (-not $TargetDbUrl) { throw "Faltou -TargetDbUrl (ou env TARGET_DB_URL)" }

$SourceRef = "hvgsdxcdufekksxgqyoj"
$TargetRef = "dtfqmxmmbbfmfpouzqzt"

# Forcar mensagens em ingles para parsing previsivel
$env:LC_MESSAGES = "C"
$env:PGCLIENTENCODING = "UTF8"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# ─── Pre-flight: checar ferramentas ─────────────────────────────────────
foreach ($cmd in @("pg_dump", "psql", "supabase")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "$cmd nao encontrado no PATH. Instale e adicione ao PATH antes de continuar."
  }
}

Write-Host "Source: $SourceRef" -ForegroundColor Cyan
Write-Host "Target: $TargetRef" -ForegroundColor Cyan
Write-Host ""

$schemaFile  = Join-Path $OutDir "01_schema.sql"
$seedFile    = Join-Path $OutDir "02_seed.sql"
$bucketsFile = Join-Path $OutDir "03_buckets.csv"

# ─── 1. Schema dump (somente structure, schema public) ──────────────────
Write-Host "[1/6] Dumping schema (public) do antigo..." -ForegroundColor Yellow
& pg_dump `
  --schema-only `
  --no-owner `
  --no-privileges `
  --no-publications `
  --no-subscriptions `
  --schema=public `
  $SourceDbUrl |
  Out-File -FilePath $schemaFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "pg_dump schema falhou" }
Write-Host "      -> $schemaFile"

# ─── 2. Seed data (sem usuarios) ────────────────────────────────────────
# Envolve em session_replication_role = replica pra ignorar FKs orfas
# (banners_home.bolao_id, eventos_especiais.bolao_id apontam para boloes,
# tabela que nao vai ser migrada).
Write-Host "[2/6] Dumping seed data (campeonatos, jogos, eventos, banners*)..." -ForegroundColor Yellow
"BEGIN;"                                     | Out-File -FilePath $seedFile -Encoding utf8
"SET session_replication_role = replica;"    | Add-Content -Path $seedFile -Encoding utf8

& pg_dump `
  --data-only `
  --no-owner `
  --no-privileges `
  --column-inserts `
  -t public.campeonatos `
  -t public.jogos `
  -t public.eventos_especiais `
  -t public.banners `
  -t public.banners_home `
  -t public.banners_quiz `
  $SourceDbUrl |
  Add-Content -Path $seedFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "pg_dump seed falhou" }

"SET session_replication_role = DEFAULT;"    | Add-Content -Path $seedFile -Encoding utf8
"COMMIT;"                                    | Add-Content -Path $seedFile -Encoding utf8
Write-Host "      -> $seedFile"

# ─── 3. Storage buckets ─────────────────────────────────────────────────
Write-Host "[3/6] Dumping storage buckets..." -ForegroundColor Yellow
& psql $SourceDbUrl --csv -c `
  "SELECT id, name, public, file_size_limit, COALESCE(array_to_string(allowed_mime_types, ','), '') AS mimes FROM storage.buckets ORDER BY id" |
  Out-File -FilePath $bucketsFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "psql buckets dump falhou" }
$bucketCount = (Get-Content $bucketsFile).Count - 1
Write-Host "      -> $bucketsFile ($bucketCount buckets)"

# ─── 4. Aplicar schema + seed no projeto novo ───────────────────────────
Write-Host ""
Write-Host "[4/6] Aplicando schema no projeto novo..." -ForegroundColor Yellow
& psql $TargetDbUrl --single-transaction -v ON_ERROR_STOP=1 -f $schemaFile
if ($LASTEXITCODE -ne 0) { throw "psql apply schema falhou" }

Write-Host "[4/6] Aplicando seed data..." -ForegroundColor Yellow
& psql $TargetDbUrl --single-transaction -v ON_ERROR_STOP=1 -f $seedFile
if ($LASTEXITCODE -ne 0) { throw "psql apply seed falhou" }

# ─── 5. Recriar storage buckets ─────────────────────────────────────────
Write-Host "[5/6] Criando storage buckets no projeto novo..." -ForegroundColor Yellow
Import-Csv $bucketsFile | ForEach-Object {
  $id     = $_.id
  $name   = $_.name
  $public = $_.public.ToString().ToLower()
  $size   = if ([string]::IsNullOrWhiteSpace($_.file_size_limit)) { "NULL" } else { $_.file_size_limit }
  $mimeArr = "NULL"
  if (-not [string]::IsNullOrWhiteSpace($_.mimes)) {
    $items = ($_.mimes -split ',') | ForEach-Object { "'$_'" }
    $mimeArr = "ARRAY[$($items -join ',')]"
  }
  Write-Host "  - $name (public=$public)"
  $sql = "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('$id', '$name', $public, $size, $mimeArr) ON CONFLICT (id) DO NOTHING;"
  & psql $TargetDbUrl -v ON_ERROR_STOP=1 -c $sql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "psql insert bucket '$name' falhou" }
}

# ─── 6. Pos-restore (trigger em auth.users + cron jobs) ─────────────────
Write-Host "[6/6] Aplicando pos-restore (trigger em auth.users + cron jobs)..." -ForegroundColor Yellow
$postRestore = "scripts\migrate-post-restore.sql"
if (Test-Path $postRestore) {
  & psql $TargetDbUrl --single-transaction -v ON_ERROR_STOP=1 -f $postRestore
  if ($LASTEXITCODE -ne 0) { throw "psql post-restore falhou" }
} else {
  Write-Warning "$postRestore nao encontrado, pulando."
}

# ─── Final ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "─── Schema + seed + buckets aplicados. ──────────────────────────────" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS MANUAIS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) Deploy das edge functions no projeto novo:"
Write-Host "     supabase functions deploy --project-ref $TargetRef --no-verify-jwt"
Write-Host ""
Write-Host "2) Configurar secrets das edge functions:"
Write-Host "     supabase secrets set --project-ref $TargetRef ``"
Write-Host "       STRIPE_SECRET_KEY=... ``"
Write-Host "       STRIPE_WEBHOOK_SECRET=... ``"
Write-Host "       REVENUECAT_WEBHOOK_SECRET=... ``"
Write-Host "       RESEND_API_KEY=... ``"
Write-Host "       FOOTBALL_DATA_TOKEN=... ``"
Write-Host "       CUSTOM_SERVICE_KEY=..."
Write-Host ""
Write-Host "3) Copiar arquivos dos buckets (avatars, bolao-capas, iconesapp,"
Write-Host "   iconesCampeonatos, logos, banner-capas, bares) usando rclone"
Write-Host "   ou o dashboard. Os objetos NAO sao copiados por este script."
Write-Host ""
Write-Host "4) Habilitar Auth providers (Apple, Google) no dashboard do projeto novo."
Write-Host ""
Write-Host "5) Configurar webhooks externos:"
Write-Host "   - Stripe     -> https://$TargetRef.supabase.co/functions/v1/stripe-webhook"
Write-Host "   - RevenueCat -> https://$TargetRef.supabase.co/functions/v1/revenuecat-webhook"
Write-Host ""
Write-Host "Done." -ForegroundColor Green
