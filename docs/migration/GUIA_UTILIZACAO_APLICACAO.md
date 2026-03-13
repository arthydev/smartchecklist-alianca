# Guia de Utilizacao da Aplicacao

Este documento descreve o fluxo de uso da aplicacao SmartChecklist do ponto de vista do usuario.

## 1. Objetivo da aplicacao

A aplicacao foi criada para registrar e controlar checklists operacionais em tres frentes principais:

- Equipamentos
- Qualidade / Logistica
- Sucata

O sistema controla autenticacao, preenchimento de checklists, historico, validacao tecnica e cadastros operacionais de apoio.

## 2. Perfis e areas

O comportamento da aplicacao depende de dois fatores:

- perfil do usuario
- area do usuario

### Perfis

- `MANAGER`
  - acesso a dashboard
  - acesso a configuracoes
  - acesso a validacao tecnica
  - pode gerenciar usuarios e cadastros operacionais

- `OPERATOR`
  - foco principal em executar checklists
  - acesso ao historico
  - nao acessa validacao tecnica nem configuracoes gerais

### Areas

- `PRODUCAO`
- `MATERIAIS`
- `LOGISTICA`
- `QUALIDADE`
- `SUCATA`

A area define qual formulario sera exibido em `Nova Inspecao`.

## 3. Acesso ao sistema

### Login

O acesso e feito com:

- usuario
- senha

Ao fazer login com sucesso:

- a sessao fica no backend por cookie `HttpOnly`
- o frontend recupera o usuario autenticado via `/api/auth/me`

### Redirecionamento apos login

- `MANAGER`:
  - vai para o `Painel de Controle`
- `OPERATOR`:
  - vai para `Nova Inspecao`

### Logout

Ao sair:

- a sessao e encerrada no backend
- o usuario volta para a tela de login

## 4. Menu principal

As opcoes do menu mudam conforme perfil e area.

### Telas principais

- `Painel de Controle`
- `Nova Inspecao`
- `Historico`
- `Validacao Tecnica`
- `Clientes de Sucata`
- `Configuracoes`

## 5. Painel de Controle

Disponivel para usuarios `MANAGER`.

O dashboard apresenta:

- indicadores gerais por area
- situacao dos checklists
- volumes, pendencias e estados de aprovacao
- atalhos para fluxos de acompanhamento

Uso pratico:

- acompanhar checklists aprovados, pendentes e bloqueados
- identificar operadores e ativos com pendencias
- acompanhar indicadores especificos da area de sucata

## 6. Nova Inspecao

Esta e a tela principal para execucao dos checklists.

O formulario exibido depende da area do usuario logado.

### 6.1 Checklist de Equipamentos

Usado por areas operacionais que nao sao `QUALIDADE` nem `SUCATA`.

#### Fluxo

1. selecionar o equipamento
2. selecionar o turno
3. responder cada item como:
   - `C`
   - `NC`
4. se existir `NC`, preencher observacoes
5. finalizar

#### Regras importantes

- o sistema impede checklist duplicado do mesmo ativo no mesmo turno e dia
- bloqueios podem ocorrer por:
  - manutencao
  - ausencia
  - checklist anterior pendente ou reprovado

#### Evidencias para `NC`

- `PRODUCAO`
  - nao precisa anexar evidencias
  - precisa preencher observacoes
- demais areas
  - precisam anexar evidencias
  - precisam preencher observacoes

#### Resultado do checklist

- sem `NC`:
  - status `APPROVED`
- com `NC`:
  - status `PENDING`
  - fica disponivel para validacao tecnica

### 6.2 Checklist de Qualidade / Logistica

Usado para usuarios da area `QUALIDADE`.

#### Fluxo

1. preencher dados iniciais da operacao
2. responder itens de inspecao estrutural e de carga
3. anexar evidencias quando houver nao conformidade
4. quando aplicavel, executar validacao Brasiltec
5. concluir o checklist

#### Validacao Brasiltec

Quando o fluxo exigir validacao por colaborador Brasiltec:

- o usuario pode selecionar um colaborador Brasiltec cadastrado
- esses usuarios ficam disponiveis para a area `QUALIDADE`

#### Resultado

- o checklist e salvo com os dados tecnicos e evidencias informadas
- campos especificos ficam armazenados em `customData`

### 6.3 Checklist de Sucata

Usado para usuarios da area `SUCATA`.

#### Fluxo

1. preencher os dados da expedicao
2. informar os dados de transporte
3. selecionar o cliente
4. anexar as evidencias obrigatorias
5. gerar o PDF da ficha
6. revisar o PDF em um modal de confirmacao
7. confirmar

#### Evidencias obrigatorias da sucata

O checklist de sucata exige as evidencias definidas no fluxo atual, incluindo:

- imagens operacionais do carregamento
- ticket da balanca

O ticket da balanca aceita:

- imagem
- PDF

#### PDF da sucata

Antes de concluir:

- o sistema gera um PDF da ficha
- exibe o PDF para conferencia
- apos confirmacao:
  - salva o checklist
  - baixa o PDF
  - abre o `mailto`

#### Email da sucata

Os destinatarios do email sao definidos pelo cliente selecionado.

Fluxo atual:

- o usuario escolhe um cliente
- o sistema localiza os destinatarios vinculados a esse cliente
- o `mailto` abre com o campo `Para` preenchido

Se o cliente nao tiver destinatarios:

