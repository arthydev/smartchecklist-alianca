# Backend PHP (migraÃ§Ã£o)

## VariÃ¡veis de ambiente (PowerShell)

Exemplo sem DB habilitado:

```powershell
$env:APP_ENV='dev'
$env:BASE_PATH=''
$env:FRONT_ORIGIN='http://localhost:5173'
$env:DB_NAME=''
```

Exemplo com DB configurado:

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_NAME='smartchecklist'
$env:DB_USER='root'
$env:DB_PASS=''
```

## Como rodar o servidor

```powershell
php -S localhost:3001 -t backend-php/public
```

## Migrations e Seeders (PHP puro)

O backend PHP agora possui runner nativo de migrations/seeders (sem framework).

Estrutura:
- `backend-php/database/migrations/*.php`
- `backend-php/database/seeders/*.php`
- `backend-php/bin/migrate.php`
- `backend-php/bin/seed.php`

Ordem recomendada em ambiente novo:

```powershell
php backend-php/bin/migrate.php
php backend-php/bin/seed.php
```

Comportamento:
- Migrations aplicadas são registradas em `_migrations`.
- Seeders aplicados são registrados em `_seed_runs`.
- Execução é idempotente (não reaplica o que já rodou).

## ConfiguraÃ§Ã£o via .env

O backend PHP agora suporta arquivo `.env` sem biblioteca externa.

PrecedÃªncia de configuraÃ§Ã£o:
1. VariÃ¡vel jÃ¡ definida no ambiente do sistema
2. VariÃ¡vel definida em `backend-php/.env`
3. Default no cÃ³digo (`getenv(..., default)` jÃ¡ existente em `Config.php` e `DB.php`)

Passos:

```powershell
Copy-Item backend-php/.env.example backend-php/.env
```

Edite `backend-php/.env` com os valores locais e rode:

```powershell
php -S localhost:3001 -t backend-php/public
```

## Servir SPA (build dist) pelo PHP

1. Gerar build do frontend (na raiz do projeto):

```powershell
npm install
npm run build
```

2. Copiar o build para o diretÃ³rio estÃ¡vel servido pelo PHP:

```powershell
New-Item -ItemType Directory -Path backend-php/public/app -Force | Out-Null
Copy-Item -Path dist\* -Destination backend-php/public/app -Recurse -Force

# Compatibilidade com servidor embutido do PHP para paths de assets:
New-Item -ItemType Directory -Path backend-php/public/assets -Force | Out-Null
Copy-Item -Path backend-php/public/app/assets\* -Destination backend-php/public/assets -Recurse -Force
New-Item -ItemType Directory -Path backend-php/public/smartchecklist/assets -Force | Out-Null
Copy-Item -Path backend-php/public/app/assets\* -Destination backend-php/public/smartchecklist/assets -Recurse -Force
```

Estrutura esperada:
- `backend-php/public/app/index.html`
- `backend-php/public/app/assets/*`

3. Testar no navegador:
- `http://localhost:3001/`
- `http://localhost:3001/dashboard` (fallback SPA)
- com base path: `BASE_PATH='/smartchecklist'` e acessar
  - `http://localhost:3001/smartchecklist/`
  - `http://localhost:3001/smartchecklist/dashboard`

## Como testar o health

```powershell
curl -i http://localhost:3001/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "db": {
    "enabled": false,
    "ok": false
  }
}
```

## Como testar sessÃ£o (cookie jar)
1. Configurar ambiente e banco:

```powershell
$env:APP_ENV='dev'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3306'
$env:DB_NAME='smartchecklist'
$env:DB_USER='root'
$env:DB_PASS=''
```

2. Login vÃ¡lido:

```powershell
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"username\":\"ADMIN\",\"password\":\"ADMIN\"}"
```

3. Verificar sessÃ£o autenticada:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/auth/me
```

4. Testar credencial invÃ¡lida (401):

```powershell
curl -i -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"username\":\"ADMIN\",\"password\":\"ERRADA\"}"
```

5. Logout:

```powershell
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/auth/logout
```

6. Confirmar sessÃ£o limpa:

```powershell
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/auth/me
```

## Rota protegida de teste

Sem autenticaÃ§Ã£o:

```powershell
curl -i http://localhost:3001/api/auth/protected-test
```

Esperado:
- `401 Unauthorized`
- `{"error":"Unauthorized"}`

Com autenticaÃ§Ã£o (cookie jar):

```powershell
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"username\":\"ADMIN\",\"password\":\"ADMIN\"}"

curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/auth/protected-test
```

Esperado:
- `200 OK`
- `{"ok":true,"user":{...}}`

## Endpoints de settings

As rotas abaixo exigem sessÃ£o vÃ¡lida (`requireAuth`):
- `GET /api/settings`
- `POST /api/settings`

Compatibilidade com schema legado Node:
- `items`, `substitute`, `scrapRecipients` e `scrapClients` sÃ£o persistidos em colunas da tabela `settings` quando essas colunas existirem.
- `equipment` Ã© persistido na tabela `equipments` e retornado dentro de `GET /api/settings`.

Exemplos:

```powershell
# Buscar settings do manager da sessÃ£o
curl -i -c cookies.txt -b cookies.txt "http://localhost:3001/api/settings"

# Salvar settings (payload direto)
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/settings `
  -H "Content-Type: application/json" `
  -d "{\"exampleFlag\":true,\"theme\":\"dark\"}"

# Cadastrar equipamento via settings
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/settings `
  -H "Content-Type: application/json" `
  -d "{\"equipment\":[{\"id\":\"EQ-T1\",\"code\":\"EQ-T1\",\"description\":\"EQUIPAMENTO TESTE\",\"active\":true,\"type\":\"PRIMARY\",\"category\":\"OUTROS\"}]}"

# Salvar no formato legado (managerId + updates)
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/settings `
  -H "Content-Type: application/json" `
  -d "{\"managerId\":1,\"updates\":{\"exampleFlag\":true,\"theme\":\"dark\"}}"
```

## Mapeamento de settings por env

Use estas variÃ¡veis se o schema real nÃ£o usar nomes padrÃ£o:

```powershell
$env:SETTINGS_TABLE='settings'
$env:SETTINGS_ID_FIELD='id'
$env:SETTINGS_MANAGER_FIELD='managerId'   # fallback automÃ¡tico: manager_id
$env:SETTINGS_JSON_FIELD='data'           # fallback: settings,json,settings_json,items
```

## Mapeamento de equipments por env

```powershell
$env:EQUIPMENTS_TABLE='equipments'
$env:EQUIPMENTS_ID_FIELD='id'
$env:EQUIPMENTS_MANAGER_FIELD='managerId'      # fallback: manager_id
$env:EQUIPMENTS_CODE_FIELD='code'
$env:EQUIPMENTS_DESCRIPTION_FIELD='description'
$env:EQUIPMENTS_ACTIVE_FIELD='active'
$env:EQUIPMENTS_TYPE_FIELD='type'
$env:EQUIPMENTS_CATEGORY_FIELD='category'
```

## Endpoints de users

Rotas protegidas:
- `GET /api/users`
- `POST /api/users` (somente `MANAGER`)
- `PUT /api/users/:id` (somente `MANAGER`)
- `DELETE /api/users/:id` (somente `MANAGER`)

Exemplos:

```powershell
# Listar usuÃ¡rios do manager logado
curl -i -c cookies.txt -b cookies.txt "http://localhost:3001/api/users"

# Criar usuÃ¡rio
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/users `
  -H "Content-Type: application/json" `
  -d "{\"id\":\"8f5f8c8d-7e12-4b0d-a87a-a9f0f4f2f6aa\",\"name\":\"OPERADOR TESTE\",\"username\":\"OP1\",\"password\":\"123\",\"email\":\"op1@example.com\",\"role\":\"OPERATOR\",\"area\":\"OPERACAO\"}"

# Atualizar usuÃ¡rio
curl -i -c cookies.txt -b cookies.txt -X PUT http://localhost:3001/api/users/123456 `
  -H "Content-Type: application/json" `
  -d "{\"role\":\"OPERATOR\"}"

# Deletar usuÃ¡rio
curl -i -c cookies.txt -b cookies.txt -X DELETE http://localhost:3001/api/users/123456
```

Sem autenticaÃ§Ã£o:

```powershell
curl -i http://localhost:3001/api/users
```

Esperado:
- `401 Unauthorized`

## Mapeamento de users por env

```powershell
$env:USERS_TABLE='users'
$env:USERS_ID_FIELD='id'
$env:USERS_USERNAME_FIELD='username'
$env:USERS_PASSWORD_FIELD='password'
$env:USERS_ROLE_FIELD='role'
$env:USERS_MANAGER_FIELD='managerId'   # fallback automÃ¡tico: manager_id
$env:USERS_NAME_FIELD='name'
$env:USERS_EMAIL_FIELD='email'
$env:USERS_AREA_FIELD='area'
$env:USERS_PHONE_FIELD='phone'
```

## Rotina de saneamento de manager_id

Quando houver dados legados inconsistentes (ex.: managers com `manager_id` errado, ou operadores presos em um manager incorreto), use:

```powershell
# Dry-run (nao altera dados)
php backend-php/dev/repair_manager_scope.php

# Corrige managers: role=MANAGER passa a ter manager_id = id
php backend-php/dev/repair_manager_scope.php --apply

# Remapeia operadores de um manager antigo para outro
php backend-php/dev/repair_manager_scope.php --apply --from-manager=1 --to-manager=<ID_DO_GESTOR_CORRETO>

# Somente remapeamento de operadores (sem tocar managers)
php backend-php/dev/repair_manager_scope.php --apply --skip-managers --from-manager=1 --to-manager=<ID_DO_GESTOR_CORRETO>
```

## Endpoints de checklists

Rotas protegidas:
- `GET /api/checklists`
- `POST /api/checklists` (UPSERT por `id`)

Regras:
- Exige autenticaÃ§Ã£o
- Filtra por `managerId` do usuÃ¡rio logado
- Se `?managerId=` for enviado, deve bater com o `managerId` da sessÃ£o
- `POST /api/checklists` aceita os dois formatos:
  - novo: `{ "id": "...", "data": { ... } }`
  - legado front: checklist completo no root (sem `data`)
- EvidÃªncias base64 sÃ£o persistidas dentro de `checklists.data` sem transformaÃ§Ã£o.

Exemplo:

```powershell
curl -i -c cookies.txt -b cookies.txt "http://localhost:3001/api/checklists"
curl -i -c cookies.txt -b cookies.txt "http://localhost:3001/api/checklists?managerId=1"

# UPSERT create/update por id
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/checklists `
  -H "Content-Type: application/json" `
  -d "{\"id\":\"TEST-1\",\"data\":{\"title\":\"teste\",\"evidence\":\"data:image/png;base64,AAA\"}}"

# Formato legado (compatÃ­vel com frontend atual)
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/checklists `
  -H "Content-Type: application/json" `
  -d "{\"id\":\"TEST-2\",\"userId\":\"1\",\"userName\":\"ADMIN\",\"date\":\"2026-03-05T10:00:00.000Z\",\"equipmentNo\":\"EQ-1\",\"area\":\"OPERACAO\",\"shift\":\"MANHA\",\"items\":[{\"id\":1,\"description\":\"Freio\",\"status\":\"C\"}],\"observations\":\"ok\",\"evidence\":[\"data:image/png;base64,AAA\"],\"approvalStatus\":\"APPROVED\",\"createdAt\":1741197600000}"
```

Sem autenticaÃ§Ã£o:

```powershell
curl -i "http://localhost:3001/api/checklists"
```

## Mapeamento de checklists por env

```powershell
$env:CHECKLISTS_TABLE='checklists'
$env:CHECKLISTS_ID_FIELD='id'
$env:CHECKLISTS_MANAGER_FIELD='managerId'   # fallback: manager_id
$env:CHECKLISTS_DATA_FIELD='data'
$env:CHECKLISTS_CREATED_FIELD='createdAt'   # fallback: created_at
$env:CHECKLISTS_UPDATED_FIELD='updatedAt'   # fallback: updated_at
# opcionais:
$env:CHECKLISTS_TYPE_FIELD=''
$env:CHECKLISTS_STATUS_FIELD=''
```

## Endpoints de absences

Rotas protegidas (somente `MANAGER`):
- `POST /api/absences`
- `DELETE /api/absences/:id`

Exemplos:

```powershell
# Criar ausÃªncia (payload mÃ­nimo)
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/absences `
  -H "Content-Type: application/json" `
  -d "{\"id\":\"abs-test-1\",\"entityId\":\"1\",\"type\":\"USER\",\"reason\":\"VACATION\",\"startDate\":\"2026-03-05\",\"endDate\":\"2026-03-10\"}"

# Remover ausÃªncia por id
curl -i -c cookies.txt -b cookies.txt -X DELETE http://localhost:3001/api/absences/<ID>
```

Sem autenticaÃ§Ã£o:

```powershell
curl -i -X POST http://localhost:3001/api/absences -H "Content-Type: application/json" -d "{\"date\":\"2026-03-05\"}"
```

## Mapeamento de absences por env

```powershell
$env:ABSENCES_TABLE='absences'
$env:ABSENCES_ID_FIELD='id'
$env:ABSENCES_MANAGER_FIELD='managerId'   # fallback: manager_id
$env:ABSENCES_USER_FIELD='userId'         # fallback: user_id, entity_id
$env:ABSENCES_DATE_FIELD='date'
$env:ABSENCES_REASON_FIELD='reason'
$env:ABSENCES_CREATED_FIELD='createdAt'   # fallback: created_at
```

ObservaÃ§Ã£o:
- `GET /api/settings` injeta `absences` a partir da tabela `absences` no formato esperado pelo frontend:
  - `id`, `entityId`, `type`, `reason`, `startDate`, `endDate`, `managerId`.

## Endpoints de brasiltec

Rotas:
- `GET /api/brasiltec` (auth)
- `POST /api/brasiltec` (auth + MANAGER)
- `POST /api/brasiltec/validate` (auth)
- `DELETE /api/brasiltec/:id` (auth + MANAGER)

Exemplos:

```powershell
# Listar
curl -i -c cookies.txt -b cookies.txt http://localhost:3001/api/brasiltec

# Criar
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/brasiltec `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Cliente Teste\",\"phone\":\"31999999999\",\"code\":\"BR-TEST\"}"

# Deletar
curl -i -c cookies.txt -b cookies.txt -X DELETE http://localhost:3001/api/brasiltec/<ID>

# Validar senha do colaborador Brasiltec (sem expor senha/hash)
curl -i -c cookies.txt -b cookies.txt -X POST http://localhost:3001/api/brasiltec/validate `
  -H "Content-Type: application/json" `
  -d "{\"userId\":\"<ID>\",\"password\":\"123\"}"
```

Sem autenticaÃ§Ã£o:

```powershell
curl -i http://localhost:3001/api/brasiltec
```

## Mapeamento de brasiltec por env

```powershell
$env:BRASILTEC_TABLE='brasiltec_users'
$env:BRASILTEC_ID_FIELD='id'
$env:BRASILTEC_MANAGER_FIELD='managerId'   # fallback: manager_id
$env:BRASILTEC_NAME_FIELD='name'
$env:BRASILTEC_PHONE_FIELD='phone'         # fallback: targetPhone
$env:BRASILTEC_CODE_FIELD='code'
$env:BRASILTEC_CREATED_FIELD='createdAt'   # fallback: created_at
```

## Mapeamento de campos da tabela users

Se o schema do MySQL for diferente, configure os nomes de campos por env:

```powershell
$env:AUTH_USERS_TABLE='users'
$env:AUTH_ID_FIELD='id'
$env:AUTH_USERNAME_FIELD='username'
$env:AUTH_PASSWORD_FIELD='password'
$env:AUTH_ROLE_FIELD='role'
$env:AUTH_MANAGER_FIELD='managerId'
```

ObservaÃ§Ã£o:
- O repositÃ³rio tambÃ©m tenta fallback automÃ¡tico para `manager_id` quando `managerId` nÃ£o existir.


