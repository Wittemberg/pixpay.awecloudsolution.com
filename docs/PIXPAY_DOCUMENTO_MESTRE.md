# PIXPAY --- Documento Mestre de Especificação

**Projeto:** PIXPAY\
**Domínio:** `pixpay.awecloudsolution.com`\
**Versão do documento:** 0.1\
**Status:** Especificação inicial / base arquitetural\
**Provider inicial:** LofyPay\
**Interface de IA:** Hermes Agent via MCP\
**Objetivo inicial:** uso privado pelos três sócios, com arquitetura
preparada para expansão.

------------------------------------------------------------------------

## 1. Visão do produto

O PIXPAY será uma plataforma multi-tenant de recebimento via PIX focada
em simplicidade operacional.

Cada tenant poderá conectar sua própria conta/credenciais da LofyPay e
gerar cobranças PIX independentes. O PIXPAY atuará como camada de
aplicação, abstraindo a complexidade do provedor financeiro.

O sistema terá duas interfaces principais:

1.  **Web:** painel simples para configuração, geração de PIX, consulta
    e histórico.
2.  **IA conversacional:** integração com Hermes Agent, inicialmente
    acessado pelo WhatsApp, permitindo criar e consultar cobranças por
    linguagem natural.

O PIXPAY não deverá depender conceitualmente da LofyPay. LofyPay será o
primeiro `PaymentProvider`, permitindo a inclusão futura de outros PSPs
sem alteração do contrato público do PIXPAY.

------------------------------------------------------------------------

## 2. Princípios do projeto

### 2.1 Simplicidade

O fluxo principal deve ser:

`Entrar → informar valor → gerar PIX → receber confirmação`.

A interface não deve reproduzir a complexidade de um ERP ou internet
banking.

### 2.2 Multi-tenant desde o início

Dados, credenciais, pagamentos e eventos devem sempre pertencer
explicitamente a um tenant.

Nenhum tenant poderá consultar ou operar dados de outro tenant.

### 2.3 Provider-agnostic

O domínio interno deve utilizar conceitos genéricos:

-   `Payment`
-   `PaymentAccount`
-   `PaymentProvider`
-   `PaymentEvent`
-   `Tenant`

Evitar conceitos de domínio como `LofyPayPayment` ou
`LofyPayTransaction`.

### 2.4 IA não controla diretamente o provedor financeiro

Fluxo obrigatório:

`Hermes → PIXPAY MCP → PIXPAY API → Payment Core → Provider → LofyPay`

O Hermes nunca receberá credenciais da LofyPay.

### 2.5 Backend como autoridade

A IA interpreta intenção. O backend:

-   identifica o tenant;
-   valida permissões;
-   valida valores;
-   executa a operação;
-   registra auditoria;
-   determina o que pode ou não ser feito.

------------------------------------------------------------------------

## 3. Conceito de privacidade

O PIXPAY poderá reduzir a exposição pública de dados pessoais do
recebedor dentro da experiência criada pela plataforma.

Entretanto, o produto **não deve prometer anonimato financeiro**.
Transações PIX continuam sujeitas à identificação, registros do
PSP/instituições financeiras, regras do arranjo PIX e obrigações
regulatórias aplicáveis.

Externamente, preferir termos como:

-   recebimento simplificado;
-   página privada/pública de pagamento;
-   PIX sem divulgação da chave pessoal;
-   proteção de dados de contato.

Evitar comercialmente a promessa "PIX anônimo".

------------------------------------------------------------------------

## 4. Arquitetura lógica

``` text
                         WHATSAPP
                            |
                            v
                      HERMES AGENT
                            |
                           MCP
                            |
                            v
                       PIXPAY MCP
                            |
                           REST
                            |
                            v
+------------+       +-------------------+
|  FRONTEND  | ----> |    PIXPAY API     |
+------------+       +-------------------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
        POSTGRESQL                  PAYMENT CORE
                                          |
                                  PaymentProvider
                                          |
                                          v
                                LofyPayProvider
                                          |
                                          v
                                       LofyPay
```

Componentes adicionais:

``` text
Redis
  |
  +-- filas
  +-- locks
  +-- cache
  +-- idempotência temporária

PIXPAY Worker
  |
  +-- processamento de webhooks
  +-- eventos
  +-- notificações
  +-- tarefas assíncronas
```

