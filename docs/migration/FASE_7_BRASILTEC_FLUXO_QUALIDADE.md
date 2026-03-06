# Fase 7 - Brasiltec e fluxo de Qualidade

Data: 2026-03-05

## Objetivo
Corrigir o fluxo Brasiltec da tela de Qualidade para funcionar de ponta a ponta com backend PHP, sem expor senha e sem erro de async no frontend.

## Entregas
- Backend:
  - Novo endpoint `POST /api/brasiltec/validate` (auth) para validar credencial Brasiltec no servidor.
  - Retorno apenas `{ "ok": true|false }` (sem senha/hash).
  - `BrasiltecRepository` com método `validateCredentials(...)`:
    - valida por `id + managerId`.
    - suporta hash (`password_verify`) e texto legado (`hash_equals`).
- Frontend:
  - `LogisticChecklistForm`:
    - corrigido carregamento de usuários Brasiltec com `await`.
    - `handleSubmit` convertido para `async`.
    - validação Brasiltec passa a chamar backend de forma assíncrona.
  - `services/backend.ts`:
    - adicionado `validateBrasiltecUser(userId, password, managerId): Promise<boolean>`.

## Impacto
- Remove risco de estado incorreto por `Promise` no `setBrasiltecUsers`.
- Mantém segurança (nenhuma senha Brasiltec é retornada em listagens).
- Validação de Brasiltec fica consistente com sessão e escopo de `managerId`.
