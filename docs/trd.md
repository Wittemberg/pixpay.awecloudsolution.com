# TRD — Technical Requirements Document

> Documento técnico global do projeto PIXPAY (`pixpay.awecloudsolution.com`).
> Mantido conforme a skill `escrever-trd` da biblioteca Harness.
> Referência técnica central consumida pelo fluxo de implementação e automação.

---

## 1. Stack

| Dimensão | Valor | Justificativa / Observação |
|---|---|---|
| Linguagem principal | TypeScript 5.5+ | Tipagem estrita de ponta a ponta no monorepo (contratos, API e Web). |
| Runtime / plataforma | Node.js 20.x / 22.x LTS | Suporte estável a ESM, Fetch API nativa e MCP SDK. |
| Framework Backend (API) | NestJS 10.x | Modularidade, injeção de dependências, filtros de exceção e DTOs rigorosos. |
| Framework Frontend (Web) | Next.js 14+ (App Router) | Renderização server-side otimizada, Tailwind CSS e alta performance em mobile/desktop. |
| Banco de dados | PostgreSQL 18.6 | Instância já em execução no Docker Swarm local na rede overlay `interna`. |
| ORM / Camada de Dados | Prisma ORM 5.x / 6.x | Type safety nas consultas, migrações automatizadas e controle de conexões. |
| Filas & Cache | BullMQ + Redis 7 (Alpine) | Processamento assíncrono de webhooks, reconciliação e controle de concorrência. |
| Interface de IA | MCP SDK (TypeScript) | Servidor Model Context Protocol oficial integrado para o Hermes Agent. |
| Orquestração de Containers | Docker Swarm (Ubuntu 24.04) | Cluster single-node existente com 6 vCPUs e 4GB RAM. |
| Ingress & Proxy Reverso | Traefik v3.5 | Roteamento HTTPS com emissão automática de certificados Let's Encrypt (`websecure`). |
| Gestão de Containers | Portainer EE | Gerenciamento de stacks via webhook autenticado para CD. |
| Gerenciador de Pacotes | pnpm / npm | Workspace monorepo leve e determinístico. |

---

## 2. Arquitetura

### Padrão arquitetural
**Monolito Modular em Monorepo (Clean / Hexagonal Ports & Adapters)**  
O sistema é organizado como um monolito modular com clara segregação de responsabilidades. O domínio financeiro (`payment-core`) é isolado e expõe portas (interfaces), enquanto provedores externos como a LofyPay são implementados como adaptadores (adapters). O backend expõe uma API REST para consumo humano/web e um servidor MCP para consumo do agente conversacional.

### Estrutura de pastas dominante
```
pixpay/
├── apps/
│   ├── api/          # NestJS REST API (Auth, Payments, Webhooks, Tenants)
│   ├── web/          # Next.js App Router (Dashboard, Emissão de PIX, Histórico)
│   ├── worker/       # BullMQ Worker (Processamento assíncrono e Reconciliação)
│   └── mcp/          # Servidor MCP HTTP/SSE para o Hermes Agent (WhatsApp)
├── packages/
│   ├── database/     # Prisma Schema, Migrations e Cliente de Banco
│   ├── payment-core/ # Domínio financeiro, interfaces e regras de negócio
│   ├── providers/    # Adapters de PSP (LofyPayProvider, MockProvider)
│   └── contracts/    # DTOs compartilhados, Schemas Zod e Tipos TypeScript
├── deploy/
│   ├── stack.yml     # Manifest de Stack para Docker Swarm no Portainer
│   └── compose.dev.yml # Ambiente de desenvolvimento local
├── scripts/
│   └── deploy.py     # Disparo de webhook Portainer e verificação de saúde
├── docs/
│   ├── prd.md        # Visão e Roadmap do Produto
│   ├── prds/         # PRDs de Feature detalhados (001 a 005)
│   ├── trd.md        # Este documento de requisitos técnicos globais
│   ├── adrs/         # Architecture Decision Records (001 a 008)
│   └── estado-atual.md # Estado de retomada e marcos ativos
├── .github/
│   └── workflows/
│       └── delivery.yml # Pipeline de Testes, Build Docker, Push GHCR e Deploy
├── AGENTS.md         # Diretrizes operacionais para agentes de IA
└── README.md         # Visão geral e guia rápido do projeto
```