------------------------------------------------------------------------

## 5. Stack sugerida

### Infraestrutura

-   Ubuntu 24.04 LTS
-   Docker
-   Docker Swarm
-   Portainer
-   Traefik
-   PostgreSQL
-   Redis

### Backend

-   Node.js
-   TypeScript
-   NestJS
-   Prisma ORM
-   PostgreSQL
-   Redis
-   BullMQ

### Frontend

-   Next.js
-   React
-   TypeScript

### MCP

-   TypeScript
-   MCP SDK
-   autenticação por Service Account/API Token

### Produção

Domínio principal:

`https://pixpay.awecloudsolution.com`

Possíveis endpoints:

``` text
https://pixpay.awecloudsolution.com
https://pixpay.awecloudsolution.com/api/v1/*
https://pixpay.awecloudsolution.com/mcp
```

A decisão de usar subdomínios separados (`api.` / `mcp.`) poderá ser
tomada posteriormente.

------------------------------------------------------------------------

## 6. Estrutura sugerida do monorepo

``` text
pixpay/
|
+-- apps/
|   +-- web/
|   +-- api/
|   +-- worker/
|   +-- mcp/
|
+-- packages/
|   +-- database/
|   +-- payment-core/
|   +-- providers/
|   |   +-- lofypay/
|   +-- contracts/
|   +-- auth/
|   +-- events/
|   +-- shared/
|   +-- config/
|
+-- infra/
|   +-- docker/
|   +-- traefik/
|   +-- portainer/
|
+-- docs/
|   +-- architecture/
|   +-- api/
|   +-- mcp/
|   +-- providers/
|
+-- .env.example
+-- docker-compose.yml
+-- README.md
```

------------------------------------------------------------------------

## 7. Modelo de identidade e tenancy

### Users

Pessoa que acessa o PIXPAY.

### Tenants

Entidade lógica proprietária dos pagamentos e das contas de recebimento.

### TenantUsers

Relacionamento usuário/tenant.

Roles iniciais:

``` text
OWNER
ADMIN
VIEWER
```

Inicialmente poderá existir:

`1 usuário → 1 tenant`

Mas o banco não deverá impor essa limitação.

Futuramente:

``` text
Tenant WRTEC
|
+-- Marcel       OWNER
+-- Operador 1   ADMIN
+-- Contador     VIEWER
```

------------------------------------------------------------------------

## 8. Payment Accounts

Cada tenant poderá possuir uma ou mais contas de pagamento.

Estrutura conceitual:

``` text
PaymentAccount
|
+-- tenant
+-- provider
+-- provider_account_id
+-- encrypted_credentials
+-- environment
+-- status
+-- created_at
+-- updated_at
```

Provider inicial:

`LOFYPAY`

Ambientes:

``` text
SANDBOX
PRODUCTION
```

Estados:

``` text
PENDING
ACTIVE
INVALID
DISABLED
```

------------------------------------------------------------------------

## 9. Credenciais LofyPay

A credencial deverá:

-   ser recebida somente via conexão HTTPS;
-   nunca ser registrada em logs;
-   nunca ser retornada novamente integralmente ao frontend;
-   ser criptografada em repouso;
-   ser descriptografada apenas pelo componente autorizado;
-   ser mascarada na interface;
-   possuir auditoria de criação/alteração.

Exemplo visual:

``` text
LofyPay

Status: Conectado

Secret Key:
sk_live_****************93ab

[ Testar conexão ]
[ Substituir credencial ]
```

O Hermes não possuirá ferramenta para ler ou alterar a credencial.

------------------------------------------------------------------------

## 10. PaymentProvider

Contrato conceitual:

``` text
PaymentProvider

createPayment()
getPayment()
getPaymentStatus()
normalizePayment()
validateCredentials()
processWebhook()
```

Implementação inicial:

``` text
PaymentProvider
      |
      +-- LofyPayProvider
```

Futuro:

``` text
+-- EfiProvider
+-- MercadoPagoProvider
+-- InterProvider
+-- AsaasProvider
```

------------------------------------------------------------------------

## 11. Pagamentos

Tabela conceitual:

``` text
payments

id
public_id
tenant_id
payment_account_id

provider
provider_transaction_id

amount
description
external_reference

status

pix_copy_paste
qr_code_reference

expires_at
paid_at

metadata JSONB

created_at
updated_at
```

