# PIXPAY · pixpay.awecloudsolution.com

Plataforma multi-tenant de recebimento e gestão de cobranças PIX, desacoplada de provedores financeiros (provider-agnostic) e com interface web minimalista aliada a agente de IA conversacional (Hermes Agent via MCP).

## Arquitetura e Componentes

- **Domínio Público:** `https://pixpay.awecloudsolution.com`
- **Frontend:** Painel Web Next.js minimalista (foco operacional: entrar -> informar valor -> gerar PIX -> acompanhar).
- **Backend API:** NestJS / TypeScript com Prisma ORM e PostgreSQL 18.
- **Worker / Filas:** BullMQ + Redis para processamento assíncrono de webhooks, notificações e reconciliação.
- **MCP Server:** Interface Model Context Protocol para o Hermes Agent (WhatsApp), com permissões restritas e autenticação por Service Account.
- **Infraestrutura:** Docker Swarm + Portainer EE + Traefik v3 (`letsencryptresolver`) na rede overlay `interna`.
- **CI/CD:** GitHub Actions com publicação de imagens no GitHub Container Registry (`ghcr.io`) e trigger de redeploy via webhook seguro do Portainer.

## Documentação

- [Documento Mestre de Especificação](docs/PIXPAY_DOCUMENTO_MESTRE.md)
- [Brainstorm de Especificação](docs/brainstorm-pixpay.md)
- [PRD Global](docs/prd.md) e [PRDs de Feature](docs/prds/)
- [TRD (Technical Requirements Document)](docs/trd.md)
- [ADRs (Architecture Decision Records)](docs/adrs/)
- [Estado Atual do Projeto](docs/estado-atual.md)
- [Diretrizes para Agentes](AGENTS.md)
- [Manual de Desenvolvimento Harness](.harness/docs/manual.md)
