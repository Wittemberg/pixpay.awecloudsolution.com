# PIXPAY · pixpay.awecloudsolution.com

Plataforma multi-tenant de recebimento e gestão de cobranças PIX, desacoplada de provedores financeiros (provider-agnostic) e com interface web minimalista aliada a agente de IA conversacional (Hermes Agent via MCP).

## Arquitetura e Componentes

- **Domínio Público:** `https://pixpay.awecloudsolution.com`
- **Frontend:** Painel Web Next.js minimalista (foco operacional: entrar -> informar valor -> gerar PIX -> acompanhar).
- **Backend API:** Node.js 26.9.0 (native HTTP server) com Prisma ORM 5.22.0 e PostgreSQL 18.6.
- **Worker / Filas:** BullMQ + Redis para processamento assíncrono de webhooks, notificações e reconciliação.
- **MCP Server:** Interface Model Context Protocol para o Hermes Agent (WhatsApp), com permissões restritas e autenticação por Service Account.
- **Infraestrutura:** Docker Swarm + Portainer EE + Traefik v3 (`letsencryptresolver`) na rede overlay `interna`.
- **CI/CD:** GitHub Actions com publicação de imagens no GitHub Container Registry (`ghcr.io`) e trigger de redeploy via webhook seguro do Portainer.

## Status do Projeto

- **URL Pública:** [https://pixpay.awecloudsolution.com](https://pixpay.awecloudsolution.com)
- **API Health:** [https://pixpay.awecloudsolution.com/api/health](https://pixpay.awecloudsolution.com/api/health)
- **Status Operacional:** Stack Docker Swarm ativa e saudável (4 serviços: `pixpay_web`, `pixpay_api`, `pixpay_worker`, `pixpay_redis`).
- **Versão:** 0.3 (Persistência via Prisma ORM + PostgreSQL 18 + Integração Completa).

---

## Funcionalidades Ativas na Interface Web

Acesse [https://pixpay.awecloudsolution.com](https://pixpay.awecloudsolution.com):

1. **📊 Dashboard & PIX:**
   - Métricas operacionais em tempo real com persistência PostgreSQL (Total recebido hoje, Cobranças pagas, Valores pendentes).
   - "Calculadora de PIX": formulário de emissão instantânea com geração de chave Copia e Cola e QR Code dinâmico, persistidos no banco de dados.
   - Tabela de cobranças com dados reais do tenant, paginação e filtros por status (PENDING, PAID, EXPIRED, CANCELLED).
   - Botão de cópia de chave PIX com feedback tátil ("Copiado com Sucesso!").

2. **⚙️ Configuração LofyPay (`lofypay.com`):**
   - Chaveamento entre ambientes `SANDBOX` (Testes) e `PRODUÇÃO`.
   - Cadastro e persistência segura de `Client ID` e `Secret Key` via criptografia JSON em PostgreSQL.
   - Proteção de segurança: Secret Key com mascaramento visual (`sec_dem****************4321`).
   - Card com a URL canônica de webhook do PIXPAY (`https://pixpay.awecloudsolution.com/api/v1/webhooks/lofypay`) com botão de cópia em 1 clique para cadastro no painel do PSP.
   - Botões de ação "Salvar Credenciais" e "Testar Conexão" com feedback visual de resposta e atualização automática de status (PENDING → ACTIVE).

---

## Endpoints REST Disponíveis

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/health` | Status operacional e revisão do container |
| `GET` | `/api/v1/payments/summary` | Resumo financeiro diário com agregação PostgreSQL |
| `GET` | `/api/v1/payments` | Listagem de pagamentos do tenant com filtros e paginação |
| `POST` | `/api/v1/payments` | Criação de cobrança PIX dinâmica com persistência |
| `GET` | `/api/v1/payment-accounts` | Consulta de configuração LofyPay (chave mascarada) |
| `POST` | `/api/v1/payment-accounts` | Salvamento seguro de credenciais LofyPay (JSON criptografado) |
| `POST` | `/api/v1/payment-accounts/test` | Teste de conexão e handshake com a LofyPay (atualiza status para ACTIVE) |
| `POST` | `/api/v1/webhooks/lofypay` | Ingestão e reconciliação de webhooks da LofyPay com audit trail |
| `GET` | `/mcp` | Identificação do Servidor Model Context Protocol |

---

## Especificações e Governança OpenSpec

- [`openspec/specs/bootstrap-runtime/spec.md`](openspec/specs/bootstrap-runtime/spec.md) — Infraestrutura base e serviços Swarm.
- [`openspec/specs/payment-account-config/spec.md`](openspec/specs/payment-account-config/spec.md) — Gestão de credenciais, mascaramento e estado zerado.
- [`openspec/changes/database-schema-prisma/specs/database-foundation/spec.md`](openspec/changes/database-schema-prisma/specs/database-foundation/spec.md) — Schema Prisma, migrations e integração API/Worker.
- Todas as especificações são validadas estritamente via `npx @fission-ai/openspec validate --all --strict`.

---

## Documentação do Projeto

- [Documento Mestre de Especificação](docs/PIXPAY_DOCUMENTO_MESTRE.md)
- [Engenharia de Software e Ciclo de Vida](docs/ENGENHARIA_E_CICLO_DE_VIDA.md)
- [Estado Atual do Projeto](docs/estado-atual.md)
- [Brainstorm Consolidado](docs/brainstorm-pixpay.md)
- [PRD Global](docs/prd.md) e [PRDs de Feature](docs/prds/)
- [TRD (Technical Requirements Document)](docs/trd.md)
- [ADRs (Architecture Decision Records)](docs/adrs/)
- [Guia de Deploy, GHCR e Webhook Portainer](docs/DEPLOY_E_REGISTRY_GUIA.md)
- [Diretrizes para Agentes](AGENTS.md)
- [Manual de Desenvolvimento Harness](.harness/docs/manual.md)