`public_id` deverá ser não sequencial e seguro para exposição externa.

Exemplo:

`pay_7HF82KD92`

------------------------------------------------------------------------

## 12. Estados internos de pagamento

Estados canônicos PIXPAY:

``` text
CREATED
PENDING
PAID
EXPIRED
CANCELLED
REFUNDED
FAILED
DISPUTED
```

Estados específicos do provider deverão ser traduzidos.

Exemplo:

``` text
LofyPay PAID_OUT
        |
        v
PIXPAY PAID
```

O frontend, MCP e integrações externas trabalharão somente com os
estados PIXPAY.

------------------------------------------------------------------------

## 13. Payment Events

Todo evento importante deverá ser preservado.

``` text
payment_events

id
tenant_id
payment_id

event_type
provider
provider_event_id

payload
created_at
```

Eventos internos:

``` text
payment.created
payment.pending
payment.paid
payment.expired
payment.cancelled
payment.refunded
payment.failed
payment.disputed
```

Nunca depender apenas do estado atual da tabela `payments`.

O histórico deverá permitir reconstruir a evolução da cobrança.

------------------------------------------------------------------------

## 14. Webhooks

Endpoint inicial:

`POST /api/v1/webhooks/lofypay`

Fluxo:

``` text
LofyPay
   |
   v
Webhook endpoint
   |
   +--> validar
   |
   +--> verificar idempotência
   |
   +--> persistir evento bruto
   |
   +--> responder rapidamente
   |
   v
Fila
   |
   v
Worker
   |
   +--> confirmar/normalizar estado
   +--> atualizar Payment
   +--> criar PaymentEvent
   +--> publicar evento interno
   +--> notificar Hermes
```

A aplicação deverá tolerar:

-   eventos duplicados;
-   eventos fora de ordem;
-   retry;
-   indisponibilidade temporária;
-   timeout;
-   eventos inválidos.

------------------------------------------------------------------------

## 15. Idempotência

Operações financeiras precisam ser idempotentes.

Aplicar idempotência em:

-   criação de pagamentos quando possível;
-   webhooks;
-   eventos;
-   notificações;
-   jobs.

Nunca assumir que uma chamada HTTP ocorreu apenas uma vez.

------------------------------------------------------------------------

## 16. API REST inicial

### Autenticação

``` text
POST /api/v1/auth/login
GET  /api/v1/me
```

### Payment Accounts

``` text
GET  /api/v1/payment-accounts
POST /api/v1/payment-accounts
POST /api/v1/payment-accounts/test
```

### Payments

``` text
POST /api/v1/payments
GET  /api/v1/payments
GET  /api/v1/payments/{id}
GET  /api/v1/payments/{id}/status
GET  /api/v1/payments/summary
```

### Provider Webhooks

``` text
POST /api/v1/webhooks/lofypay
```

------------------------------------------------------------------------

## 17. Criar PIX

Requisição PIXPAY:

``` json
{
  "amount": 350.00,
  "description": "Manutenção servidor",
  "expires_in": 1800,
  "metadata": {
    "customer": "João",
    "origin": "web"
  }
}
```

Resposta normalizada:

``` json
{
  "id": "pay_7HF82KD92",
  "status": "PENDING",
  "amount": 350.00,
  "description": "Manutenção servidor",
  "pix": {
    "copy_paste": "00020126...",
    "qr_code": "..."
  },
  "expires_at": "2026-09-20T00:30:00-03:00"
}
```

A resposta bruta da LofyPay não deverá constituir o contrato público do
PIXPAY.

------------------------------------------------------------------------

## 18. Dashboard

Tela inicial minimalista.

Informações:

-   recebido hoje;
-   quantidade de pagamentos hoje;
-   pendentes;
-   últimos recebimentos;
-   botão "Gerar PIX".

Menu inicial:

``` text
Início
PIX
Histórico
LofyPay
Configurações
```

O objetivo é reduzir ao máximo a quantidade de passos para receber.

------------------------------------------------------------------------

## 19. Fluxo web para gerar PIX

``` text
Login
  |
  v
Dashboard
  |
  v
Gerar PIX
  |
  +-- Valor
  +-- Descrição opcional
  +-- Cliente opcional
  +-- Expiração
  |
  v
PIXPAY API
  |
  v
Payment Core
  |
  v
LofyPayProvider
  |
  v
LofyPay
  |
  v
QR Code + Copia e Cola
```

