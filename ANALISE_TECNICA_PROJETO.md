# Analise Tecnica do Projeto SmartChecklist

## 1. Visao Geral

Aplicacao web para controle de checklists operacionais, com foco em tres frentes:
- Equipamentos (operacao geral)
- Qualidade/Logistica (liberacao de carregamento)
- Sucata (saida, pesagem e solicitacao de faturamento)

Arquitetura atual:
- Frontend SPA em React + TypeScript (raiz do projeto)
- Backend REST em Node.js + Express (pasta `server/`)
- Persistencia em MySQL (com script legado SQLite no repositorio)

## 2. Stack e Tecnologias

### Frontend
- React 19
- TypeScript
- Vite 6
- Lucide React (icones)
- Recharts (graficos do dashboard)
- Tailwind CSS via CDN no `index.html`
- Captura de evidencias com `navigator.mediaDevices` + FileReader (base64)

### Backend
- Node.js + Express 5
- mysql2 (pool + promise API)
- cors
- uuid
- dotenv

Dependencias instaladas, mas sem uso efetivo no fluxo atual de API:
- bcryptjs
- jsonwebtoken
- sqlite3

## 3. Estrutura de Pastas (principal)

- `App.tsx`: orquestracao de views, sessao e layout
- `components/`: telas e componentes funcionais
- `services/backend.ts`: cliente HTTP da API
- `services/whatsappService.ts`: composicao de mensagem e abertura do WhatsApp
- `services/geminiService.ts`: integracao Gemini (nao conectada ao fluxo principal)
- `server/index.js`: API REST + entrega de arquivos estaticos
- `server/db.js`: conexao MySQL e criacao de tabelas
- `server/public/`: build frontend servido pelo backend
- `dist/`: build local do frontend

## 4. Como o Frontend Esta Estruturado

### 4.1 Fluxo de aplicacao
- `App.tsx` controla:
  - usuario logado (`alianca_current_user` no localStorage)
  - tema light/dark (`alianca_theme`)
  - view atual (`LOGIN`, `DASHBOARD`, `NEW_CHECK`, `HISTORY`, `VALIDATION`, `SETTINGS`)
- Ao logar:
  - Gestor vai para Dashboard
  - Operador vai para Nova Inspecao

### 4.2 Controle de acesso por perfil/area
- `Role`: `MANAGER` e `OPERATOR`
- `area` define formulario e comportamento:
  - `QUALIDADE` -> `LogisticChecklistForm`
  - `SUCATA` -> `ScrapInspectionForm`
  - demais -> `ChecklistForm`

### 4.3 Principais telas/componentes

#### Login (`components/Login.tsx`)
- Autenticacao por usuario/senha via `POST /api/auth/login`
- Persistencia de sessao em localStorage

#### Dashboard (`components/Dashboard.tsx`)
- KPIs por area
- Graficos de status de aprovacao (Aprovado, Bloqueado, Pendente)
- Listas de pendencias (equipamentos e operadores)
- Indicadores especificos para SUCATA (tickets, toneladas, motoristas)

#### Checklist operacional (`components/ChecklistForm.tsx`)
- Fluxo em etapas:
  1. selecao de equipamento e turno
  2. resposta C/NC dos itens
  3. evidencias e observacoes (quando houver NC)
- Regras:
  - bloqueio por manutencao/afastamento
  - bloqueio por checklist pendente/reprovado anterior
  - impede checklist duplicado para mesmo turno no dia
- NC gera status `PENDING` e alerta por WhatsApp
- Conforme gera `APPROVED` automatico

#### Checklist logistico/qualidade (`components/LogisticChecklistForm.tsx`)
- Formulario multi-etapas com validacoes de preenchimento
- Inspecao estrutural e de carga com exigencia de evidencia para itens nao conformes
- Bloco de validacao Brasiltec (presenca/ausencia com justificativa)
- Salva em `customData` para campos especificos

#### Checklist sucata (`components/ScrapInspectionForm.tsx`)
- Coleta dados de expedicao/pesagem
- Exige 4 evidencias obrigatorias (superior/lateral/frontal/traseira)
- Monta email de solicitacao de faturamento (`mailto`) usando destinatarios configurados
- Salva checklist com status `APPROVED`

#### Historico (`components/HistoryView.tsx`)
- Busca textual
- Filtros por data e hora
- Escopo para gestor: `MINE` vs `TEAM`
- Modal read-only com evidencias, itens e observacoes

#### Validacao tecnica (`components/ValidationView.tsx`)
- Fila de `PENDING`
- Lista de `REJECTED` (bloqueados)
- Gestor decide `APPROVED` (libera) ou `REJECTED` (mantem bloqueio)
- Persiste supervisor no checklist atualizado

