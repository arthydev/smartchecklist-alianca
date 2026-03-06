# Plano de Integracao Front-end x Back-end PHP

## Objetivo
Integrar 100% do front-end atual ao back-end PHP puro + MySQL, mantendo compatibilidade funcional com o comportamento legado do Node.js, sem quebrar o contrato usado pela UI.

## Regras obrigatorias
- Nao armazenar dados importantes no client:
  - proibido salvar usuario, role, managerId e permissoes em `localStorage`.
  - permitido manter apenas preferencias visuais (ex.: tema).
- Manter payloads compativeis com o front-end atual durante a migracao.
- Implementar em passos pequenos.
- Testar antes de concluir cada passo.
- Nao fazer overengineering.

## Regra critica de checklist e evidencias (imagens)
Esta regra e mandatória em toda a migracao:

1. Todo checklist enviado pelo front deve ser persistido integralmente no banco.
2. O conteudo de checklist, incluindo evidencias em base64, deve ser salvo sem perda de dados.
3. O campo `checklists.data` deve manter o JSON completo do checklist (incluindo imagens).
4. No retorno da API, o checklist deve preservar o shape esperado pelo front.
5. Em atualizacoes (UPSERT), nao pode haver perda de campos/evidencias por sobrescrita indevida.

## Escopo funcional esperado ao final
- Auth por sessao server-side (cookie HttpOnly):
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- CRUD/fluxos usados pelo front:
  - `GET/POST /api/checklists`
  - `GET/POST /api/settings`
  - `GET/POST/PUT/DELETE /api/users`
  - `POST/DELETE /api/absences`
  - `GET/POST/DELETE /api/brasiltec`
- SPA servida pelo back-end PHP com fallback e `BASE_PATH`.

## Fases de execucao

## Fase 0 - Baseline de contrato real do front
- Mapear chamadas reais em `services/backend.ts`, `types.ts` e componentes.
- Documentar matrix:
  - endpoint
  - request shape atual
  - response shape esperado pela UI
  - tela impactada
- Saida esperada:
  - lista fechada de gaps de contrato.

## Fase 1 - Auth e sessao (estabilizacao)
- Garantir login/me/logout com cookie funcionando no front.
- Garantir usuario em memoria (sem `alianca_current_user`).
- Garantir boot via `/api/auth/me`.
- Compatibilizar shape de usuario retornado para UI (`id`, `username`, `role`, `managerId`, `name`, `area` quando disponivel).
- Saida esperada:
  - login, refresh (F5) e logout estaveis.

## Fase 2 - Settings (contrato estavel para Dashboard e Forms)
- Ajustar `GET /api/settings` para sempre retornar objeto valido para a UI.
- Compatibilizar `POST /api/settings` com formato legado e formato direto.
- Garantir que campos usados por dashboard/forms existam sem quebrar render.
- Saida esperada:
  - Dashboard e telas de configuracao sem erro de `undefined`.

## Fase 3 - Checklists GET (shape de leitura para UI)
- Converter registros do banco para shape esperado em `ChecklistEntry`.
- Preservar retrocompatibilidade com dados legados.
- Garantir parse seguro de JSON (com sinalizacao de erro sem quebra total).
- Saida esperada:
  - History, Dashboard e Validation renderizando corretamente.

## Fase 4 - Checklists POST (UPSERT + persistencia integral)
- Compatibilizar `POST /api/checklists` para payload legado do front e payload novo.
- Persistir JSON completo em `checklists.data`.
- Garantir preservacao de evidencias base64 em create/update.
- Implementar estrategia segura de UPSERT para nao perder campos.
- Saida esperada:
  - salvar/atualizar checklist completo, incluindo imagens.

## Fase 5 - Users (gestao completa)
- Ajustar `GET /api/users` para retornar campos usados pela UI (`id`, `name`, `username`, `role`, `area`, `email`, `managerId`).
- Garantir regras de permissao:
  - manager so gerencia usuarios do proprio contexto.