Após pagamento:

``` text
Webhook
  |
  v
PIXPAY
  |
  v
PAID
  |
  +--> Dashboard
  +--> Histórico
  +--> Hermes
```

------------------------------------------------------------------------

## 20. Hermes Agent

O Hermes será uma interface oficial do PIXPAY, não apenas uma integração
acessória.

``` text
             PIXPAY
          /     |      \
        WEB    REST     MCP
                        |
                        v
                     HERMES
                        |
                        v
                    WhatsApp
```

------------------------------------------------------------------------

## 21. Autenticação Hermes → PIXPAY

Cada integração Hermes deverá utilizar uma Service Account vinculada a
um tenant.

Exemplo:

``` text
service_account:
hermes_marcel

tenant:
tenant_marcel
```

Token conceitual:

`wpk_live_************************`

O tenant será derivado da credencial.

**Nunca aceitar `tenant_id` fornecido livremente pelo LLM para definir a
conta financeira.**

Fluxo:

``` text
Hermes
   |
Bearer Token
   |
   v
PIXPAY
   |
   +--> identifica Service Account
   +--> identifica Tenant
   +--> aplica permissões
```

------------------------------------------------------------------------

## 22. MCP inicial

O primeiro servidor MCP deverá possuir apenas ferramentas de baixo
risco.

### pix_create

Cria cobrança.

Parâmetros:

``` text
amount        obrigatório
description   opcional
customer      opcional
expiration    opcional
```

Exemplo:

Usuário:

`Gera um PIX de 480 para o Carlos referente ao servidor.`

Hermes:

``` text
pix_create(
  amount=480,
  customer="Carlos",
  description="Servidor"
)
```

------------------------------------------------------------------------

### pix_get

Consulta uma cobrança.

Busca possível por:

-   payment ID;
-   valor;
-   cliente;
-   data;
-   descrição.

Exemplo:

`O PIX de 480 do Carlos caiu?`

------------------------------------------------------------------------

### pix_list

Lista cobranças/recebimentos.

Filtros:

``` text
status
date_from
date_to
customer
limit
```

Exemplos:

-   "Mostre os PIX de hoje."
-   "Quais estão pendentes?"
-   "Me mostre os últimos dez recebimentos."

------------------------------------------------------------------------

### pix_summary

Agregações financeiras.

Filtros:

``` text
date_from
date_to
customer
status
```

Exemplos:

-   "Quanto recebi hoje?"
-   "Quanto entrou essa semana?"
-   "Quanto recebi em setembro?"
-   "Quanto recebi do Carlos?"

------------------------------------------------------------------------

## 23. Operações proibidas no MCP inicial

O MCP inicial **não terá ferramentas para**:

``` text
cashout
transferir dinheiro
alterar credenciais
ler Secret Key
excluir pagamentos
alterar tenant
alterar saldo
administrar usuários
alterar webhooks financeiros
```

A ausência dessas ferramentas é uma camada deliberada de segurança.

------------------------------------------------------------------------

## 24. Fluxo WhatsApp → PIX

``` text
Usuário
  |
  | "Gera um PIX de 350 para João"
  v
WhatsApp
  |
  v
Hermes
  |
  v
pix_create
  |
  v
PIXPAY MCP
  |
  v
PIXPAY API
  |
  v
Payment Core
  |
  v
LofyPay
  |
  v
PIXPAY
  |
  v
Hermes
  |
  v
WhatsApp
```

Resposta:

``` text
PIX de R$ 350,00 criado.

João
Manutenção do servidor

[QR CODE]

Copia e cola:
000201...
```

------------------------------------------------------------------------

## 25. Notificação de pagamento via Hermes

Fluxo inverso:

``` text
LofyPay
   |
   v
PIXPAY Webhook
   |
   v
Worker
   |
   v
payment.paid
   |
   v
Notification Service
   |
   v
Hermes
   |
   v
WhatsApp
```

Exemplo:

``` text
💰 PIX recebido

R$ 350,00
João
Manutenção do servidor

Pago às 23:48.
```

------------------------------------------------------------------------

## 26. Event Bus

