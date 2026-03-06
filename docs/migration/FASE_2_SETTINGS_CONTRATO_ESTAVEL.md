# Fase 2 - Settings (Contrato Estavel)

## Escopo da fase
- Garantir que `GET /api/settings` sempre retorne objeto compativel com a UI.
- Evitar quebra de dashboard/forms por campos ausentes.
- Garantir `POST /api/settings` com merge seguro para updates parciais.

## Alteracoes aplicadas

## Backend (`backend-php/public/index.php`)
- Adicionada funcao `normalizeSettingsPayload(...)` para forcar shape minimo:
  - `items: []`
  - `equipment: []`
  - `absences: []`
  - `substitute: { name, phone, isActive }`
- Adicionada funcao `mergeSettingsPayload(...)` para merge recursivo de updates parciais.
- `GET /api/settings` agora sempre retorna payload normalizado (nunca `{}` cru).
- `POST /api/settings` agora:
  - le payload atual salvo
  - aplica merge com update recebido
  - normaliza antes de salvar
  - retorna resposta normalizada

## Front (`services/backend.ts`)
- Adicionada normalizacao defensiva no client (`normalizeSettings`).
- `getManagerSettings(...)` agora sempre retorna `AppSettings` estavel mesmo em erro/shape incompleto.

## Resultado esperado desta fase
- Dashboard, forms e SettingsView deixam de quebrar por `settings` incompleto.
- Updates parciais de settings nao removem estrutura obrigatoria.