- o sistema avisa
- ainda permite continuar
- o `mailto` abre sem destinatario preenchido

## 7. Clientes de Sucata

Tela especifica da area `SUCATA`.

Essa tela foi separada de `Configuracoes`.

### Objetivo

Gerenciar:

- clientes de sucata
- destinatarios de email por cliente

### Operacoes disponiveis

- criar cliente
- editar nome do cliente
- remover cliente
- adicionar destinatarios
- remover destinatarios

### Regra de uso

Cada cliente possui sua propria lista de destinatarios.

Esse cadastro e usado diretamente no checklist de sucata para preencher o `mailto`.

## 8. Historico

Tela disponivel para consulta dos checklists ja registrados.

### Recursos principais

- busca textual
- filtros por data
- filtros por horario
- visualizacao detalhada em modal

### Gestor

O gestor pode consultar:

- registros proprios
- registros da equipe

### Detalhes do checklist

No modal do historico e possivel visualizar:

- dados principais do checklist
- respostas dos itens
- observacoes
- evidencias

No caso de checklist de sucata:

- tambem e possivel gerar novamente o PDF da ficha a partir do registro salvo

## 9. Validacao Tecnica

Tela disponivel para `MANAGER`, exceto no fluxo de sucata.

### Objetivo

Permitir que o gestor trate checklists com pendencia tecnica.

### Fluxo

1. abrir a lista de checklists `PENDING`
2. analisar o checklist
3. decidir:
   - `APPROVED`
   - `REJECTED`

### Efeito da validacao

- `APPROVED`
  - libera o fluxo
- `REJECTED`
  - mantem o bloqueio operacional

## 10. Configuracoes

Tela disponivel para `MANAGER`.

### Objetivo

Centralizar cadastros e parametros operacionais do sistema.

### Recursos principais atuais

- cadastro de itens de inspeção
- cadastro e gestao de equipamentos
- cadastro e gestao de usuarios
- configuracao de contato de alerta
- gestao de ausencias e manutencoes
- gestao Brasiltec

### Observacao importante

Clientes e destinatarios de sucata nao ficam mais nesta tela.

Esse cadastro agora fica em:

- `Clientes de Sucata`

## 11. Cadastro de usuarios

Feito por usuario `MANAGER`.

Cada usuario cadastrado recebe:

- nome
- usuario
- senha
- perfil
- area

O sistema usa o contexto do gestor que fez o cadastro para escopo de acesso operacional.

## 12. Cadastro de equipamentos

Os equipamentos cadastrados ficam disponiveis para o checklist operacional.

Campos tipicos do cadastro:

- codigo / patrimonio
- descricao
- tipo de uso
- categoria

Esses equipamentos sao usados no passo inicial do checklist de equipamentos.

## 13. Itens de inspecao

Os itens de inspecao usados no checklist operacional sao cadastrados pela gestao.

Esses itens definem:

- quais perguntas aparecerao no checklist
- em qual contexto operacional serao usadas

## 14. Regras praticas importantes para o usuario

### Checklist com bloqueio

O sistema pode impedir nova inspecao quando existir:

- ausencia ativa
- manutencao ativa
- checklist anterior pendente
- checklist anterior reprovado

### Sessao

- nao e necessario guardar usuario manualmente no navegador
- a autenticacao depende da sessao do backend

### Evidencias

- equipamentos:
  - obrigatorias para `NC` fora da `PRODUCAO`
- qualidade / logistica:
  - obrigatorias quando a nao conformidade exigir
- sucata:
  - obrigatorias conforme o fluxo do formulario

## 15. Fluxos resumidos por tipo de usuario

### Operador de Equipamentos

1. fazer login
2. acessar `Nova Inspecao`
3. selecionar ativo e turno
4. responder itens
5. preencher observacoes se houver `NC`
6. anexar evidencias se a area exigir
7. concluir
8. consultar em `Historico` se necessario

### Operador de Qualidade

1. fazer login
2. acessar `Nova Inspecao`
3. preencher checklist de expedicao / logistica
4. anexar evidencias quando exigido
5. selecionar Brasiltec quando necessario
6. concluir
7. consultar em `Historico`

### Operador de Sucata

1. fazer login
2. acessar `Nova Inspecao`
3. preencher dados da operacao
4. selecionar cliente
5. anexar evidencias
6. revisar PDF gerado
7. confirmar
8. baixar PDF
9. enviar email pelo cliente local

### Gestor

1. fazer login
2. acompanhar o dashboard
3. consultar historico
4. executar validacao tecnica quando houver pendencias
5. manter cadastros em `Configuracoes`
6. se for da area `SUCATA`, manter clientes e destinatarios em `Clientes de Sucata`

## 16. Resultado esperado de uso

Ao final do fluxo operacional, o sistema permite:

- registrar checklists com rastreabilidade
- manter historico consultavel
- controlar pendencias tecnicas
- organizar operacao por area
- padronizar o fluxo de expedicao de sucata com PDF e email

## 17. Observacoes finais

- O uso correto da aplicacao depende de cadastros bem mantidos:
  - usuarios
  - equipamentos
  - itens de inspecao
  - clientes de sucata
  - destinatarios por cliente
- Em ambiente operacional, o usuario deve sempre revisar:
  - equipamento selecionado
  - turno
  - observacoes
  - evidencias anexadas
  - cliente de sucata escolhido