Mesmo no MVP deverá existir uma abstração de eventos internos.

Produtores:

-   Payment Core
-   Provider Webhooks
-   Worker

Consumidores futuros:

-   Hermes Notification
-   e-mail;
-   webhooks de terceiros;
-   ERP;
-   analytics;
-   antifraude;
-   automações.

Exemplo:

``` text
payment.paid
      |
      +--> Hermes
      +--> Dashboard
      +--> webhook externo [futuro]
      +--> ERP [futuro]
```

------------------------------------------------------------------------

## 27. Página pública --- Fase posterior

Formato:

`https://pixpay.awecloudsolution.com/{username}`

Exemplo conceitual:

``` text
Enviar pagamento para @usuario

Valor:
R$ [____________]

[ GERAR PIX ]
```

O valor informado gera um PIX dinâmico na conta financeira daquele
tenant.

Também prever links individuais:

`https://pixpay.awecloudsolution.com/p/{public_id}`

Esses recursos não precisam fazer parte do primeiro MVP, mas a
arquitetura deve permitir sua inclusão.

------------------------------------------------------------------------

## 28. Metadata

`payments.metadata` será importante para IA e integrações.

Exemplo:

``` json
{
  "customer": "Carlos",
  "service": "Manutenção servidor",
  "origin": "whatsapp",
  "created_by": "hermes"
}
```

Campos estruturados essenciais não devem depender exclusivamente de
metadata.

------------------------------------------------------------------------

## 29. Auditoria

Registrar operações sensíveis:

``` text
audit_logs

id
tenant_id
actor_type
actor_id
action
resource_type
resource_id
ip
user_agent
metadata
created_at
```

`actor_type`:

``` text
USER
SERVICE_ACCOUNT
SYSTEM
WEBHOOK
```

Exemplos:

``` text
PAYMENT_CREATED
PAYMENT_ACCOUNT_CREATED
PAYMENT_ACCOUNT_UPDATED
CREDENTIAL_TESTED
LOGIN_SUCCESS
LOGIN_FAILED
MCP_TOOL_EXECUTED
```

Nunca armazenar secrets em auditoria.

------------------------------------------------------------------------

## 30. Segurança

Requisitos mínimos:

-   HTTPS obrigatório;
-   secrets criptografados em repouso;
-   nenhuma Secret Key em logs;
-   proteção contra SQL Injection;
-   validação forte de DTOs;
-   rate limiting;
-   proteção contra brute force;
-   segregação rigorosa por tenant;
-   tokens com escopo;
-   rotação de credenciais;
-   headers de segurança;
-   CORS restritivo;
-   cookies seguros quando aplicável;
-   backups;
-   auditoria;
-   princípio do menor privilégio.

Toda consulta multi-tenant deverá possuir isolamento por tenant no
backend.

Não confiar em filtros vindos exclusivamente do frontend.

------------------------------------------------------------------------

## 31. Segurança específica para IA

Princípio:

> A IA interpreta; o backend autoriza.

O Hermes não será autoridade financeira.

Riscos a considerar:

-   prompt injection;
-   comandos ambíguos;
-   contexto incorreto;
-   repetição de ferramenta;
-   replay;
-   alucinação;
-   vazamento de informação entre tenants.

Mitigações:

-   ferramentas pequenas e específicas;
-   schemas rígidos;
-   idempotência;
-   autenticação por Service Account;
-   escopos;
-   nenhuma credencial financeira no contexto do modelo;
-   limites de valor configuráveis;
-   auditoria de cada tool call.

------------------------------------------------------------------------

## 32. Cashout

**Não implementar no MVP.**

Mesmo que o provider suporte saída de recursos, PIXPAY inicialmente será
focado em **recebimento**.

Não disponibilizar ferramenta MCP de transferência.

Qualquer futura implementação de cashout deverá possuir projeto de
segurança separado, incluindo confirmação forte e políticas de
autorização.

------------------------------------------------------------------------

## 33. Observabilidade

Registrar:

-   request ID interno;
-   request ID do provider quando disponível;
-   latência;
-   status HTTP;
-   provider;
-   payment public ID;
-   tenant ID interno;
-   job ID;
-   webhook event ID.

Nunca registrar:

-   Secret Key completa;
-   tokens;
-   senhas;
-   dados sensíveis desnecessários.

Métricas futuras:

