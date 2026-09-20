# Brainstorm — PIXPAY (Plataforma Multi-tenant de Recebimento PIX & AI Hub)

**Lente:** especificação de projeto de desenvolvimento  
**Última sessão:** 2026-09-20  
**Status da Sessão:** Consolidado / Base para PRD, TRD e ADRs  

---

## 1. Problema

### Problema Real
Profissionais, pequenas empresas e sócios precisam receber via PIX de clientes de forma ágil, sem navegar por interfaces bancárias burocráticas ou expor diretamente dados pessoais sensíveis (chaves PIX pessoais, CPF, telefone). Além disso, a gestão de cobranças rápidas ("gera um PIX de 350 pro João") exige hoje múltiplos passos manuais em aplicativos bancários ou ERPs pesados.

### Reframing do Problema
O PIXPAY não é um banco e não deve prometer "anonimato financeiro" (o arranjo regulatório do Banco Central e as normas dos PSPs exigem conformidade, KYC e rastreabilidade). O PIXPAY é uma **camada de aplicação inteligente e desacoplada**, focada em **fricção zero**: transforma a criação e acompanhamento de cobranças em uma ação tão rápida quanto enviar uma mensagem no WhatsApp ou clicar em um botão no painel web, mantendo multi-tenancy estrito e isolamento seguro de credenciais financeiras.

---

## 2. Requisitos de Negócio

### Quem Usa (Personas)
1. **Sócio / Administrador do Tenant (Owner / Admin):**
   - Conecta suas próprias credenciais do provedor financeiro (inicialmente LofyPay).
   - Gera cobranças pelo painel web e pelo WhatsApp (via Hermes Agent).
   - Visualiza dashboard simplificado de recebimentos diários e status de pagamentos.
2. **Operador / Financeiro (Admin / Viewer):**
   - Cria cobranças e monitora pagamentos pendentes e recebidos.
   - Não possui permissão para ver ou alterar segredos de credenciais bancárias.
3. **Pagador Final (Cliente):**
   - Recebe o código PIX Copia e Cola e o QR Code dinâmico; efetua o pagamento no seu banco.
4. **Hermes Agent (IA Conversacional):**
   - Atua em nome do tenant no WhatsApp via MCP, interpretando pedidos em linguagem natural e reportando confirmações de pagamento.

### O que o Sistema Precisa Permitir
- **Múltiplos Tenants:** Isolamento absoluto entre tenants. Cada tenant tem seus pagamentos, clientes, histórico e contas de cobrança.
- **Conexão com LofyPay:** Cadastro e validação de credenciais de API da LofyPay (Sandbox e Produção) com criptografia em repouso.
- **Geração de PIX Dinâmico:** Geração instantânea de QR Code e código Copia e Cola com valor, descrição e tempo de expiração.
- **Notificação em Tempo Real:** Confirmação automática de recebimento via Webhook, atualizando o painel e disparando notificação ao Hermes Agent (WhatsApp).
- **Consulta Conversacional:** Perguntas ao Hermes como "O PIX do Carlos caiu?", "Quanto recebi hoje?", "Quais estão pendentes?".
- **Painel Minimalista:** Interface web desktop/mobile ultra-rápida (entrar → informar valor → gerar PIX → receber confirmação).

### Regras de Negócio
1. **Autoridade do Backend:** Toda operação iniciada pelo Hermes ou pelo frontend passa por autenticação, autorização por papel e validação estrita no backend.
2. **Hermes Cego a Segredos:** O Hermes Agent nunca tem acesso às credenciais bancárias ou Secret Keys da LofyPay; opera unicamente via Service Account com escopos limitados.
3. **Idempotência Financeira:** Webhooks duplicados da LofyPay ou cliques repetidos não podem gerar duplicação de pagamentos ou eventos inconsistentes.
4. **Sem Cashout no MVP:** A plataforma no MVP é exclusivamente para recebimento e consulta. Não há transferências de saída ou saques automáticos.
5. **Armazenamento de Eventos Brutos:** Todo webhook recebido deve ter seu payload bruto persistido antes de ser enfileirado para o Worker, garantindo auditabilidade e capacidade de reprocessamento.