#### Configuracoes (`components/SettingsView.tsx`)
- Cadastro de itens de checklist
- Gestao de equipamentos/tipos
- Gestao de usuarios
- Configuracao de WhatsApp do gestor
- Configuracao de destinatarios de email (sucata)
- Configuracao de clientes/destinos (sucata)
- Gestao Brasiltec (quando area qualidade + gestor)
- Exibicao e remocao de afastamentos/manutencoes existentes

#### Componentes auxiliares
- `EvidenceUploader`: webcam/arquivo, preview e remocao
- `DatabaseStatus`: healthcheck periodico (`/api/health`)
- `AppVersion`: versao lida de `package.json`

## 5. Como o Backend Esta Estruturado

### 5.1 API REST (`server/index.js`)

Endpoints implementados:
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/checklists?managerId=...`
- `POST /api/checklists` (upsert por `id`)
- `GET /api/settings?managerId=...`
- `POST /api/settings`
- `GET /api/users?managerId=...`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/absences`
- `DELETE /api/absences/:id`
- `GET /api/brasiltec?managerId=...`
- `POST /api/brasiltec`
- `DELETE /api/brasiltec/:id`

### 5.2 Banco de dados (`server/db.js`)

Tabelas criadas automaticamente:
- `users`
- `checklists` (com coluna JSON `data`)
- `settings` (JSON para itens/substitute/scrap)
- `equipments`
- `absences`
- `brasiltec_users`

Seed inicial:
- usuario `ADMIN` / senha `ADMIN` como `MANAGER`

### 5.3 Entrega do frontend pelo backend
- Backend serve `server/public` com fallback para `index.html`
- Ha regras para evitar MIME incorreto de assets
- Suporte para bases de rota especificas (`/smartchecklist`, etc.)

## 6. Fluxo Front x Back

1. Front detecta usuario e manager context.
2. Front busca checklists e settings do gestor.
3. Formularios montam payload de checklist e enviam por `POST /api/checklists`.
4. Dashboard/History/Validation usam os dados retornados para analise e decisao.
5. Configuracoes persistem via `POST /api/settings` e CRUD de usuarios/ausencias/brasiltec.

## 7. Funcionalidades Atuais (resumo objetivo)

- Login por credencial
- Sessao local (localStorage)
- Tema claro/escuro
- Dashboard com KPIs e grafico
- Checklist operacional com C/NC, bloqueios e evidencias
- Checklist logistico (qualidade) com regras de conformidade
- Checklist sucata com evidencias obrigatorias e mailto de faturamento
- Historico com filtros e modal detalhado
- Validacao tecnica de pendencias e bloqueios
- Gestao de usuarios
- Gestao de itens de checklist
- Gestao de equipamentos
- Gestao de ausencia/manutencao (consulta/remocao)
- Configuracao WhatsApp de alerta
- Configuracao de destinatarios/clientes de sucata
- Monitor de status do banco

## 8. Pontos Tecnicos Importantes (estado atual)

- Build frontend executado com sucesso (`npm run build`).
- Bundle principal esta alto (~665 KB, aviso de chunk > 500 KB).
- API de login compara senha em texto puro (sem hash).
- Nao ha JWT/sessao de servidor ativa (auth state fica no frontend).
- `server/index.js` escuta em `127.0.0.1`, o que limita acesso externo direto.
- `services/backend.ts` tem metodos chamados pelo front com assinatura inconsistente:
  - `getManagerTargetPhone` exige `settings`, mas ha chamada sem esse parametro.
  - `validateBrasiltecUser` e chamado no formulario logistico, mas nao existe no service.
- Em `LogisticChecklistForm`, ha uso sem `await` em carregamento de usuarios Brasiltec (risco de estado incorreto).
- Em `SettingsView`, estados/handlers de criacao de afastamento existem, mas nao ha modal/renderizacao visivel para cadastrar novo afastamento (somente listagem/remocao aparece no codigo atual).
- Ha sinais de problema de encoding (textos com caracteres corrompidos em varios arquivos).
- `services/geminiService.ts` existe, mas nao esta conectado no fluxo principal de UI.

## 9. Execucao local (como esta hoje)

Frontend:
- `npm install`
- `npm run dev` (porta 3000)

Backend:
- configurar `.env` no `server/` com `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- iniciar `server/index.js` (porta 3001)

Build frontend:
- `npm run build`
- saida em `dist/`

---
Documento gerado a partir da analise do codigo existente no repositorio atual.
