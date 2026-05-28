# Protocolos de Desenvolvimento - Bolao da Galera

## Edge Functions (Supabase)

### Deploy de Edge Functions
Todas as edge functions fazem auth propria no codigo. O gateway JWT do Supabase deve estar DESATIVADO.

**SEMPRE deployar com `--no-verify-jwt`:**
```bash
supabase functions deploy <nome-da-funcao> --no-verify-jwt
```

Para deployar todas de uma vez:
```bash
supabase functions deploy --no-verify-jwt
```

### CORS em Edge Functions
Apps nativos (Android/iOS) com Capacitor enviam `origin: https://localhost`.
Toda edge function chamada pelo frontend DEVE incluir essas origins:
```typescript
const ALLOWED_ORIGINS = [
  "https://bolaonacopa.com.br",
  "https://www.bolaonacopa.com.br",
  "https://bolaonacopa.lovable.app",
  "https://bolaodacopa-ten.vercel.app",
  "https://localhost",        // Capacitor Android/iOS
  "capacitor://localhost",    // Capacitor fallback
];
```

### Auth em Edge Functions (workflows)
Edge functions chamadas por GitHub Actions workflows devem aceitar AMBAS as keys:
```typescript
const validKeys = [
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  Deno.env.get("CUSTOM_SERVICE_KEY"),
].filter(Boolean);
```

## Status de Jogos no Banco

Os status validos no banco sao:
- `agendado` - Jogo agendado
- `ao_vivo` - Jogo em andamento (NAO usar "em_andamento")
- `encerrado` - Jogo finalizado
- `adiado` - Jogo adiado/suspenso
- `cancelado` - Jogo cancelado

## Sync de Jogos (football-data.org)

- A API gratuita tem cobertura irregular da **Libertadores (CLI/2152)**
- Jogos da Libertadores podem precisar de update manual via SQL
- O sync roda a cada 15min via GitHub Actions (`sync-live.yml`)
- Sync completo roda seg/qua as 11h UTC (`sync-full.yml`)

## Referral System

- `referral_code` e gerado automaticamente por trigger no banco ao criar profile
- `processar_referral` e uma RPC no Postgres que:
  - Registra na tabela `referrals`
  - Da +30 XP ao referrer via `dar_xp`
  - Incrementa `convites_aceitos` na `user_xp`
  - Ativa Premium PRO nas metas (10/20/30 convites)
- Os thresholds de recompensa devem estar iguais no frontend (`XPProgressCard.tsx`) e no SQL (`processar_referral`)

## Plataformas

- App iOS-puro. Pagamentos exclusivamente via RevenueCat (Apple IAP).
- Sem fluxo Stripe / sem build Android/Web em produção.

## Projeto Supabase

- Project ref: `dtfqmxmmbbfmfpouzqzt`
- URL: `https://dtfqmxmmbbfmfpouzqzt.supabase.co`
- Projeto legado (só leitura, não usar mais): `hvgsdxcdufekksxgqyoj` (bolaonacopa)

## Bundle IDs

- iOS: `com.bolaonacopa.app` (mesmo bundle do Android, submetido em slot já existente da App Store Connect)
- Android: `com.bolaonacopa.app`
- Display name (Info.plist): `Bolão da Galera`
