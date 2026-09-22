# @pixpay/database

Camada de persistência do PIXPAY com Prisma ORM e PostgreSQL 18.6.

## Estrutura

```
packages/database/
├── prisma/
│   ├── schema.prisma        # Schema declarativo (9 models)
│   └── migrations/          # Migrations versionadas
├── src/
│   └── index.ts             # PrismaClient singleton + exports
├── package.json
├── tsconfig.json
└── README.md
```

## Models

- **Tenant** - Organizações multi-tenant
- **User** - Usuários do sistema
- **TenantUser** - Relacionamento many-to-many com roles
- **ServiceAccount** - Tokens de IA/Bots (Hermes Agent)
- **PaymentAccount** - Credenciais criptografadas de PSP
- **Payment** - Cobranças PIX
- **PaymentEvent** - Histórico imutável de transições (append-only)
- **WebhookEvent** - Payloads brutos de webhooks (append-only)
- **AuditLog** - Trilha de auditoria de segurança (append-only)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar DATABASE_URL

```bash
cp .env.example .env
# Editar .env com a connection string real
```

### 3. Gerar Prisma Client

```bash
npm run generate
```

### 4. Criar e aplicar migrations

```bash
# Desenvolvimento (cria migration + aplica)
npm run migrate:dev -- --name init

# Produção (apenas aplica migrations pendentes)
npm run migrate:deploy
```

## Comandos

```bash
npm run generate          # Gera Prisma Client
npm run migrate:dev       # Cria e aplica migration (dev)
npm run migrate:deploy    # Aplica migrations (prod)
npm run migrate:reset     # Reset completo do banco
npm run studio            # Abre Prisma Studio (GUI)
npm run build             # Compila TypeScript
```

## Uso nas Aplicações

### Importar client

```typescript
import { prisma } from '@pixpay/database';

// Query exemplo
const tenants = await prisma.tenant.findMany({
  where: { status: 'ACTIVE' }
});
```

### Importar tipos

```typescript
import type { Payment, Tenant } from '@pixpay/database';

const payment: Payment = {
  // Type-safe!
};
```

## Multi-tenancy

Todas as tabelas de domínio (exceto `users` e `webhook_events`) possuem:

- Coluna `tenant_id NOT NULL`
- Índices compostos `(tenant_id, created_at)` ou `(tenant_id, status)`
- Cascata de deleção quando apropriado

**Importante:** As aplicações DEVEM sempre filtrar por `tenant_id` em queries de leitura e escrita.

## Segurança

- Credenciais de PSP são armazenadas em `payment_accounts.encrypted_credentials` (AES-256-GCM)
- Audit logs capturam todas as ações sensíveis
- Event sourcing garante histórico imutável de pagamentos

## Connection Pool

Configuração recomendada via query params na `DATABASE_URL`:

```
?connection_limit=10&pool_timeout=20
```

## Graceful Shutdown

```typescript
// apps/api/src/main.ts ou apps/worker/src/main.ts
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## Referências

- [ADR-003: Multi-tenant Discriminator](../../docs/adrs/003-multi-tenant-discriminator-rls.md)
- [ADR-006: Event Sourcing and Audit](../../docs/adrs/006-event-sourcing-and-audit.md)
- [OpenSpec: database-foundation](../../openspec/changes/database-schema-prisma/specs/database-foundation/spec.md)
