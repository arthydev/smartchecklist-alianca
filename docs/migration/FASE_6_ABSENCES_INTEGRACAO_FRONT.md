# Fase 6 - Absences (alinhamento com frontend)

Data: 2026-03-05

## Objetivo
Garantir que o frontend receba e use ausências no formato correto (`settings.absences`) para bloqueios de operadores/equipamentos e indicadores do dashboard.

## Entregas
- `AbsencesRepository`:
  - novo método `listByManagerId(int $managerId)`.
  - `mapRow()` padronizado para o shape do front:
    - `id`, `entityId`, `type`, `reason`, `startDate`, `endDate`, `managerId`.
  - fallback de datas:
    - se não houver `startDate/endDate`, usa `date` quando disponível.
  - mantém `createdAt` quando a coluna existir.
- `GET /api/settings`:
  - passa a injetar `absences` lidas da tabela `absences` (fonte de verdade).
- README:
  - exemplo de payload de ausência no formato real usado pela UI.
  - nota explícita de que `/api/settings` retorna `absences` da tabela.

## Impacto funcional
- Dashboard e formulários passam a receber `settings.absences` consistentes após criação/remoção de ausências.
- Fluxo do `SettingsView` (`addAbsence`/`removeAbsence` + refresh de settings) fica compatível com PHP.
