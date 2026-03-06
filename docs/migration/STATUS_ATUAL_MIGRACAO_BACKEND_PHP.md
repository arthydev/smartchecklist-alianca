# Status Atual da Migração Node.js -> PHP (Fase Atual)

Data de referência: 2026-03-05

## 1) Escopo já migrado para backend PHP

O backend PHP paralelo (`backend-php/`) já possui base funcional com:
- Front controller + router próprio (sem framework)
- Resposta JSON padronizada
- CORS com `Allow-Credentials` + preflight `OPTIONS`
- Sessão server-side com `$_SESSION` + cookie `HttpOnly`
- Conexão MySQL via PDO
- Repositórios por domínio (Auth, Settings, Users, Checklists)

## 2) Endpoints já implementados no PHP

### Sistema/Auth
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/protected-test` (rota técnica para validar middleware)

### Settings
- `GET /api/settings` (protegido)
- `POST /api/settings` (protegido)

### Users
- `GET /api/users` (protegido)
- `POST /api/users` (protegido + role MANAGER)
- `PUT /api/users/:id` (protegido + role MANAGER)
- `DELETE /api/users/:id` (protegido + role MANAGER)

### Checklists
- `GET /api/checklists` (protegido)
- `POST /api/checklists` (protegido, UPSERT por `id`)

## 3) Regras de segurança já ativas

- Sessão em cookie com `HttpOnly`
- `requireAuth` para rotas protegidas
- `requireRole(['MANAGER'])` para mutações sensíveis
- Controle de escopo por `managerId` em Users, Settings e Checklists
- `managerId` normalizado no contexto de sessão (manager usa o próprio `id`)
- Nenhuma resposta de API expõe senha/hash

## 4) Persistência e consistência de JSON

- `settings`: persistido e retornado como JSON
- `checklists.data`: persistido como JSON no MySQL e devolvido como objeto/array
- No `GET /api/checklists`, se `data` estiver inválido no banco: retorna `data: null` e `dataError: true`

## 5) Mapeamento por variáveis de ambiente (schema flexível)

Já suportado para lidar com diferença de nomes de colunas/tabelas:
- Auth/users table mapping (`AUTH_*`, `USERS_*`)
- Settings mapping (`SETTINGS_*`)
- Checklists mapping (`CHECKLISTS_*`)

Isso reduz risco caso o schema em produção tenha variações (`manager_id` vs `managerId`, etc.).

## 6) O que já pode integrar com o Front-end

Já dá para integrar no frontend (substituindo chamadas Node -> PHP) os fluxos:
- Login/logout/me com sessão por cookie (`credentials: 'include'`)
- Carregamento e salvamento de settings
- Listagem/criação/edição/remoção de usuários
- Listagem e gravação (upsert) de checklists
- Healthcheck de API

### Observações para integração do frontend
- O frontend precisa enviar cookies (`credentials: 'include'`)
- Deve parar de depender de `localStorage` para usuário autenticado
- Boot recomendado: chamar `GET /api/auth/me` para recuperar sessão

## 7) O que ainda NÃO foi implementado no PHP

Ainda pendente para paridade total com o Node atual:
- `POST /api/absences`
- `DELETE /api/absences/:id`
- `GET /api/brasiltec`
- `POST /api/brasiltec`
- `DELETE /api/brasiltec/:id`
- Servir SPA pelo PHP com fallback de `index.html` (fase de entrega de frontend pelo PHP)
- Desligamento definitivo do fluxo de sessão em `localStorage` no frontend

## 8) Situação de prontidão da fase

### Pronto agora
- Backend PHP já suporta autenticação por sessão e os domínios principais (settings, users, checklists).
- É possível iniciar integração incremental do frontend nesses módulos.

### Não pronto ainda
- Módulos Absences/Brasiltec não migrados.
- Frontend ainda não foi totalmente adaptado para sessão server-side.
- Entrega de SPA pelo PHP ainda não concluída.

## 9) Próximo passo recomendado (sequência)

1. Migrar endpoints de `absences`
2. Migrar endpoints de `brasiltec`
3. Ajustar frontend para sessão via cookie (`/auth/me` no boot)
4. Finalizar entrega da SPA pelo backend PHP (base path + fallback)
5. Rodar bateria de regressão ponta a ponta e planejar corte do Node

## Atualizacao recente - Sucata PDF preview (2026-03-06)

Implementado no frontend:
- Geracao de PDF da ficha de sucata antes da abertura do e-mail.
- Modal de preview e confirmacao do documento.
- Persistencia de metadados em `customData.pdfMeta` no checklist salvo.
- Download automatico do PDF antes de abrir `mailto`.

Comportamento:
- Cancelar no modal: nao salva checklist e nao abre e-mail.
- Confirmar no modal: salva checklist, baixa PDF e abre `mailto`.

Observacao:
- O PDF nao e armazenado no banco nesta fase; apenas metadados e snapshot hash.
