# Refatoração Backend Node.js → PHP

## 0) Objetivo e Escopo da Refatoração

Migrar o backend **Node.js + Express** para **PHP puro**, mantendo o
**front-end SPA (React/Vite)** funcionando com **o mínimo de mudanças
possível**.

### O que precisa continuar igual (contrato/funcionalidade)

**Endpoints existentes**

-   `/api/health`
-   `/api/auth/login`
-   `/api/checklists`
-   `/api/settings`
-   `/api/users`
-   `/api/absences`
-   `/api/brasiltec`

**Persistência**

-   MySQL
-   `checklists.data` armazenado em **JSON**
-   `settings` armazenado em **JSON**

**Frontend**

-   Backend deve continuar **servindo o build da SPA**
-   Fallback para `index.html`
-   Suporte a **base path**, ex: `/smartchecklist`

### Mudança obrigatória

Sai:

-   sessão local (`alianca_current_user` no `localStorage`)

Entra:

-   **sessão server-side**
-   **cookie HttpOnly**

------------------------------------------------------------------------

# 1) Decisões Técnicas (Pilares)

## 1.1 Autenticação e Sessão

Sessão baseada em:

-   `$_SESSION`
-   cookie `HttpOnly`

### Fluxo de autenticação

**POST**

`/api/auth/login`

Cria sessão.

**GET**

`/api/auth/me`

Retorna usuário logado (usado no boot da SPA).

**POST**

`/api/auth/logout`

Destrói sessão.

### Benefícios

-   Nenhum dado sensível salvo no browser
-   Sem necessidade de JWT
-   Controle centralizado no servidor

------------------------------------------------------------------------

## 1.2 API compatível com o front atual

O **shape dos dados deve permanecer idêntico**.

Principalmente:

### Checklists

    checklists.data -> JSON
    customData -> JSON (quando existir)

### Settings

    settings -> JSON

Nenhuma normalização ou renomeação de campos.

------------------------------------------------------------------------

## 1.3 Deploy com Base Path

Sistema deve funcionar com:

    BASE_PATH = ""

ou

    BASE_PATH = "/smartchecklist"

Isso afeta:

-   Router
-   Assets
-   SPA fallback

------------------------------------------------------------------------

# 2) Mitigações Embutidas (Riscos já tratados)

## Risco A --- CORS + Cookies

Sessão pode não persistir se CORS estiver incorreto.

### Mitigação Backend

Handler global para:

    OPTIONS *

Resposta:

    HTTP 204

Headers obrigatórios para `/api/*`

    Access-Control-Allow-Origin: <origem exata>
    Access-Control-Allow-Credentials: true
    Access-Control-Allow-Headers: *
    Access-Control-Allow-Methods: *

### Configuração do Cookie

Mesmo domínio:

    SameSite=Lax

Domínios diferentes:

    SameSite=None; Secure

### Mitigação no Frontend

Cliente HTTP deve usar:

``` javascript
credentials: "include"
```

Boot da aplicação:

    GET /api/auth/me

------------------------------------------------------------------------

## Risco B --- Base Path quebrar SPA

Quando rodar em:

    /smartchecklist

assets podem quebrar.

### Mitigação no servidor

Router deve:

1.  Remover `BASE_PATH`
2.  Resolver rota
3.  Se não for `/api/*`

Servir:

    dist/index.html

### Assets

Devem ser servidos de:

    dist/

Respeitando `BASE_PATH`.

### Mitigação no build

Configurar **Vite**:

    base: '/smartchecklist/'

------------------------------------------------------------------------

## Risco C --- JSON no MySQL

Mudança de shape pode quebrar o front silenciosamente.

### Mitigação

Antes da refatoração:

Congelar exemplos reais de payload:

-   `settings`
-   `checklists`
-   evidências base64

No PHP:

-   salvar JSON **sem modificar**
-   roundtrip garantido

```{=html}
<!-- -->
```
    salvar → buscar → comparar

------------------------------------------------------------------------

# 3) Fases do Projeto

------------------------------------------------------------------------

# Fase 0 --- Congelamento do Contrato

Objetivo:

Garantir que a migração **não quebre o frontend**.

### Tarefas

Documentar contrato atual:

-   métodos
-   query params
-   responses

Capturar exemplos reais:

-   checklist operacional com NC + evidência
-   checklist qualidade com bloco Brasiltec
-   checklist sucata com 4 evidências
-   settings completo

