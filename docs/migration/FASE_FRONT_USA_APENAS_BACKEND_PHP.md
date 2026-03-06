# Fase - Front usando apenas backend PHP

Data: 2026-03-06

## Decisão de configuração
- Estratégia aplicada: **Proxy do Vite**.
- Frontend chama somente caminhos relativos `/api/*`.
- Proxy local:
  - `/api` -> `http://localhost:3001` (backend PHP).

## Alterações aplicadas
- `vite.config.ts`:
  - adicionado `server.proxy` para `/api`.
- `services/backend.ts`:
  - removida dependência de URL hardcoded de host.
  - base da API centralizada:
    - usa `VITE_API_BASE_URL` quando definida.
    - fallback padrão: `/api`.
- `README.md`:
  - fluxo local oficial documentado com PHP + Vite.
  - backend Node marcado como legado (não necessário para uso local).

## Resultado
- Frontend não depende mais do Node backend para funcionar localmente.
- Sessão com cookie permanece funcional via Vite proxy.
