# Fase 0 - Baseline de Contrato Real (Front x Back PHP)

## Objetivo
Mapear o contrato real usado hoje pelo frontend e comparar com o comportamento atual do backend PHP, identificando gaps que impedem integracao completa.

## Fontes analisadas
- Front:
  - `services/backend.ts`
  - `App.tsx`
  - `components/*` (Login, ChecklistForm, LogisticChecklistForm, SettingsView, Dashboard, HistoryView)
- Back:
  - `backend-php/public/index.php`
  - repositories em `backend-php/src/Repositories/*`

## Matriz de endpoints usados pelo frontend

| Endpoint | Uso no Front | Back PHP atual | Status |
|---|---|---|---|
| `POST /api/auth/login` | Login UI | Implementado com sessao | Parcial |
| `GET /api/auth/me` | Boot auth no `App.tsx` | Implementado | OK |
| `POST /api/auth/logout` | Logout UI | Implementado | OK |
| `GET /api/health` | `DatabaseStatus` | Implementado | OK |
| `GET /api/settings` | Carregar settings iniciais | Implementado | Parcial |
| `POST /api/settings` | Persistir settings | Implementado | Parcial |
| `GET /api/checklists` | Dashboard/History/Validation | Implementado | Parcial |
| `POST /api/checklists` | Criar/atualizar checklist (UPSERT) | Implementado | Quebrando contrato |
| `GET /api/users` | Dashboard/Settings | Implementado | Parcial |
| `POST /api/users` | Settings (criar usuario) | Implementado | Parcial |
| `PUT /api/users/:id` | Settings (editar usuario) | Implementado | Parcial |
| `DELETE /api/users/:id` | Settings (remover usuario) | Implementado | OK |
| `POST /api/absences` | Settings (criar ausencia) | Implementado | Parcial |
| `DELETE /api/absences/:id` | Settings (remover ausencia) | Implementado | OK |
| `GET /api/brasiltec` | Settings/Logistica | Implementado | Parcial |
| `POST /api/brasiltec` | Settings (criar brasiltec) | Implementado | Parcial |
| `DELETE /api/brasiltec/:id` | Settings (remover brasiltec) | Implementado | OK |

## Gaps criticos encontrados

## 1) Contrato de checklist (critico)
- Front envia checklist no shape legado completo (`ChecklistEntry`).
- Back `POST /api/checklists` exige `payload.data` (objeto) e rejeita payload legado.
- Efeito:
  - criacao de checklist via UI falha com `400`.
- Impacto:
  - fluxo principal da aplicacao quebrado.

## 2) Shape de leitura de checklist (critico)
- Back `GET /api/checklists` retorna itens no formato `{ id, managerId, data, ... }`.
- Front espera array de `ChecklistEntry` achatado (`equipmentNo`, `items`, `createdAt`, `userName`, etc).
- Efeito:
  - dashboard/historico/validacao com risco de render incorreto ou vazio.

## 3) Shape de usuario autenticado (alto)
- Login/Me retornam user sem `name` e sem `area`.
- Front usa `user.name` e `user.area` em varias telas.
- Efeito:
  - quebras de UI ou exibicao inconsistente.

## 4) Settings incompleto para consumo da UI (alto)
- `GET /api/settings` pode retornar `{}`.
- Front espera estrutura completa (`items`, `equipment`, `substitute`, `absences`).
- Efeito:
  - dashboard/forms podem acessar campos `undefined`.

## 5) Fluxo Brasiltec no frontend (alto)
- `LogisticChecklistForm` chama `backend.validateBrasiltecUser(...)`, metodo inexistente.
- `setBrasiltecUsers(backend.getBrasiltecUsers(...))` sem `await`.
- Efeito:
  - erro runtime no formulario de qualidade.

## 6) Contrato de users parcial (medio)
- Back retorna usuarios sem alguns campos usados pelo front (`name`, `area`, `email`) em alguns cenarios.
- Efeito:
  - tabela/edicao de usuarios pode perder informacao visual.

## Regra critica de dados (checklist + imagens)
Durante toda a integracao, esta regra deve ser preservada:
- persistir checklist integral no banco;
- preservar evidencias base64 sem perda;
- UPSERT sem apagar campos/evidencias indevidamente;
- manter shape compativel de retorno para o frontend.

## Prioridade de execucao (proximo passo)
1. Fase 1: normalizar auth user payload (`name/area` + fallbacks no front).
2. Fase 2: normalizar settings para shape completo.
3. Fase 3/4: corrigir contrato de checklists (GET + POST/UPSERT) sem perder evidencias.
4. Fase 5+: users, absences, brasiltec (acabamento de contrato).

## Evidencias tecnicas (comandos usados)
- `rg -n "this.request\\(|async ... " services/backend.ts`
- `rg -n "backend\\." App.tsx components`
- `rg -n "$router->(get|post|put|delete)" backend-php/public/index.php`
- testes curl anteriores:
  - `POST /api/checklists` com payload legado retornando `400 Checklist data is required`.
