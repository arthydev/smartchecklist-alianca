# Ambiente local (migração PHP)

## Pré-requisitos
- PHP 8.2+ (mínimo sugerido: 8.1)
- MySQL 8+
- Node.js 18+ (para rodar o front com Vite)
- Composer é opcional e NÃO é necessário para o backend em PHP puro

## Variáveis de ambiente / configuração
O backend PHP deve ler configuração de um arquivo central (ex.: `config.php` ou `.env`) com:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `APP_ENV` (`dev` ou `prod`)
- `BASE_PATH` (`''` para raiz ou `'/smartchecklist'` para subpasta)
- `FRONT_ORIGIN` (origem do frontend quando front e API estiverem em domínios/portas diferentes)

Exemplo de configuração (referência):
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=smartchecklist
DB_USER=root
DB_PASS=
APP_ENV=dev
BASE_PATH=
FRONT_ORIGIN=http://localhost:5173
```

## Como rodar o backend PHP localmente (modo simples)
Usar o servidor embutido do PHP apontando para a pasta pública do backend.

Exemplo:
```bash
php -S localhost:3001 -t backend-php/public
```

Observação:
- Se a estrutura final ficar diferente, ajuste o caminho `-t` (documentação usa `backend-php/public` apenas como referência).

## Como rodar o front localmente
Projeto atual usa Vite, então o fluxo local é:

```bash
npm install
npm run dev
```

Integração front + API (duas opções):
- Opção A (preferida em dev): configurar proxy no Vite para evitar CORS no desenvolvimento.
- Opção B: manter API em outra origem/porta e habilitar CORS com cookie no backend + `credentials: 'include'` no frontend.

## BASE_PATH: como testar
### Cenário A: raiz `/`
- Definir `BASE_PATH=''`.
- Acessar aplicação pela raiz (ex.: `http://localhost:3001/`).
- Rotas de API continuam em `/api/*`.

### Cenário B: subpasta `/smartchecklist`
- Definir `BASE_PATH='/smartchecklist'`.
- Acessar SPA em `http://localhost:3001/smartchecklist`.
- Backend deve remover o `BASE_PATH` da URL antes de resolver as rotas `/api/*`.

Comportamento esperado do roteamento:
- Se a rota começar com `/api/*`, tratar como API.
- Se não for `/api/*`, retornar `index.html` (fallback SPA), inclusive em rota direta como `/smartchecklist/history`.

## Sessão com cookie: como testar e mitigar CORS
Resumo de configuração esperada para autenticação por sessão:
- Frontend deve enviar `credentials: 'include'` nas chamadas HTTP.
- Backend deve responder `Access-Control-Allow-Origin` com origem exata (não usar `*` com credenciais).
- Backend deve responder `Access-Control-Allow-Credentials: true`.
- Em domínios diferentes: cookie com `SameSite=None; Secure`.
- No mesmo domínio: cookie com `SameSite=Lax`.

Validação prática (quando endpoints de sessão existirem):
- Login cria cookie HttpOnly.
- Requisição subsequente autenticada com o cookie.
- Refresh da SPA mantém sessão sem usar `localStorage` para dados sensíveis.

## Checklist rápido
Comandos de verificação rápida (executar quando os endpoints estiverem disponíveis):

```bash
# Health
curl http://localhost:3001/api/health

# Login (futuro endpoint de sessão)
curl -i -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ADMIN","password":"ADMIN"}'

# Verificar rota direta SPA (fallback)
# Abrir no navegador:
# http://localhost:3001/smartchecklist/history
```

Verificações esperadas:
- `/api/health` responde HTTP 200.
- Login retorna `Set-Cookie` (quando implementado).
- Rota direta da SPA abre a tela correta sem erro de asset/MIME.
