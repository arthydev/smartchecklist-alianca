# Fase 4 - Checklists POST (Legado + UPSERT + Integridade)

## Escopo da fase
- Compatibilizar `POST /api/checklists` com payload legado do frontend (sem `data`).
- Manter suporte ao payload novo (`{ id, data }`).
- Preservar evidencias base64 e campos existentes em updates parciais.
- Manter regras de seguranca de `managerId`.

## Alteracoes aplicadas

## Backend (`backend-php/public/index.php`)
- `POST /api/checklists` agora aceita dois formatos:
  - novo: `{ "id": "...", "data": { ... } }`
  - legado: checklist completo no root (sem `data`)
- Conversao interna:
  - payload legado e convertido para `data`.
  - `id` raiz e aplicado no `data.id`.
  - `managerId` e forçado para sessao.
- Validacoes:
  - sem `id` => `400 Checklist id is required`
  - `managerId` divergente (root ou data) => `403 Forbidden`

## Backend (`backend-php/src/Repositories/ChecklistsRepository.php`)
- `upsert(...)` agora faz merge de `data` recebido com `data` existente para evitar perda de campos/evidencias em update parcial.
- Adicionado `deepMerge(...)` (merge recursivo para objetos).

## Documentacao
- Atualizado `backend-php/README.md` com:
  - suporte aos dois formatos de `POST /api/checklists`
  - exemplo legado com evidencias base64

## Resultado esperado desta fase
- Frontend atual pode salvar checklist sem alterar payload legado.
- UPSERT preserva evidencias base64 e campos anteriores quando update vier parcial.
