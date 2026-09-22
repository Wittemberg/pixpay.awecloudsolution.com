# Proposal: Camada de Persistência com Prisma ORM e PostgreSQL

## Motivação

O PIXPAY atualmente opera com dados em memória nos serviços `api` e `worker`. Para avançar com autenticação real, multi-tenancy, gestão de credenciais criptografadas e histórico imutável de pagamentos, precisamos de persistência relacional com:

1. **Segregação multi-tenant estrita:** Coluna `tenant_id NOT NULL` em todas as tabelas de domínio com índices compostos
2. **Integridade referencial:** Chaves estrangeiras com cascata apropriada
3. **Auditoria imutável:** Tabelas append-only `payment_events`, `webhook_events` e `audit_logs`
4. **Type safety:** Client Prisma com tipos TypeScript gerados automaticamente
5. **Migrations versionadas:** Controle de esquema via `prisma migrate`

## Objetivos

- Criar o pacote `packages/database` com Prisma Schema completo
- Modelar as 9 tabelas principais do sistema
- Gerar a migration inicial (`001_init`)
- Exportar client Prisma compartilhado para `apps/api` e `apps/worker`
- Garantir compatibilidade com PostgreSQL 18.6 existente no Swarm

## Não-Objetivos

- Implementação de repositórios de aplicação (fica para mudanças futuras específicas por feature)
- Seeds de dados de desenvolvimento (será tratado em mudança separada)
- Row-Level Security (RLS) no PostgreSQL (ADR-003 deixa como opcional; implementação fica no backend)
- Migração de dados em memória para o banco (não há dados reais para migrar)

## Alternativas Consideradas

### Alternativa 1: TypeORM
- **Prós:** Popular no ecossistema NestJS, decorators familiares
- **Contras:** Type safety inferior, migrations menos robustas, Active Record pode criar acoplamento

### Alternativa 2: Kysely
- **Prós:** Type safety excelente, SQL builder puro
- **Contras:** Não gera migrations automaticamente, menos conveniente para prototipagem rápida

### Alternativa 3: Prisma ORM (ESCOLHIDA)
- **Prós:** Schema declarativo legível, migrations automáticas, type safety completo, client otimizado, suporte nativo a PostgreSQL 18
- **Contras:** DSL proprietária, menos flexibilidade em queries complexas (mitigado com `$queryRaw` quando necessário)
- **Justificativa:** Já definido no TRD e melhor equilíbrio entre produtividade e segurança de tipos

## Impactos

- **Breaking changes:** Nenhum. A API REST atual não possui dados persistidos reais
- **Performance:** Conexões pool otimizado; índices compostos por `tenant_id`
- **Segurança:** Credenciais LofyPay serão criptografadas em `payment_accounts.encrypted_credentials`
- **Deployment:** Migration automática via `prisma migrate deploy` antes do start do container

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Incompatibilidade com PostgreSQL 18.6 | Baixa | Alto | Prisma suporta PG 18; validar sintaxe gerada |
| Migration falhar no primeiro deploy | Média | Médio | Testar localmente; migration idempotente |
| Overhead de memória no container | Baixa | Baixo | Connection pool limitado a 10 conexões |

## Critérios de Sucesso

- Migration `001_init.sql` aplicada com sucesso no PostgreSQL 18.6
- Client Prisma gerando tipos TypeScript sem erros
- Todas as 9 tabelas criadas com índices apropriados
- `apps/api` e `apps/worker` conseguem importar `@pixpay/database`
- Validação OpenSpec passa: `npx @fission-ai/openspec validate database-schema-prisma --strict`
