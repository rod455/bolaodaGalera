# Configuração AdMob para Bolão na Copa

## 1. Instalar plugin

```bash
npm install @capacitor-community/admob
npx cap sync android
```

## 2. Criar conta Google AdMob
- Acesse https://admob.google.com
- Crie um app Android (com.bolaonacopa.app)
- Crie 1 Ad Unit do tipo **Rewarded**
- Copie o Ad Unit ID (ex: ca-app-pub-XXXXXXX/YYYYYYY)

## 3. Configurar AndroidManifest.xml

Em `android/app/src/main/AndroidManifest.xml`, dentro de `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXX~ZZZZZZZ"/>
```

## 4. Atualizar Ad Unit ID no código

Em `src/hooks/useRewardedAd.ts`, troque o ID de teste:

```typescript
// TROCAR ISTO:
adId: "ca-app-pub-3940256099942544/5224354917", // Test

// POR ISTO:
adId: "ca-app-pub-XXXXXXX/YYYYYYY", // Seu ID real
```

## 5. IDs de Teste (usar durante desenvolvimento)

- Rewarded: `ca-app-pub-3940256099942544/5224354917`

**IMPORTANTE:** Use IDs de teste durante desenvolvimento.
Só mude para IDs reais antes de publicar na Play Store.