### Fora de Escopo do MVP
- Transferências financeiras para fora (Cashout / Split automático).
- Suporte inicial a múltiplos PSPs concorrentes no mesmo tenant (a arquitetura suportará no futuro, mas o MVP foca na LofyPay).
- Criação pública autônoma de contas (o onboarding inicial é privado para os três sócios).
- Páginas públicas personalizáveis (`pixpay.../{username}`) — reservadas para a Fase 6.
- Suporte a cartão de crédito ou boleto bancário (foco exclusivo em PIX).

---

## 3. Requisitos Técnicos

*(Cada requisito técnico aponta o requisito de negócio correspondente)*

1. **Arquitetura Modular Monorepo com Monolito Modular (RT-01):**
   - *Serve a:* Simplicidade operacional e entrega rápida para os sócios.
   - Backend NestJS modular (`apps/api`), Frontend Next.js (`apps/web`), Worker de Background (`apps/worker`), e Servidor MCP (`apps/mcp`), compartilhando bibliotecas de contratos, banco e regras (`packages/*`).
2. **Abstração Provider-Agnostic (`PaymentProvider`) (RT-02):**
   - *Serve a:* Não acoplar o PIXPAY à LofyPay, permitindo a transição ou adição futura de Efí, Mercado Pago, Asaas ou Inter.
   - Interface padronizada: `createPayment()`, `getPayment()`, `validateCredentials()`, `processWebhook()`.
3. **Segregação Multi-tenant com Chave de Particionamento (`tenant_id`) e RLS (RT-03):**
   - *Serve a:* Isolamento absoluto entre organizações e conformidade de segurança.
   - Todas as tabelas de domínio contêm `tenant_id` obrigatório indexado; queries de aplicação usam filtros estritos e suporte a RLS no PostgreSQL.
4. **Criptografia Simétrica em Repouso (AES-256-GCM) para Credenciais do PSP (RT-04):**
   - *Serve a:* Proteção das chaves secretas da LofyPay contra vazamentos de banco ou backups.
   - `encrypted_credentials` com chave mestra rotacionável (`ENCRYPTION_KEY`) gerenciada via variáveis de ambiente.
5. **Processamento Assíncrono com Filas BullMQ e Redis (RT-05):**
   - *Serve a:* Resposta rápida de webhooks (<200ms) e resiliência a picos ou lentidão da rede externa.
   - Endpoint de webhook valida assinatura/origem, persiste o payload bruto na tabela `webhook_events`, enfileira o job e responde HTTP 200/202 imediatamente.
6. **Autenticação Dupla: JWT para Web e API Keys com Hash SHA-256 para Service Accounts (RT-06):**
   - *Serve a:* Acesso seguro ao painel pelos usuários e acesso seguro ao MCP pelo Hermes Agent.
   - Tokens Hermes iniciam com prefixo `wpk_live_...`, hash gravado no banco; o tenant é resolvido pelo token no backend.
7. **Servidor MCP com Protocolo JSON-RPC sobre HTTP/SSE (RT-07):**
   - *Serve a:* Integração fluida e de baixo risco com o Hermes Agent rodando no WhatsApp.
   - Ferramentas expostas estritamente: `pix_create`, `pix_get`, `pix_list`, `pix_summary`. Auditoria obrigatória de cada invocação.
8. **Pipeline Docker Swarm + Traefik v3 + Portainer Stack Webhook (RT-08):**
   - *Serve a:* Implantação contínua automatizada no servidor existente (177.136.234.234) sem downtime.
   - Imagens no GitHub Container Registry (`ghcr.io`), rede overlay `interna`, terminação TLS automática via Let's Encrypt.

---

## 4. Requisitos Não-Funcionais

