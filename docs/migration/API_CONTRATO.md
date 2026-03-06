# Contrato atual da API

## /api/health
Método: GET  
Descrição: endpoint de verificação de saúde do servidor.

Response esperado (exemplo):
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## /api/auth/login
Método: POST  
Body esperado:
```json
{
  "username": "string",
  "password": "string"
}
```

Response esperado:  
Usuário autenticado com informações de perfil (sem campo `password`).

Exemplo de response:
```json
{
  "id": "string",
  "name": "string",
  "username": "string",
  "role": "MANAGER|OPERATOR",
  "manager_id": "string|null",
  "area": "string|null"
}
```

Observações:
- atualmente o frontend salva o usuário no localStorage
- isso será removido na migração

---

## /api/settings
Métodos: GET, POST

Descrição:  
Configurações do sistema por `managerId`.

GET `/api/settings?managerId=...`  
Response esperado (estrutura):
```json
{
  "items": [],
  "substitute": {
    "name": "",
    "phone": "",
    "isActive": false
  },
  "scrapRecipients": [],
  "scrapClients": [],
  "equipment": [],
  "absences": []
}
```

POST `/api/settings`  
Body esperado:
```json
{
  "managerId": "string",
  "updates": {
    "items": [],
    "substitute": {},
    "scrapRecipients": [],
    "scrapClients": []
  }
}
```

Response esperado:
```json
{
  "success": true
}
```

Observações:
- os dados são armazenados como JSON

---

## /api/users
Métodos: GET, POST, PUT, DELETE

Descrição:  
Gerenciamento de usuários vinculados a um manager.

GET `/api/users?managerId=...`  
Response: lista de usuários sem o campo `password`.

POST `/api/users`  
Body: objeto de usuário completo.

Response esperado:
```json
{
  "success": true,
  "id": "string"
}
```

PUT `/api/users/:id`  
Body: campos atualizáveis do usuário.

Response esperado:
```json
{
  "success": true
}
```

DELETE `/api/users/:id`  
Response esperado:
```json
{
  "success": true
}
```

---

## /api/checklists
Métodos: GET, POST

Descrição:  
Armazena checklists executados no sistema.

GET `/api/checklists?managerId=...`  
Response: lista de checklists.

POST `/api/checklists`  
Body: checklist completo.

Response esperado:  
Retorna o próprio checklist salvo.

Observações importantes:
- o campo `data` é armazenado como JSON no banco
- a operação POST funciona como UPSERT baseado no campo `id`

---

## /api/absences
Métodos: POST, DELETE

Descrição:  
Controle de ausências de operadores.

POST `/api/absences`  
Body esperado:
```json
{
  "id": "string",
  "entityId": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "string",
  "managerId": "string"
}
```

Response esperado:
```json
{
  "success": true
}
```

DELETE `/api/absences/:id`  
Response esperado:
```json
{
  "success": true
}
```

---

## /api/brasiltec
Métodos: GET, POST, DELETE

Descrição:  
Gerenciamento de usuários Brasiltec.

GET `/api/brasiltec?managerId=...`  
Response: lista de usuários Brasiltec.

POST `/api/brasiltec`  
Body esperado:
```json
{
  "id": "string",
  "name": "string",
  "password": "string",
  "managerId": "string"
}
```

Response esperado:
```json
{
  "success": true
}
```

DELETE `/api/brasiltec/:id`  
Response esperado:
```json
{
  "success": true
}
```