- Garantir que senha nunca retorna em response.
- Saida esperada:
  - CRUD de usuarios funcionando no `SettingsView`.

## Fase 6 - Absences (alinhamento com uso no front)
- Alinhar ausencia para abastecer a UI no formato esperado.
- Definir estrategia unica:
  - fonte em tabela `absences` com injecao no settings, ou
  - ajuste do front para consumo dedicado.
- Saida esperada:
  - bloqueios de manutencao/afastamento funcionando nos formularios e dashboard.

## Fase 7 - Brasiltec (qualidade)
- Corrigir fluxo do front:
  - chamadas async com `await`.
  - remover/implementar validacao de usuario Brasiltec de forma consistente.
- Ajustar payload/response para `GET/POST/DELETE /api/brasiltec`.
- Saida esperada:
  - fluxo de qualidade sem erro runtime.

## Fase 8 - Hardening de tipos, erros e compatibilidade
- Padronizar tratamento de erros HTTP no front (`400/401/403/404`).
- Revisar tipos compartilhados e mapeamentos.
- Garantir consistencia de serializacao JSON UTF-8.
- Saida esperada:
  - sem excecoes de contrato em runtime.

## Fase 9 - Validacao E2E final e aceite
- Validar cenarios completos por perfil:
  - MANAGER
  - OPERATOR
- Validar sessao por cookie no browser:
  - login
  - refresh
  - logout
- Validar persistencia de checklist com imagens base64.
- Saida esperada:
  - checklist de aceite 100% verde.

## Matriz minima de testes por fase
- API:
  - curl com status e JSON principal.
- Front:
  - fluxo real em UI.
- Banco:
  - confirmar persistencia/consulta dos dados criticos.

## Testes obrigatorios especificos de checklist (dados criticos)
Executar em todas as fases que toquem checklist:

1. Criar checklist com evidencias base64 (>= 2 imagens).
2. Ler checklist salvo e validar:
  - campos de negocio presentes
  - `evidence` mantido
  - tamanho/quantidade de evidencias preservados
3. Atualizar checklist e validar que nao perdeu evidencias existentes.
4. Validar no front que historico/detalhe exibem evidencias apos reload.

## Riscos e mitigacoes
- Risco: divergencia de shape em endpoints legacy.
  - Mitigacao: adapter de contrato no backend + testes por tela.
- Risco: perda de evidencias em UPSERT.
  - Mitigacao: testes de integridade antes/depois no banco e resposta API.
- Risco: usuario sem campos que a UI usa (`name`, `area`).
  - Mitigacao: normalizacao no backend ou fallback controlado no front.
- Risco: regressao silenciosa em componentes menos usados.
  - Mitigacao: suite manual orientada por fluxo de negocio.

## Ordem recomendada
1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7
9. Fase 8
10. Fase 9

## Padrao obrigatorio de fechamento por passo
Ao final de cada passo, registrar sempre:
1. O que foi entregue
2. Como rodar localmente (comandos)
3. Resultado dos testes (comandos + saida resumida)

## Atualizacao - Fluxo Sucata com PDF e Confirmacao

### Novo fluxo da tela de sucata
1. Operador preenche ficha e anexos obrigatorios.
2. Ao enviar, o front gera PDF client-side com layout equivalente a ficha modelo.
3. O sistema abre modal com preview do PDF para validacao humana.
4. Se cancelar: nada e salvo e o e-mail nao e aberto.
5. Se confirmar:
   - checklist e salvo via `POST /api/checklists`;
   - metadados do PDF sao gravados em `customData.pdfMeta`;
   - PDF e baixado localmente;
   - `mailto` e aberto pre-preenchido (anexo manual).

### Metadados persistidos no checklist
Em `customData.pdfMeta`:
- `version`
- `templateName`
- `generatedAt`
- `generatedBy` (`id`, `name`)
- `fileName`
- `formSnapshotHash`

### Limitacao atual
- O protocolo `mailto` nao permite anexar automaticamente o PDF.
- O fluxo adotado e: download local + abertura do cliente de e-mail.
