# Design: Camada de Persistência Prisma ORM

## Arquitetura

```
packages/
└── database/
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   ├── schema.prisma         # Schema declarativo principal
    │   └── migrations/
    │       └── 20260921000000_init/
    │           └── migration.sql  # SQL gerado automaticamente
    └── src/
        └── index.ts              # Exporta PrismaClient singleton
```

### Integração com Apps

```typescript
// apps/api/src/main.ts
import { prisma } from '@pixpay/database';

// apps/worker/src/main.ts
import { prisma } from '@pixpay/database';
```

## Modelagem de Dados

### 1. Tenant (Organizações)
```prisma
model Tenant {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  status          String   @default("ACTIVE") // ACTIVE, SUSPENDED, DELETED
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relações
  tenant_users    TenantUser[]
  service_accounts ServiceAccount[]
  payment_accounts PaymentAccount[]
  payments        Payment[]
  audit_logs      AuditLog[]
  
  @@map("tenants")
}
```

### 2. User (Usuários do Sistema)
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  password_hash   String
  full_name       String
  status          String   @default("ACTIVE") // ACTIVE, SUSPENDED, DELETED
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relações
  tenant_users    TenantUser[]
  
  @@map("users")
}
```

### 3. TenantUser (Relacionamento Many-to-Many com Roles)
```prisma
model TenantUser {
  id              String   @id @default(cuid())
  tenant_id       String
  user_id         String
  role            String   // OWNER, ADMIN, VIEWER
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relações
  tenant          Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([tenant_id, user_id])
  @@index([user_id])
  @@map("tenant_users")
}
```

### 4. ServiceAccount (Tokens de IA/Bots)
```prisma
model ServiceAccount {
  id              String   @id @default(cuid())
  tenant_id       String
  name            String
  token_hash      String   @unique  // SHA-256 do token wpk_live_...
  scopes          String   // JSON array: ["payments:create", "payments:read"]
  status          String   @default("ACTIVE") // ACTIVE, REVOKED
  last_used_at    DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relações
  tenant          Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@index([tenant_id])
  @@map("service_accounts")
}
```

### 5. PaymentAccount (Credenciais de PSP)
```prisma
model PaymentAccount {
  id                      String   @id @default(cuid())
  tenant_id               String
  provider                String   // LOFYPAY, EFI, MERCADOPAGO
  environment             String   // SANDBOX, PRODUCTION
  encrypted_credentials   String   @db.Text  // AES-256-GCM encrypted JSON
  status                  String   @default("PENDING") // PENDING, ACTIVE, INVALID
  last_tested_at          DateTime?
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt
  
  // Relações
  tenant                  Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  payments                Payment[]
  
  @@unique([tenant_id, provider, environment])
  @@index([tenant_id])
  @@map("payment_accounts")
}
```

### 6. Payment (Cobranças PIX)
```prisma
model Payment {
  id                  String   @id @default(cuid())
  tenant_id           String
  payment_account_id  String
  provider_payment_id String?  // ID externo no PSP
  amount              Decimal  @db.Decimal(10, 2)
  currency            String   @default("BRL")
  description         String
  customer_name       String?
  customer_document   String?
  status              String   @default("PENDING") // PENDING, PAID, EXPIRED, CANCELLED
  pix_copy_paste      String   @db.Text
  qr_code_url         String?  @db.Text
  expires_at          DateTime
  paid_at             DateTime?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  
  // Relações
  tenant              Tenant          @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  payment_account     PaymentAccount  @relation(fields: [payment_account_id], references: [id])
  payment_events      PaymentEvent[]
  
  @@index([tenant_id, created_at])
  @@index([tenant_id, status])
  @@index([provider_payment_id])
  @@map("payments")
}
```

### 7. PaymentEvent (Histórico Imutável de Transições)
```prisma
model PaymentEvent {
  id              String   @id @default(cuid())
  payment_id      String
  event_type      String   // CREATED, PAID, EXPIRED, CANCELLED, REFUNDED
  previous_status String?
  new_status      String
  source          String   // WEBHOOK, RECONCILIATION, MANUAL, API
  metadata        String?  @db.Text  // JSON com detalhes adicionais
  created_at      DateTime @default(now())
  
  // Relações
  payment         Payment  @relation(fields: [payment_id], references: [id], onDelete: Cascade)
  
  @@index([payment_id])
  @@index([created_at])
  @@map("payment_events")
}
```

### 8. WebhookEvent (Payloads Brutos de Webhooks)
```prisma
model WebhookEvent {
  id              String   @id @default(cuid())
  provider        String   // LOFYPAY
  event_type      String?
  raw_payload     String   @db.Text  // JSON bruto recebido
  signature       String?
  processed       Boolean  @default(false)
  processed_at    DateTime?
  error_message   String?  @db.Text
  created_at      DateTime @default(now())
  
  @@index([provider, created_at])
  @@index([processed])
  @@map("webhook_events")
}
```

### 9. AuditLog (Trilha de Auditoria de Segurança)
```prisma
model AuditLog {
  id              String   @id @default(cuid())
  tenant_id       String
  user_id         String?
  service_account_id String?
  action          String   // LOGIN, LOGOUT, CREATE_PAYMENT, REVOKE_TOKEN, etc.
  resource_type   String?  // Payment, ServiceAccount, User, etc.
  resource_id     String?
  ip_address      String?
  user_agent      String?  @db.Text
  metadata        String?  @db.Text  // JSON com contexto adicional
  created_at      DateTime @default(now())
  
  // Relações
  tenant          Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@index([tenant_id, created_at])
  @@index([action])
  @@map("audit_logs")
}
```

## Decisões Técnicas

### Connection Pool
```typescript
// packages/database/src/index.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
});

// Configuração do pool (via DATABASE_URL query params)
// ?connection_limit=10&pool_timeout=20
```

### Middleware de Tenant Isolation
```typescript
// Exemplo futuro (não implementado nesta mudança)
prisma.$use(async (params, next) => {
  // Injetar tenant_id automaticamente em todas as queries
  // Implementação específica virá em mudança futura
  return next(params);
});
```

### Graceful Shutdown
```typescript
// apps/api/src/main.ts
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

## Constraints e Validações

- `tenant_id` obrigatório em todas as tabelas de domínio (NOT NULL)
- Índices compostos `(tenant_id, created_at)` para queries de histórico eficientes
- UUIDs com `cuid()` para IDs públicos (mais curtos e URL-safe que UUID v4)
- `@updatedAt` automático em tabelas mutáveis
- Cascata de deleção apenas onde apropriado (ex: TenantUser → Tenant)

## Impacto nos Serviços

### apps/api
- Substituir estado em memória por queries Prisma
- Implementar repositories pattern em mudanças futuras
- Manter compatibilidade com endpoints REST atuais

### apps/worker
- Conectar ao mesmo banco via `DATABASE_URL`
- Processar webhooks gravando em `webhook_events` e `payment_events`
- Reconciliação periódica via queries de `payments` pendentes

## Compatibilidade com PostgreSQL 18

- Prisma 5.x/6.x suporta totalmente PostgreSQL 18.6
- Syntax gerada é compatível com `pg` driver
- Connection string: `postgresql://user:pass@postgres:5432/pixpay?schema=public`