| Dimensão | Requisito | Justificativa de Negócio |
|---|---|---|
| **Performance (Web & API)** | Tempo de resposta p95 < 300ms para endpoints de leitura e < 800ms para criação de PIX na LofyPay. | Evitar sensação de lentidão no WhatsApp ou abandono do usuário no painel. |
| **Performance (Webhook)** | Ingestão e persistência de webhook bruto com retorno HTTP em < 200ms. | PSPs desarmam ou reenviam webhooks agressivamente se o endpoint demorar. |
| **Disponibilidade / SLA** | 99.8% de uptime da stack local; recuperação automática de containers via Docker Swarm restart policy. | Operação contínua de cobranças comerciais sem perda de notificações. |
| **Segurança & Criptografia** | HTTPS obrigatório em todas as rotas; AES-256-GCM para chaves de API financeiras; nenhuma credencial em logs. | Risco financeiro crítico e conformidade LGPD. |
| **Tolerância a Falhas** | Idempotência em transações financeiras; retry automático exponencial em falhas transitórias com a LofyPay. | Flutuações de rede não devem corromper o estado do pagamento. |
| **Uso de Recursos (Host)** | Limites de memória nos containers: API (384MB), Web (256MB), Worker (256MB), Redis (128MB). | O servidor possui 4GB de RAM e já executa PostgreSQL, Traefik, Portainer e a stack P3. |

---

## 5. Estados do Protocolo de Rigor

| Item | Estado | Fonte / Premissa | Data |
|---|---|---|---|
| Domínio principal: `pixpay.awecloudsolution.com` | **Decidido** | Declaração do usuário no prompt e doc mestre | 2026-09-20 |
| Infraestrutura: Docker Swarm + Portainer + Traefik na rede `interna` | **Verificado** | Inspecionado no host local via Docker CLI | 2026-09-20 |
| Provedor de banco: PostgreSQL 18.6 existente | **Verificado** | Consulta SQL direta no container postgres | 2026-09-20 |
| Primeiro PaymentProvider: LofyPay | **Decidido** | Documento Mestre (§7) | 2026-09-20 |
| Interface IA: Hermes Agent via MCP (WhatsApp) | **Decidido** | Documento Mestre (§8 e §20) | 2026-09-20 |
| Sem Cashout no MVP | **Decidido** | Documento Mestre (§32) | 2026-09-20 |
| Autenticação Hermes por Service Account (`wpk_live_...`) | **Decidido** | Documento Mestre (§21) | 2026-09-20 |
| Ingestão de Webhooks desacoplada por Worker/Fila BullMQ | **Decidido** | Documento Mestre (§14 e §34) | 2026-09-20 |
| Redis como dependência de fila/cache | **Inferido** | Necessário para BullMQ; será provisionado na stack com limite de memória | 2026-09-20 |
| Roteamento path-based no Traefik (`/`, `/api/*`, `/mcp`) | **Inferido** | Unifica domínio e SSL sem exigir múltiplos subdomínios e certificados | 2026-09-20 |
| Contrato e comportamento da API Sandbox da LofyPay | **Em aberto** | Depende de credenciais e documentação oficial da LofyPay a serem fornecidas pelos sócios | 2026-09-20 |

---

## 6. Alternativas Descartadas

1. **Construir diretamente sobre a API da LofyPay sem camada abstrata (`PaymentProvider`):**
   - *Descartada porque:* Amarraria toda a lógica de negócio do PIXPAY ao fornecedor. Se a LofyPay sofrer instabilidades ou taxas desfavoráveis, a migração seria traumática.
2. **Permitir que o Hermes Agent receba as credenciais do PSP e gere os pagamentos diretamente:**
   - *Descartada porque:* Apresenta risco inaceitável de prompt injection, alucinação de valores e vazamento de chaves secretas.
3. **Subdomínios separados imediatos (`api.pixpay...`, `mcp.pixpay...`, `app.pixpay...`):**
   - *Descartada porque:* Exigiria criação e apontamento de múltiplos registros DNS CNAME e múltiplos certificados no Traefik no primeiro dia. Roteamento por path (`/api/v1/`, `/mcp`, `/`) sob o mesmo domínio `pixpay.awecloudsolution.com` simplifica a infraestrutura inicial.