### Módulos / camadas principais

| Módulo | Responsabilidade |
|---|---|
| `apps/api` | Roteamento HTTP, autenticação JWT, validação de DTOs e persistência inicial. |
| `apps/web` | Interface de usuário minimalista focada na rápida emissão e visualização de PIX. |
| `apps/worker` | Consumo de filas BullMQ para processar webhooks e rodar tarefas cron de reconciliação. |
| `apps/mcp` | Fachada JSON-RPC expondo ferramentas seguras (`pix_create`, etc.) para o Hermes Agent. |
| `packages/payment-core` | Regras canônicas de pagamento, idempotência e definição da interface `PaymentProvider`. |
| `packages/providers/lofypay` | Tradução de chamadas REST e assinaturas HMAC específicas da LofyPay. |
| `packages/database` | Modelagem relacional, scripts de migração e client Prisma compartilhado. |

---

## 3. Requisitos Não-Funcionais

| Dimensão | Requisito | Como Verificar |
|---|---|---|
| **Performance (Web & Leitura)** | p95 < 250ms para endpoints de leitura e carregamento do painel web. | Monitoramento de latência em requisições de histórico e dashboard. |
| **Performance (Criação PIX)** | p95 < 800ms para criação de cobrança com geração de QR Code dinâmico. | Chamadas de teste no endpoint `/api/v1/payments` medindo tempo total. |
| **Performance (Ingestão Webhook)** | Retorno HTTP 200/202 em menos de 200ms na rota `/api/v1/webhooks/lofypay`. | Teste de carga com Apache Benchmark (`ab`) ou k6 simulando disparos simultâneos. |
| **Disponibilidade / SLA** | Uptime global de 99.8%; reinício automático dos containers em caso de falha no Swarm. | `restart_policy.condition: any` com delay de 5s no Docker Swarm. |
| **Escalabilidade & Limites** | Suporte a 50 pagamentos simultâneos sem degradação do host (4GB RAM). | Limites de memória rígidos nos containers: API (384MB), Worker (256MB), Web (256MB), Redis (128MB). |
| **Segurança em Repouso** | Criptografia simétrica AES-256-GCM para chaves de API financeiras da LofyPay no PostgreSQL. | Verificação de dumps do banco: a coluna `encrypted_credentials` deve conter payload cifrado + IV + tag de autenticação. |
| **Segurança em Trânsito** | HTTPS obrigatório em todas as portas públicas; TLS 1.3 via Traefik. | Teste de handshake SSL em `https://pixpay.awecloudsolution.com`. |
| **Observabilidade** | Logs estruturados em formato JSON com campos `requestId`, `tenantId` e `timestamp`. | Inspeção do stdout dos containers via `docker service logs`. |

---

## 4. Dependências Externas

| Serviço / Sistema | Tipo | Constraint Relevante | Dono / Responsável |
|---|---|---|---|
| **API LofyPay** | REST Externa | Sandbox e Produção; autenticação via Bearer/API Key; webhooks com assinatura HMAC. | Externo (LofyPay) |
| **PostgreSQL 18.6** | Banco Relacional | Instância única existente no host local; conectado via rede overlay `interna` (`postgres:5432`). | Interno (Infra local) |
| **Redis 7** | Cache / Filas | Container na stack Swarm com limite estrito `maxmemory 128mb` e política `allkeys-lru`. | Interno (Stack PIXPAY) |
| **Traefik v3** | Ingress / Proxy | Roteia tráfego na porta 443 com certificado Let's Encrypt para `pixpay.awecloudsolution.com`. | Interno (Infra local) |
| **Hermes Agent** | Agente IA (WhatsApp) | Conecta-se ao endpoint `/mcp` via HTTP/SSE usando Service Account `wpk_live_...`. | Equipe interna sócios |
| **GitHub Container Registry** | OCI Registry | Hospedagem de imagens de container em `ghcr.io/wittemberg/pixpay.awecloudsolution.com`. | GitHub |

