---
adr_number: "003"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 003: Estratégia Multi-tenant com Discriminador `tenant_id` e Row-Level Security

## Contexto
O PIXPAY é uma aplicação multi-tenant onde múltiplos sócios e organizações compartilham a mesma infraestrutura de banco de dados (PostgreSQL 18). Precisamos garantir que nenhum dado, credencial ou pagamento seja visível ou modificável por outro tenant.

## Alternativas Consideradas
- **Banco de Dados por Tenant (Database-per-tenant):** Alto consumo de memória e complexidade de migrações com múltiplos bancos no PostgreSQL 18 para um servidor com 4GB RAM.
- **Schema por Tenant (Schema-per-tenant):** Dificuldade de manutenção com Prisma ORM e overhead de migrações em lote.
- **Tabelas Compartilhadas com Coluna Discriminadora (`tenant_id`) + Políticas de RLS:** Todas as tabelas de domínio contêm `tenant_id NOT NULL`, índices compostos com `tenant_id`, e a camada de repositório / Prisma injeta obrigatoriamente o filtro por tenant validado no token de autenticação.

## Decisão
Adotamos **Tabelas Compartilhadas com Coluna Discriminadora `tenant_id` obrigatória** em conjunto com validação estrita no backend e suporte opcional a PostgreSQL Row-Level Security (RLS). Nenhuma query de leitura ou mutação é executada sem o filtro explícito do `tenant_id` derivado do contexto autenticado.

## Consequências
- **Positivas:**
  - Baixíssimo overhead de conexões e memória no PostgreSQL compartilhado do servidor.
  - Simplicidade nas migrações do Prisma ORM (um único schema relacional central).
  - Alto desempenho em queries com índices indexando `(tenant_id, id)` e `(tenant_id, created_at)`.
- **Negativas:**
  - Exige disciplina no código da API para nunca esquecer o filtro de tenant (mitigado por middlewares e repositórios base padronizados).
- **Neutras / trade-offs aceitos:**
  - Backups são consolidados por banco; restauração individual de um único tenant requer extração por filtro de queries lógicas.
