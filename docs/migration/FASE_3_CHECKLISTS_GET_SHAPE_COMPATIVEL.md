# Fase 3 - Checklists GET (Shape Compativel com Front)

## Escopo da fase
- Adaptar `GET /api/checklists` para retornar shape compativel com `ChecklistEntry` usado no frontend.
- Manter dados originais em `data` sem perda.
- Preservar regras de auth e escopo de `managerId`.

## Alteracoes aplicadas

## Backend (`backend-php/src/Repositories/ChecklistsRepository.php`)
- `mapRow(...)` agora converte cada linha para shape de checklist legado da UI.
- Adicionada funcao `toChecklistEntryShape(...)` com:
  - merge de `data` (JSON) com metadados de linha (`id`, `managerId`)
  - defaults seguros para campos esperados:
    - `userId`, `userName`, `date`, `equipmentNo`, `area`, `shift`, `observations`
    - `items` (array), `evidence` (array)
    - `approvalStatus` com fallback (`status` ou `PENDING`)
  - normalizacao de `createdAt` para numero (ms) para ordenar/filtrar no front.
- Campo `data` permanece no retorno para compatibilidade de transicao.

## Resultado esperado desta fase
- `GET /api/checklists` deixa de retornar apenas `{id, managerId, data}` e passa a retornar estrutura compativel com as telas `Dashboard`, `HistoryView` e `ValidationView`.
- Mantem seguranca:
  - sem auth => `401`
  - `managerId` divergente => `403`
