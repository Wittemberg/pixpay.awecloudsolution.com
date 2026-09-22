# database-schema-prisma

**Status:** PROPOSED  
**Created:** 2026-09-21  
**Author:** Wittemberg  

## Summary

Implementação da camada de persistência relacional completa com Prisma ORM para o PIXPAY, incluindo schema das 9 tabelas principais (`tenants`, `users`, `tenant_users`, `service_accounts`, `payment_accounts`, `payments`, `payment_events`, `webhook_events`, `audit_logs`), migrations, client compartilhado e integração com as aplicações `api` e `worker`.

## Context

Atualmente os serviços `api` e `worker` operam com dados em memória (implementação temporária em JavaScript puro). A próxima fase autorizada pelo `docs/estado-atual.md` é modelar a persistência real com PostgreSQL 18.6 usando Prisma ORM, garantindo segregação multi-tenant estrita, integridade referencial e auditoria imutável conforme ADR-003 e ADR-006.

## Related Documents

- `docs/PIXPAY_DOCUMENTO_MESTRE.md` (Seção 4: Arquitetura Lógica)
- `docs/trd.md` (Seção 2: Arquitetura / Modelagem de Dados)
- `docs/ENGENHARIA_E_CICLO_DE_VIDA.md` (Seção C.2: Modelagem de Dados Relacional)
- `docs/prds/001-multi-tenant-auth.md` (PRD de Multi-tenant e Identidade)
- `docs/adrs/003-multi-tenant-discriminator-rls.md` (Estratégia de discriminador `tenant_id`)
- `docs/adrs/006-event-sourcing-and-audit.md` (Histórico imutável de eventos)

## Artifacts

- [Proposal](proposal.md)
- [Design](design.md)
- [Tasks](tasks.md)
- [Spec: database-foundation](specs/database-foundation/spec.md)