4. **Armazenamento de credenciais em texto simples no PostgreSQL:**
   - *Descartada porque:* Qualquer dump, backup ou acesso indevido exporia as chaves financeiras dos tenants.

---

## 7. Análise de Divergências e Correções Propostas (Item 11 do Prompt)

Durante a leitura minuciosa do `PIXPAY_DOCUMENTO_MESTRE.md` e a análise do servidor local, foram identificadas as seguintes divergências técnicas e operacionais:

1. **Restrição de Memória do Servidor vs. Complexidade de Múltiplos Processos Node.js:**
   - *Divergência:* O documento mestre projeta 4 aplicações separadas (Next.js, NestJS API, BullMQ Worker, MCP Server) rodando em containers independentes. O servidor possui 4 GB de RAM compartilhados com Traefik, PostgreSQL 18.6, PgAdmin e a stack P3. Quatro instâncias Node.js sem restrição de heap poderiam atingir o limite de memória da máquina e provocar OOM Killer.
   - *Correção Proposta:* Definir explicitamente nos containers Docker `--max-old-space-size=256`, impor `limits: memory` no `deploy/stack.yml`, e permitir que o Worker e a API compartilhem o mesmo runtime em containers leves de imagem Alpine/Distroless.
2. **Ausência de Serviço Redis no Swarm Atual:**
   - *Divergência:* O documento mestre exige BullMQ/Redis para filas de webhook e idempotência, mas atualmente não existe Redis rodando no Swarm (apenas PostgreSQL).
   - *Correção Proposta:* Adicionar uma instância de `redis:7-alpine` na stack do PIXPAY, conectado à rede `interna`, configurado com persistência leve (AOF) e limite estrito de memória (`maxmemory 128mb`, `maxmemory-policy allkeys-lru`).
3. **Versão do PostgreSQL (PostgreSQL 18.6 em desenvolvimento/nightly):**
   - *Divergência:* O banco no servidor é `postgres:18.6` (versão experimental/desenvolvimento). O Prisma ORM e bibliotecas padrão necessitam garantir conexão via protocolo padrão `postgresql://` sem flags incompatíveis.
   - *Correção Proposta:* Validar que os schemas e migrações geradas pelo Prisma utilizem SQL ANSI compatível e verificar a conexão padrão com `directUrl` e connection pooling padrão.
4. **Comunicação Hermes → MCP Transporte:**
   - *Divergência:* O documento mestre indica MCP mas não fixa o transporte (Stdio vs SSE/HTTP Streamable). O Hermes rodando no WhatsApp roda como serviço remoto ou em outro processo; portanto, transporte Stdio local não funciona para chamadas remotas.
   - *Correção Proposta:* O `apps/mcp` implementará transporte HTTP com Server-Sent Events (SSE) / Streamable JSON-RPC sobre HTTPS (`https://pixpay.awecloudsolution.com/mcp`), protegido pelo token de Service Account no header `Authorization: Bearer wpk_live_...`.
5. **Roteamento Traefik v3 Unificado:**
   - *Divergência:* Evitar o overhead de gerenciar múltiplos domínios antes do MVP.
   - *Correção Proposta:* Configurar o Traefik para rotear:
     - `PathPrefix(`/api`)` → Serviço `api` (NestJS)
     - `PathPrefix(`/mcp`)` → Serviço `mcp` (MCP Server)
     - `PathPrefix(`/`)` → Serviço `web` (Next.js Dashboard)

---

## 8. Pendências

1. **Credenciais e Documentação de Sandbox da LofyPay:**
   - *Motivo:* Necessário para escrever os testes de integração do `LofyPayProvider` e validar o payload exato de webhook e assinatura HMAC.
   - *O que destrava:* Conclusão da Fase 2 e 3 do roadmap (implementação real do adapter LofyPay).
2. **Cadastro do Token GHCR e Webhook da Stack no Portainer:**
   - *Motivo:* Habilitação da pipeline automatizada de CI/CD via GitHub Actions.
   - *O que destrava:* Deploy contínuo automatizado a cada push na branch `main`.
