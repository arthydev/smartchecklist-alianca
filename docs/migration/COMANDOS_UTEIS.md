# Comandos Uteis

Este arquivo centraliza os comandos operacionais mais usados no projeto.

## 1. Instalar dependencias

Na raiz do projeto:

```powershell
npm install
```

## 2. Configurar variaveis de ambiente

Frontend (raiz do projeto):

```powershell
Copy-Item .env.local.example .env.local
```

Se nao existir exemplo, crie manualmente um `.env` ou `.env.local` na raiz.

Exemplo local com backend PHP em `localhost:3001`:

```env
VITE_API_BASE_URL=/api
```

Backend PHP:

```powershell
Copy-Item backend-php/.env.example backend-php/.env
```

Exemplo local:

```env
APP_ENV=dev
BASE_PATH=
FRONT_ORIGIN=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=smartchecklist
DB_USER=root
DB_PASS=
```

## 3. Subir backend PHP

```powershell
php -S localhost:3001 -t backend-php/public
```

## 4. Subir frontend Vite

```powershell
npm run dev
```

URL local padrao do frontend:

```text
http://localhost:3000
```

## 5. Rodar frontend + backend local

Terminal 1:

```powershell
php -S localhost:3001 -t backend-php/public
```

Terminal 2:

```powershell
npm run dev
```

## 6. Build do frontend

```powershell
npm run build
```

## 7. Publicar o SPA para ser servido pelo PHP

Comando consolidado:

```powershell
npm run deploy:php-spa
```

Esse comando:
- gera o `dist`
- copia para `backend-php/public/app`
- atualiza `backend-php/public/assets`
- atualiza `backend-php/public/smartchecklist/assets`

## 8. Preview do build do frontend

```powershell
npm run preview
```

## 9. Rodar migrations

```powershell
php backend-php/bin/migrate.php
```

## 10. Rodar seeders

```powershell
php backend-php/bin/seed.php
```

## 11. Resetar o banco e recriar apenas o ADMIN

Comando destrutivo:

```powershell
php backend-php/bin/reset_database.php
```

Efeito esperado:
- limpa dados funcionais
- preserva `_migrations`
- limpa `_seed_runs`
- recria o usuario `ADMIN`

## 12. Validar healthcheck da API

```powershell
curl -i http://localhost:3001/api/health
```

## 13. Testar login via curl

```powershell
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"username\":\"ADMIN\",\"password\":\"ADMIN\"}"
```

## 14. Testar sessao autenticada

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/auth/me
```

## 15. Fazer logout via curl

```powershell
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/auth/logout
```

## 16. Testar endpoints principais autenticados

Settings:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/settings
```

Users:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/users
```

Checklists:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/checklists
```

Brasiltec:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/brasiltec
```

## 17. Lint rapido de arquivos PHP

Arquivo especifico:

```powershell
php -l backend-php/public/index.php
```

Exemplos uteis:

```powershell
php -l backend-php/src/Repositories/ScrapDirectoryRepository.php
php -l backend-php/bin/reset_database.php
```

## 18. Verificar quem esta ouvindo uma porta

PowerShell:

```powershell
netstat -ano | findstr :3001
netstat -ano | findstr :3000
```

Linux:

```bash
ss -ltnp | grep 3001
ss -ltnp | grep 3000
```

## 19. Validar preflight CORS

```powershell
curl.exe -i -X OPTIONS http://localhost:3001/api/auth/me `
  -H "Origin: http://localhost:3000" `
  -H "Access-Control-Request-Method: GET"
```

Esperado:
- `204 No Content`
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Credentials: true`

## 20. Verificar se o bundle servido pelo PHP esta atualizado

Build local:

```powershell
Get-Content dist/index.html
```

Build copiado para o PHP:

```powershell
Get-Content backend-php/public/app/index.html
```

Se quiser procurar URL antiga hardcoded:

```powershell
Get-ChildItem -Recurse dist,backend-php/public/app,backend-php/public/assets | Select-String "http://69.6.251.60:3002/api"
```

## 21. Comandos uteis em Linux/VPS

Subir backend PHP em modo simples:

```bash
php -S 0.0.0.0:3002 -t backend-php/public
```

Rodar migrations:

```bash
php backend-php/bin/migrate.php
```

Rodar seed:

```bash
php backend-php/bin/seed.php
```

Publicar SPA para o PHP:

```bash
npm run deploy:php-spa
```

## 22. Fluxo recomendado para ambiente novo

1. Instalar dependencias:

```powershell
npm install
```

2. Configurar `.env` do frontend e `backend-php/.env`

3. Criar schema:

```powershell
php backend-php/bin/migrate.php
```

4. Aplicar seed:

```powershell
php backend-php/bin/seed.php
```

5. Subir backend:

```powershell
php -S localhost:3001 -t backend-php/public
```

6. Subir frontend:

```powershell
npm run dev
```

## 23. Fluxo recomendado para publicacao do SPA no PHP

1. Garantir `VITE_API_BASE_URL=/api` no build de producao
2. Gerar e publicar:

```powershell
npm run deploy:php-spa
```

3. Subir o servidor PHP apontando para `backend-php/public`

## 24. Credencial padrao

Usuario padrao apos seed/reset:

```text
username: ADMIN
password: ADMIN
```