``` text
payments_created_total
payments_paid_total
payments_failed_total
payment_creation_latency
webhook_processing_latency
provider_errors_total
mcp_tool_calls_total
```

------------------------------------------------------------------------

## 34. Filas e Workers

BullMQ/Redis poderá tratar:

``` text
webhook.process
payment.reconcile
notification.hermes
event.dispatch
provider.retry
```

Requisições HTTP não deverão ficar bloqueadas aguardando tarefas que
possam ser processadas assincronamente.

------------------------------------------------------------------------

## 35. Reconciliação

Além de webhooks, prever rotina periódica de reconciliação.

Objetivo:

``` text
PENDING no PIXPAY
      |
      v
consultar Provider
      |
      +--> continua PENDING
      |
      +--> PAID
      |
      +--> EXPIRED
```

Isso reduz dependência absoluta do webhook.

------------------------------------------------------------------------

## 36. Notificações

Criar abstração:

``` text
NotificationProvider
       |
       +-- HermesProvider
       +-- EmailProvider      [futuro]
       +-- WebhookProvider    [futuro]
```

O Payment Core não deverá conhecer WhatsApp diretamente.

------------------------------------------------------------------------

## 37. Roadmap

### Fase 0 --- Fundação

-   repositório/monorepo;
-   padrões do projeto;
-   Docker;
-   PostgreSQL;
-   Redis;
-   Traefik;
-   API;
-   frontend;
-   worker;
-   MCP skeleton;
-   CI/CD;
-   Portainer;
-   ambientes e secrets.

### Fase 1 --- Multi-tenant

-   users;
-   tenants;
-   tenant_users;
-   login;
-   roles;
-   autorização;
-   isolamento de tenant;
-   audit log.

### Fase 2 --- LofyPay

-   PaymentProvider;
-   LofyPayProvider;
-   cadastro de credencial;
-   criptografia;
-   teste de credencial;
-   sandbox;
-   produção;
-   geração de PIX;
-   consulta de status;
-   normalização.

### Fase 3 --- Payments

-   payments;
-   payment_events;
-   webhook_events;
-   estados canônicos;
-   idempotência;
-   webhooks;
-   worker;
-   reconciliação;
-   histórico;
-   dashboard.

### Fase 4 --- Hermes/MCP

-   Service Accounts;
-   tokens;
-   scopes;
-   MCP Server;
-   `pix_create`;
-   `pix_get`;
-   `pix_list`;
-   `pix_summary`;
-   auditoria MCP.

### Fase 5 --- WhatsApp

-   geração de PIX por linguagem natural;
-   consulta;
-   resumo;
-   confirmação de recebimento;
-   notificações automáticas.

### Fase 6 --- Página pública

-   username/slug;
-   página de recebimento;
-   valor livre;
-   links de cobrança;
-   QR Code;
-   expiração;
-   proteção antiabuso.

### Fase 7 --- Inteligência e automação

-   consultas financeiras naturais;
-   relatórios;
-   lembretes;
-   cobranças;
-   automações condicionais;
-   integrações externas.

### Fase 8 --- Expansão

-   API pública;
-   webhooks para tenants;
-   ERP;
-   PDV;
-   novos providers;
-   regras comerciais;
-   split, se validado técnica/comercialmente;
-   analytics avançado.

------------------------------------------------------------------------

## 38. MVP obrigatório

O MVP estará concluído quando for possível:

1.  criar usuário/tenant;
2.  entrar no painel;
3.  cadastrar credencial LofyPay;
4.  validar conexão;
5.  gerar PIX;
6.  visualizar QR Code/copia e cola;
7.  persistir a cobrança;
8.  receber/processar confirmação;
9.  marcar pagamento como pago;
10. consultar histórico;
11. consultar resumo;
12. conectar Hermes via MCP;
13. criar PIX pelo Hermes;
14. consultar PIX pelo Hermes;
15. receber notificação no Hermes quando o pagamento for confirmado.

Qualquer funcionalidade fora disso deverá ser avaliada antes de entrar
no MVP.

------------------------------------------------------------------------

## 39. Critérios de sucesso do MVP

### Funcionais

-   tenant A nunca acessa dados do tenant B;
-   PIX pode ser criado pelo painel;
-   PIX pode ser criado pelo Hermes;
-   pagamento confirmado é refletido no sistema;
-   duplicação de webhook não duplica pagamento/evento;
-   falha temporária não perde evento;
-   histórico permanece auditável.