---

## 5. Padrões

### Testes
| Item | Valor |
|---|---|
| Framework | Vitest / Jest |
| Comando de teste | `npm test` ou `pnpm test` |
| Cobertura mínima | 80% de linhas no domínio financeiro (`packages/payment-core`) |
| Estratégia | Testes unitários para regras de negócio e idempotência; testes de integração para adapters e banco |

### Estilo de Código
- **Linter:** ESLint com regras TypeScript Strict (`typescript-eslint`).
- **Formatter:** Prettier (`printWidth: 100`, `singleQuote: true`, `semi: true`).
- **Convenções:** `camelCase` para propriedades e funções, `PascalCase` para classes/interfaces/tipos, `UPPER_SNAKE_CASE` para enums e constantes.

### Error Handling
- Erros de domínio (`PaymentNotFoundError`, `InvalidCredentialsError`, `TenantMismatchError`) herdam de `DomainError` base e contêm código legível e mensagem sanitizada.
- Erros internos de infraestrutura nunca expõem stack traces ou queries SQL aos consumidores de API; retornam payload padronizado:
  ```json
  {
    "statusCode": 400,
    "error": "BAD_REQUEST",
    "message": "Descrição legível do erro",
    "requestId": "req_8df721a"
  }
  ```

### Logging
- **Formato:** JSON estruturado (Pino / Winston).
- **Nível padrão:** `info` em produção, `debug` em desenvolvimento.
- **Sanitização obrigatória:** Mascaramento automático de chaves secretas, tokens de autenticação, senhas e CPFs de clientes.

### Autenticação & Autorização
- Usuários: JWT com tempo de expiração curto (1 hora) e refresh token seguro via cookie `httpOnly`.
- Agentes (Hermes): Service Account API Token com prefixo `wpk_live_` e validação por hash SHA-256 no backend.
- Autorização em nível de rota baseada em papéis (`@Roles('OWNER', 'ADMIN')`) e filtro determinístico de `tenant_id`.

---

## 6. Decisões Globais (ADRs)

| # | Título | Data | Status | Link |
|---|---|---|---|---|
| 001 | REST como Contrato Principal e MCP como Interface para Agentes de IA | 2026-09-20 | aceito | [docs/adrs/001-rest-and-mcp-architecture.md](adrs/001-rest-and-mcp-architecture.md) |
| 002 | Abstração de Provedor Financeiro (PaymentProvider Interface) | 2026-09-20 | aceito | [docs/adrs/002-payment-provider-abstraction.md](adrs/002-payment-provider-abstraction.md) |
| 003 | Estratégia Multi-tenant com Discriminador `tenant_id` e Row-Level Security | 2026-09-20 | aceito | [docs/adrs/003-multi-tenant-discriminator-rls.md](adrs/003-multi-tenant-discriminator-rls.md) |
| 004 | Isolamento do Hermes Agent via Service Accounts Sem Credenciais Financeiras | 2026-09-20 | aceito | [docs/adrs/004-hermes-service-account-isolation.md](adrs/004-hermes-service-account-isolation.md) |
| 005 | Exclusão Deliberada de Recursos de Cashout no MVP | 2026-09-20 | aceito | [docs/adrs/005-cashout-excluded-from-mvp.md](adrs/005-cashout-excluded-from-mvp.md) |
| 006 | Persistência Imutável de Eventos de Pagamento e Trilha de Auditoria | 2026-09-20 | aceito | [docs/adrs/006-event-sourcing-and-audit.md](adrs/006-event-sourcing-and-audit.md) |
| 007 | Processamento Assíncrono com BullMQ e Redis para Webhooks e Reconciliação | 2026-09-20 | aceito | [docs/adrs/007-asynchronous-queue-processing.md](adrs/007-asynchronous-queue-processing.md) |
| 008 | Implantação Contínua em Docker Swarm via Traefik v3, GHCR e Portainer Webhook | 2026-09-20 | aceito | [docs/adrs/008-swarm-traefik-portainer-ci-cd.md](adrs/008-swarm-traefik-portainer-ci-cd.md) |
