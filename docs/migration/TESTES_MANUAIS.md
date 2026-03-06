# Testes manuais da API

## Teste health

```bash
curl http://localhost:3001/api/health
```

Esperado:  
HTTP 200 com `status` igual a `ok` e `database` igual a `connected`.

---

## Teste login

```bash
curl -X POST http://localhost:3001/api/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"ADMIN","password":"ADMIN"}'
```

Esperado:  
HTTP 200 com objeto de usuário autenticado (sem campo `password`).

---

## Teste settings (GET)

```bash
curl "http://localhost:3001/api/settings?managerId=1"
```

Esperado:  
HTTP 200 com objeto contendo `items`, `substitute`, `equipment`, `absences`.

---

## Teste settings (POST)

```bash
curl -X POST http://localhost:3001/api/settings \
-H "Content-Type: application/json" \
-d '{"managerId":"1","updates":{"scrapClients":["CLIENTE_TESTE"]}}'
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste users (GET)

```bash
curl "http://localhost:3001/api/users?managerId=1"
```

Esperado:  
HTTP 200 com lista de usuários sem campo `password`.

---

## Teste users (POST)

```bash
curl -X POST http://localhost:3001/api/users \
-H "Content-Type: application/json" \
-d '{"id":"u_test_1","name":"Usuario Teste","username":"USER_TESTE","password":"1234","role":"OPERATOR","managerId":"1","area":"OPERACAO"}'
```

Esperado:  
HTTP 200 com `{ "success": true, "id": "u_test_1" }`.

---

## Teste users (PUT)

```bash
curl -X PUT http://localhost:3001/api/users/u_test_1 \
-H "Content-Type: application/json" \
-d '{"name":"Usuario Teste Editado","username":"USER_TESTE","password":"1234","role":"OPERATOR","area":"OPERACAO"}'
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste users (DELETE)

```bash
curl -X DELETE http://localhost:3001/api/users/u_test_1
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste checklists (GET)

```bash
curl "http://localhost:3001/api/checklists?managerId=1"
```

Esperado:  
HTTP 200 com lista de checklists.

---

## Teste checklists (POST / UPSERT)

```bash
curl -X POST http://localhost:3001/api/checklists \
-H "Content-Type: application/json" \
-d '{"id":"chk_test_1","managerId":"1","date":"2026-03-05","equipmentNo":"EQ-01","shift":"A","approvalStatus":"APPROVED","items":[]}'
```

Esperado:  
HTTP 200 retornando o checklist enviado.

---

## Teste absences (POST)

```bash
curl -X POST http://localhost:3001/api/absences \
-H "Content-Type: application/json" \
-d '{"id":"abs_test_1","entityId":"u_test_1","startDate":"2026-03-05","endDate":"2026-03-06","reason":"ATESTADO","managerId":"1"}'
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste absences (DELETE)

```bash
curl -X DELETE http://localhost:3001/api/absences/abs_test_1
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste brasiltec (GET)

```bash
curl "http://localhost:3001/api/brasiltec?managerId=1"
```

Esperado:  
HTTP 200 com lista de usuários Brasiltec.

---

## Teste brasiltec (POST)

```bash
curl -X POST http://localhost:3001/api/brasiltec \
-H "Content-Type: application/json" \
-d '{"id":"br_test_1","name":"Brasiltec Teste","password":"1234","managerId":"1"}'
```

Esperado:  
HTTP 200 com `{ "success": true }`.

---

## Teste brasiltec (DELETE)

```bash
curl -X DELETE http://localhost:3001/api/brasiltec/br_test_1
```

Esperado:  
HTTP 200 com `{ "success": true }`.
