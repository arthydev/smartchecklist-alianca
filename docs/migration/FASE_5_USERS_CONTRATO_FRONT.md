# Fase 5 - Users (Contrato para Frontend)

Data: 2026-03-05

## Objetivo
Ajustar o contrato de `/api/users` no backend PHP para ficar compatível com o uso real do frontend (`SettingsView` e `Dashboard`), mantendo segurança e sem expor senha.

## Entregas técnicas
- `UsersRepository` atualizado para:
  - aceitar `id` string (UUID) em create/update/delete/find.
  - retornar campos usados no frontend: `id`, `name`, `username`, `role`, `managerId`, `email`, `area`, `phone`, `createdAt`.
  - continuar sem retornar senha/hash.
  - aceitar e persistir (quando colunas existirem) `name`, `email`, `area`, `phone`.
  - aceitar `managerId` como string (sem forçar cast numérico).
- Rotas `PUT /api/users/:id` e `DELETE /api/users/:id` atualizadas para aceitar IDs não numéricos.
- Validação de escopo mantida:
  - somente `MANAGER` altera usuários.
  - manager só altera usuários do próprio contexto.

## Compatibilidade
- Frontend cria usuários com `crypto.randomUUID()`; após este ajuste, update/delete com UUID funciona.
- Resposta de `/api/users` agora já entrega os campos necessários para renderização da UI.

## Observações
- Campo `email` só é persistido/retornado se existir coluna no schema.
- Mapeamento por env foi mantido e expandido no README para `name/email/area/phone`.
