# Fase 1 - Normalizacao de Auth (Payload + Sessao)

## Escopo da fase
- Normalizar payload de usuario retornado por `POST /api/auth/login` e `GET /api/auth/me`.
- Manter fluxo de sessao por cookie HttpOnly.
- Adicionar fallback defensivo no frontend para evitar quebra de UI quando campos opcionais estiverem ausentes.

## Alteracoes aplicadas
- Backend:
  - `backend-php/src/Repositories/UserRepository.php`
    - inclui leitura de `name` e `area` (com suporte a env vars `AUTH_NAME_FIELD` e `AUTH_AREA_FIELD`).
  - `backend-php/src/Auth.php`
    - inclui `name` e `area` no objeto normalizado de sessao.
  - `backend-php/src/UserContext.php`
    - normaliza `name` com fallback para `username`.
    - preserva `area` quando existir.
  - `backend-php/src/Session.php`
    - persiste `name` e `area` em `$_SESSION['user']`.
- Frontend:
  - `App.tsx`
    - normalizacao defensiva do usuario (`name` fallback para `username`, `area` fallback vazio).
    - ajuste de avatar para nao quebrar quando `name` estiver ausente.

## Resultado esperado desta fase
- Login/me retornam shape de usuario mais compativel com o frontend atual.
- Sessao continua funcional com cookie HttpOnly.