Definir deploy:

-   mesmo domínio
-   domínio separado

Decidir arquitetura:

1.  PHP serve SPA
2.  Nginx/Apache serve SPA e PHP só API

### Entregáveis

Documento:

    Contrato da API

Pasta:

    samples/

com JSONs reais.

------------------------------------------------------------------------

# Fase 1 --- Esqueleto PHP

Objetivo:

Criar **base sólida sem framework**.

### Estrutura

    public/
      index.php

    src/
      Config.php
      DB.php
      Response.php
      Auth.php

      Controllers/
      Repositories/

### Responsabilidades

**index.php**

Front controller + router

**Config.php**

env + BASE_PATH

**DB.php**

PDO connection

**Response.php**

helpers JSON/status

**Auth.php**

-   login
-   me
-   logout
-   middleware

### Mitigações já aplicadas

-   CORS
-   handler OPTIONS
-   sessão PHP
-   suporte BASE_PATH

### Entregáveis

Endpoint funcional:

    GET /api/health

Sessão funcionando localmente.

------------------------------------------------------------------------

# Fase 2 --- Banco MySQL

Objetivo:

Espelhar o comportamento atual do backend Node.

### Tarefas

Exportar schema real.

Criar:

    migrations/001_init.sql

Seed inicial:

    ADMIN / ADMIN
    role: MANAGER

### Entregáveis

Banco reproduzível.

Seed funcionando.

------------------------------------------------------------------------

# Fase 3 --- Autenticação

Objetivo:

Eliminar uso de `localStorage`.

### Backend

Endpoints:

    POST /api/auth/login
    GET /api/auth/me
    POST /api/auth/logout

### Frontend

Remover:

    alianca_current_user

Boot da SPA:

    GET /api/auth/me

HTTP client:

    credentials: include

### Entregáveis

-   Refresh não derruba login
-   Aba anônima não herda sessão

------------------------------------------------------------------------

# Fase 4 --- Migração dos Endpoints

Ordem recomendada.

## Settings

    GET /api/settings?managerId=...
    POST /api/settings

## Users

    GET /api/users?managerId=...
    POST /api/users
    PUT /api/users/:id
    DELETE /api/users/:id

## Checklists

    GET /api/checklists?managerId=...
    POST /api/checklists

(upsert por `id`)

## Absences

    POST /api/absences
    DELETE /api/absences/:id

## Brasiltec

    GET /api/brasiltec?managerId=...
    POST /api/brasiltec
    DELETE /api/brasiltec/:id

### Mitigação de JSON

Cada endpoint só fecha após:

    salvar
    buscar
    comparar com samples

### Entregáveis

Aplicação navegável.

------------------------------------------------------------------------

# Fase 5 --- Servir SPA pelo PHP

Objetivo:

Replicar comportamento atual do Node.

### Tarefas

Servir:

    dist/

Fallback:

    index.html

Garantir MIME correto para:

    js
    css
    assets

(evita erro `module script text/html`)

### Entregáveis

Abrir:

    /smartchecklist

SPA funcional.

Acesso direto a rotas:

    /smartchecklist/history

funciona.

------------------------------------------------------------------------

# Fase 6 --- Ajustes Colaterais

Corrigir inconsistências existentes.

Exemplos detectados:

-   assinatura inconsistente `getManagerTargetPhone`
-   método inexistente `validateBrasiltecUser`
-   uso sem `await` carregando Brasiltec

Apenas correções necessárias para estabilidade.

------------------------------------------------------------------------

# Fase 7 --- Go Live

Checklist final.

### Fluxos testados

Login:

-   manager
-   operator

Operações:

-   criar checklist operacional
-   criar checklist qualidade
-   criar checklist sucata

Evidências:

-   upload base64 funcionando

Sistema:

-   dashboard
-   histórico
-   validação

Módulos:

-   settings
-   users
-   absences
-   brasiltec

Operacional:

-   logs de erro ativados no PHP
-   Node desativado (ou mantido temporariamente como fallback)

------------------------------------------------------------------------

# 4) Critérios de Sucesso

Critérios objetivos de validação.

-   Nenhum dado sensível salvo em `localStorage`
-   Endpoints existentes continuam funcionando
-   Sessão persiste após refresh
-   Não é necessário JWT
-   SPA funciona em `/`
-   SPA funciona em `/smartchecklist`
-   JSON de `checklists` não muda de formato
-   JSON de `settings` não muda de formato
