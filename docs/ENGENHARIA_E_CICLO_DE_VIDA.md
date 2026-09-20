# Engenharia de Software e Ciclo de Vida: PIXPAY

Este documento formaliza as práticas, governança e conformidade do projeto **PIXPAY** (`pixpay.awecloudsolution.com`) cobrindo as fases **A até H** em alinhamento com as diretrizes do repositório Harness e com o Documento Mestre.

---

## A) Concepção e Estudo de Viabilidade

### 1. Análise de Viabilidade Técnica
- **Infraestrutura Existente:** Servidor Ubuntu 24.04 (6 vCPUs, 4GB RAM) com Docker Swarm e Traefik v3 (`drb6ch7fgzeeujx0tseptpi2j`).
- **Banco de Dados:** PostgreSQL 18.6 já operacional na rede overlay `interna` (`postgres:5432`).
- **Exequibilidade:** A stack em monorepo com isolamento por processos leves Node.js e Redis 7 com teto de memória estrito (128MB) é plenamente suportada pelo hardware, sem necessidade de aquisição de novas VMs ou serviços gerenciados em nuvem.

### 2. Análise de Viabilidade Financeira e Operacional
- **Custos de Infraestrutura Adicionais:** Zero. O projeto reutiliza o nó Swarm e a infraestrutura de certificados Let's Encrypt já provisionada para `awecloudsolution.com`.
- **Viabilidade Operacional:** Foco em uso inicial privado pelos três sócios, reduzindo o custo de suporte inicial e permitindo refinamento contínuo dos fluxos conversacionais no WhatsApp antes da abertura para clientes externos.

### 3. Termo de Abertura do Projeto (TAP) e Visão Estratégica
- **Nome do Projeto:** PIXPAY (`pixpay.awecloudsolution.com`).
- **Patrocinadores:** Wittemberg e Sócios.
- **Objetivo Estratégico:** Eliminar a burocracia e atrito na emissão e acompanhamento de cobranças PIX, unindo uma interface web minimalista ("calculadora de PIX") à conveniência da linguagem natural no WhatsApp através do Hermes Agent via MCP.
- **Premissa Fundamental:** Provider-agnostic (LofyPay inicial, expansível para Efí, Mercado Pago, etc.) e IA sem acesso a credenciais financeiras.

---

## B) Engenharia de Requisitos (Escopo)

### 1. Elicitação e Levantamento com Stakeholders
- Consolidação realizada a partir do `PIXPAY_DOCUMENTO_MESTRE.md` e amadurecida através do `brainstorm-pixpay.md`.
- Personas detalhadas: Sócio/Owner, Operador/Financeiro, Pagador Final (Cliente) e Hermes Agent (IA).

### 2. Classificação de Requisitos
- **Requisitos Funcionais (RF):**
  - RF-01: Cadastro de usuários e organizações multi-tenant com roles `OWNER`, `ADMIN`, `VIEWER` ([PRD-001](prds/001-multi-tenant-auth.md)).
  - RF-02: Emissão e revogação de Service Accounts com tokens `wpk_live_...` ([PRD-001](prds/001-multi-tenant-auth.md)).
  - RF-03: Conexão e teste de credenciais da LofyPay criptografadas com AES-256-GCM ([PRD-002](prds/002-pagamentos-pix-core.md)).
  - RF-04: Geração de cobranças PIX dinâmicas com QR Code e Copia e Cola ([PRD-002](prds/002-pagamentos-pix-core.md)).
  - RF-05: Ingestão de Webhooks da LofyPay com resposta rápida e enfileiramento ([PRD-003](prds/003-webhooks-reconciliacao.md)).
  - RF-06: Reconciliação periódica de cobranças pendentes via cron ([PRD-003](prds/003-webhooks-reconciliacao.md)).
  - RF-07: Servidor MCP sobre HTTP/SSE para o Hermes Agent (`pix_create`, `pix_get`, `pix_list`, `pix_summary`) ([PRD-004](prds/004-hermes-mcp.md)).
  - RF-08: Painel web minimalista de emissão e acompanhamento diário ([PRD-005](prds/005-painel-web-dashboard.md)).
- **Requisitos Não-Funcionais (RNF):**
  - RNF-01: Ingestão de webhook com latência < 200ms ([TRD](trd.md)).
  - RNF-02: Geração de PIX com latência p95 < 800ms ([TRD](trd.md)).
  - RNF-03: RLS e segregação estrita por `tenant_id` ([ADR-003](adrs/003-multi-tenant-discriminator-rls.md)).
  - RNF-04: Respeito à Baseline Wittemberg (zoom 100%, sem quebra de containers) ([Baseline](.harness/standards/wittemberg/README.md)).

### 3. Regras de Negócio e Delimitação
- **Regras Imutáveis:** O backend é a autoridade central; o Hermes nunca recebe Secret Keys; sem cashout no MVP ([ADR-005](adrs/005-cashout-excluded-from-mvp.md)).
- **Escopo Negativo:** Sem split financeiro, sem emissão de cartões ou boletos, sem páginas públicas customizadas no primeiro lançamento.

---

## C) Arquitetura e Design do Sistema