### Experiência

Painel:

`login → gerar PIX`

deve exigir o mínimo possível de interação.

Hermes:

`"Gera um PIX de 350 para João"`

deve ser suficiente quando os dados necessários estiverem presentes.

------------------------------------------------------------------------

## 40. Decisões arquiteturais iniciais

### ADR-001 --- REST + MCP

REST será o contrato principal da aplicação.

MCP será uma camada de ferramentas para agentes de IA.

### ADR-002 --- Provider abstraction

Nenhuma interface pública dependerá do contrato específico da LofyPay.

### ADR-003 --- Multi-tenant

Toda entidade financeira pertence a um tenant.

### ADR-004 --- Hermes sem credencial financeira

Hermes acessa somente o PIXPAY.

### ADR-005 --- Cashout fora do MVP

MVP somente recebe/consulta PIX.

### ADR-006 --- Eventos persistentes

Mudanças relevantes de pagamento geram eventos auditáveis.

### ADR-007 --- Processamento assíncrono

Webhooks, notificações e retries deverão utilizar Worker/Fila quando
apropriado.

------------------------------------------------------------------------

## 41. Regras para implementação por agentes de IA

Codex, Hermes ou qualquer outro agente trabalhando no repositório deverá
seguir:

1.  Não alterar decisões arquiteturais deste documento silenciosamente.
2.  Não expor credenciais em código, commits, logs ou respostas.
3.  Não acoplar domínio PIXPAY diretamente à LofyPay.
4.  Toda nova entidade financeira deve possuir `tenant_id` quando
    aplicável.
5.  Toda rota deve considerar autenticação e autorização.
6.  Toda chamada financeira deve considerar idempotência.
7.  Webhooks devem ser persistidos antes de processamento complexo.
8.  Operações assíncronas devem ser delegadas ao Worker quando adequado.
9.  MCP não deverá ganhar operações financeiras destrutivas sem revisão
    explícita.
10. Cashout não deverá ser implementado sem decisão arquitetural
    específica.
11. Alterações de schema devem utilizar migrations.
12. Novas funcionalidades devem possuir testes.
13. Nunca utilizar dados de outro tenant como fallback.
14. Não registrar secrets.
15. Manter documentação sincronizada com mudanças arquiteturais.

------------------------------------------------------------------------

## 42. Pendências de validação antes da produção

Validar diretamente com documentação/ambiente da LofyPay:

-   comportamento exato do sandbox;
-   autenticação;
-   criação de cobrança;
-   expiração;
-   estados retornados;
-   assinatura e comportamento dos webhooks;
-   retries;
-   limites/rate limits;
-   idempotência;
-   consulta/reconciliação;
-   QR Code;
-   dados do pagador disponibilizados;
-   MED/disputas;
-   política de armazenamento de credenciais;
-   termos para uso multi-tenant;
-   eventual uso comercial de split;
-   requisitos contratuais/compliance.

Não assumir comportamento financeiro sem teste.

------------------------------------------------------------------------

## 43. Visão futura

O PIXPAY poderá evoluir de um gerador simples de PIX para um **Payment
Hub orientado por IA**.

``` text
                       PIXPAY
                          |
       +------------------+------------------+
       |                  |                  |
      WEB                MCP                API
       |                  |                  |
    Usuários           Hermes          ERP / PDV / Apps
                          |
                      WhatsApp
                          |
                          v
                  Linguagem natural
```

Experiência desejada:

``` text
"Gera 850 pro José."

"Caiu?"

"Quanto entrou hoje?"

"Quem ainda está pendente?"

"Quanto recebi do Carlos este mês?"

"Me avise quando o José pagar."
```

A complexidade de provider, QR Code, webhooks, reconciliação,
autenticação e auditoria deverá permanecer invisível para o usuário.

------------------------------------------------------------------------

## 44. Norte do produto

> **PIXPAY deve tornar receber e acompanhar PIX tão simples quanto
> enviar uma mensagem.**

O diferencial inicial não será possuir mais funções que os PSPs.

Será oferecer uma experiência menor, mais rápida e mais natural,
mantendo uma arquitetura segura e extensível por trás dessa
simplicidade.
