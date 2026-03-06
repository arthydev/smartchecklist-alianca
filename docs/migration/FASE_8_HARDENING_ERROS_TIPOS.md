# Fase 8 - Hardening de erros e compatibilidade

Data: 2026-03-05

## Objetivo
Reduzir falhas silenciosas no frontend, padronizando tratamento de erro HTTP e mensagens de erro vindas da API.

## Entregas
- `services/backend.ts`:
  - criado parser central de JSON seguro.
  - criado `requestJson(...)` com validação de status HTTP.
  - erro de API agora propaga `payload.error` quando existir (`401/403/404/400`).
  - mutações críticas (`users`, `absences`, `brasiltec`, `settings`, `checklists`) agora falham de forma explícita.
- `SettingsView`:
  - ações assíncronas com `try/catch` e `alert` com mensagem de erro real da API.
- `App.tsx`:
  - `add/update checklist` e `update settings` com captura de erro para evitar falha silenciosa.

## Resultado esperado
- UI passa a exibir erro consistente quando API retornar `Unauthorized`, `Forbidden`, `Not found` ou payload inválido.
- Menos risco de inconsistência de estado por sucesso falso no frontend.