### 1. Arquitetura de Software e Componentes
- Monolito Modular em monorepo estruturado:
  - `apps/api`: NestJS REST API.
  - `apps/web`: Next.js 14 App Router.
  - `apps/worker`: Processador de background BullMQ.
  - `apps/mcp`: Servidor MCP oficial em TypeScript.
  - `packages/payment-core`: Domínio e interface `PaymentProvider`.
  - `packages/providers/lofypay`: Adapter concreto para LofyPay.
  - `packages/database`: Prisma Schema e migrations.

### 2. Modelagem de Dados Relacional
- Tabelas principais: `tenants`, `users`, `tenant_users`, `service_accounts`, `payment_accounts`, `payments`, `payment_events`, `webhook_events`, `audit_logs`.
- Integridade referencial com chaves estrangeiras indexadas e coluna `tenant_id NOT NULL`.

### 3. Especificação de APIs e Protocolos
- **REST API:** Versionamento `/api/v1/*`, payloads padronizados com DTOs e validação de schema.
- **MCP Server:** Transporte Streamable HTTP / SSE sobre `https://pixpay.awecloudsolution.com/mcp`.
- **Webhooks:** Ingestão autenticada via endpoint `/api/v1/webhooks/lofypay`.

### 4. Design de Interface (UI/UX)
- Alinhado com a **Baseline Wittemberg**:
  - Referência visual a 100% de zoom.
  - Contenção total: nenhum badge, card, modal ou texto extrapola a viewport.
  - Feedback visual imediato ao copiar chaves PIX.
  - Estados operacionais explícitos (Loading, Error, Empty State, Sucesso).

---

## D) Implementação (Construção e Codificação)

### 1. Estruturação do Código-fonte e Monorepo
- TypeScript Strict mode habilitado em todos os pacotes e aplicações.
- Módulos desacoplados; referências internas gerenciadas via workspaces pnpm/npm.

### 2. Controle de Versão e Gestão de Repositório
- Repositório Git configurado em `Wittemberg/pixpay.awecloudsolution.com`.
- Branch principal: `main`.
- Convenção de commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

### 3. Testes Automatizados e Builds
- Testes unitários com Vitest/Jest cobrindo regras de pagamento, idempotência e adapters.
- Build multi-stage Dockerfile gerando imagens leves baseadas em Alpine Linux.

---

## E) Qualidade e Testes (Garantia de Qualidade / QA)

### 1. Estratégia de Testes
- **Testes Unitários:** Validação de DTOs, cálculos de status de pagamento, criptografia de chaves e lógica do `PaymentProvider`.
- **Testes de Integração:** Simulação de fluxos completos de pagamento utilizando `MockPaymentProvider` e banco PostgreSQL em container de teste.
- **Testes de Carga e Performance:** Validação de tempo de resposta da rota de webhook (<200ms) sob concorrência.
- **Testes de Segurança (SAST/DAST):** Mascaramento de dados sensíveis em logs e verificação de injeção de parâmetros em rotas multi-tenant.

### 2. Homologação e Critérios de Aceite (UAT)
- Validação visual da interface web com os sócios.
- Homologação dos comandos conversacionais do Hermes Agent no WhatsApp utilizando ambiente Sandbox da LofyPay.

---

## F) Implantação e Deploy

### 1. Provisionamento de Infraestrutura
- Stack orquestrada no Docker Swarm (`deploy/stack.yml`) conectada à rede overlay `interna`.
- Roteamento e terminação TLS automática pelo Traefik v3 via certificado Let's Encrypt.
- Limites de memória e CPU aplicados em todos os containers para preservar os 4GB de RAM do servidor.

### 2. Automação de CI/CD
- Pipeline GitHub Actions (`.github/workflows/delivery.yml`):
  1. Validação estática de artefatos OpenSpec e sintaxe do Swarm.
  2. Build da imagem Docker multi-stage.
  3. Publicação segura no GitHub Container Registry (`ghcr.io`).
  4. Trigger do webhook da stack no Portainer EE via script `scripts/deploy.py`.
  5. Verificação ativa de convergência no endpoint `/api/health`.

---

## G) Operação e Manutenção

### 1. Monitoramento e Disponibilidade
- Docker Swarm Healthchecks nativos a cada 30 segundos com reinício automático.
- Logs em formato JSON estruturado capturados pelo driver padrão do Docker.

### 2. Manutenções Corretivas e Evolutivas
- Política de rollback atômico no Swarm (`order: start-first`, `failure_action: rollback`).
- Novas features e mudanças arquiteturais obrigatoriamente registradas via PRD e ADR antes da codificação.

---

## H) Processos Transversais Contínuos

### 1. Gestão de Configuração e Mudanças
- Ciclo de trabalho rigorosamente pautado no manual da biblioteca Harness (`.harness/docs/manual.md`).
- Uma única mudança ativa por vez documentada no OpenSpec (`openspec/changes/`).
- O `docs/estado-atual.md` mantido como ponto de retomada canônico em cada marco concluído.

### 2. Mitigação de Riscos e Segurança da Informação
- Nenhuma Secret Key gravada em texto plano ou trafegada fora de túnel HTTPS.
- Chave mestra `ENCRYPTION_KEY` mantida exclusivamente em variáveis de ambiente da stack no Portainer.
- Hermes Agent sem permissões de cashout ou manipulação de chaves do provedor.
