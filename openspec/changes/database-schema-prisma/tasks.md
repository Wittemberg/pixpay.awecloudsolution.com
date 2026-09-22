# Tasks: Implementação da Camada de Persistência Prisma

## Task 1: Criar estrutura do pacote `packages/database`
**Status:** DONE  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [x] Diretório `packages/database` criado
- [x] `package.json` com nome `@pixpay/database` e dependências Prisma
- [x] `tsconfig.json` configurado para compilar para `dist/`
- [x] Estrutura de pastas: `prisma/` e `src/`

### Implementation Notes
```json
{
  "name": "@pixpay/database",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Task 2: Criar schema Prisma completo
**Status:** DONE  
**Assignee:** -  
**Estimated effort:** 2h  

### Acceptance Criteria
- [x] Arquivo `packages/database/prisma/schema.prisma` criado
- [x] Configuração do datasource PostgreSQL
- [x] Configuração do generator client
- [x] 9 models definidos conforme design.md
- [x] Todos os índices e constraints declarados
- [x] Relações e cascatas configuradas

### Implementation Notes
- Usar `cuid()` para IDs (mais curtos que UUID v4)
- `@map()` para nomear tabelas em snake_case
- `@db.Text` para campos JSON e longos
- `@db.Decimal(10, 2)` para valores monetários

---

## Task 3: Gerar migration inicial
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [ ] Migration `20260921000000_init` gerada via `prisma migrate dev --name init`
- [ ] Arquivo `migration.sql` validado manualmente
- [ ] SQL compatível com PostgreSQL 18.6
- [ ] Todas as 9 tabelas criadas
- [ ] Índices criados corretamente

### Implementation Notes
```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
```

### Validation
- Inspecionar o SQL gerado em `prisma/migrations/*/migration.sql`
- Verificar sintaxe de índices compostos: `CREATE INDEX idx_payments_tenant_created ON payments(tenant_id, created_at)`

---

## Task 4: Implementar PrismaClient singleton exportável
**Status:** DONE  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [x] Arquivo `packages/database/src/index.ts` criado
- [x] PrismaClient singleton instanciado
- [x] Configuração de logs baseada em `NODE_ENV`
- [x] Exportação de tipos principais (`Tenant`, `User`, `Payment`, etc.)
- [x] Build TypeScript gerando `dist/index.js` e `dist/index.d.ts`

### Implementation Notes
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export tipos principais
export type { Tenant, User, Payment, PaymentEvent, AuditLog } from '@prisma/client';
```

---

## Task 5: Configurar workspace no root package.json
**Status:** DONE  
**Assignee:** -  
**Estimated effort:** 15 min  

### Acceptance Criteria
- [x] `package.json` do root atualizado com workspace `packages/*`
- [x] `@pixpay/database` referenciável por apps via workspace link
- [x] `npm install` ou `pnpm install` no root funciona sem erros

### Implementation Notes
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

---

## Task 6: Atualizar Dockerfile para suportar Prisma
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 45 min  

### Acceptance Criteria
- [ ] Dockerfile copia `packages/database/` para o container
- [ ] `prisma generate` executado no build
- [ ] Migration automática via `prisma migrate deploy` no entrypoint
- [ ] Healthcheck aguarda DB estar pronto antes de reportar healthy

### Implementation Notes
```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Copiar workspaces
COPY package*.json ./
COPY packages/database ./packages/database
COPY apps ./apps

# Install dependencies e gerar Prisma Client
RUN npm install --production && \
    cd packages/database && \
    npx prisma generate

# Runtime
FROM base AS runtime
ENV NODE_ENV=production

# Entrypoint com migration automática
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

### Validation
- Build local: `docker build -t pixpay:test .`
- Verificar que `prisma generate` roda sem erros
- Verificar que o client está em `node_modules/.prisma/client`

---

## Task 7: Criar script de migration automática no entrypoint
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [ ] Script `scripts/docker-entrypoint.sh` criado
- [ ] Executa `prisma migrate deploy` antes de iniciar o serviço
- [ ] Aguarda PostgreSQL estar disponível (retry loop)
- [ ] Logs estruturados de progresso
- [ ] Falha graciosamente se migration falhar

### Implementation Notes
```bash
#!/bin/sh
set -e

echo "Aguardando PostgreSQL estar disponível..."
until nc -z postgres 5432; do
  sleep 1
done

echo "Aplicando migrations do Prisma..."
cd /app/packages/database
npx prisma migrate deploy

echo "Iniciando serviço..."
exec "$@"
```

---

## Task 8: Integrar Prisma no apps/api
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 1h  

### Acceptance Criteria
- [ ] `apps/api/package.json` referencia `@pixpay/database` via workspace
- [ ] Import `import { prisma } from '@pixpay/database'` funciona
- [ ] Endpoint `/api/health` reporta status da conexão com DB
- [ ] Graceful shutdown desconecta Prisma: `prisma.$disconnect()`
- [ ] Nenhum erro de compilação TypeScript

### Implementation Notes
```typescript
// apps/api/src/main.js (futuro refactor para .ts)
import { prisma } from '@pixpay/database';

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## Task 9: Integrar Prisma no apps/worker
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [ ] `apps/worker/package.json` referencia `@pixpay/database` via workspace
- [ ] Import `import { prisma } from '@pixpay/database'` funciona
- [ ] Worker conecta ao banco no startup
- [ ] Graceful shutdown desconecta Prisma
- [ ] Logs indicam conexão bem-sucedida

---

## Task 10: Atualizar stack.yml para incluir netcat no container
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 15 min  

### Acceptance Criteria
- [ ] Imagem base inclui `netcat-openbsd` para o entrypoint script
- [ ] Ou usar alternativa Alpine: `nc` (busybox) ou substituir por check direto em Node.js

### Implementation Notes
```dockerfile
RUN apk add --no-cache netcat-openbsd
```

Ou substituir por check em Node:
```javascript
// Aguardar DB via TCP check nativo Node.js
```

---

## Task 11: Validar migração no ambiente local
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 1h  

### Acceptance Criteria
- [ ] Migration aplicada com sucesso em PostgreSQL 18.6 local
- [ ] Todas as 9 tabelas criadas
- [ ] Índices verificados via `\d+ tablename` no psql
- [ ] Constraints e foreign keys validadas
- [ ] Client Prisma gera tipos sem erros

### Validation Commands
```bash
# Conectar ao PostgreSQL
docker exec -it <postgres_container> psql -U postgres -d pixpay

# Verificar tabelas
\dt

# Verificar índices de uma tabela
\d+ payments

# Verificar constraints
\d+ tenant_users
```

---

## Task 12: Atualizar documentação e estado-atual.md
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 30 min  

### Acceptance Criteria
- [ ] `docs/estado-atual.md` atualizado com novo marco de persistência
- [ ] README.md atualizado com comandos Prisma
- [ ] AGENTS.md atualizado com referência ao pacote database
- [ ] Changelog ou commit message descritivo

### Implementation Notes
- Mencionar que a camada de persistência está pronta
- Próxima fase: implementar autenticação e repositórios de domínio
- Link para spec: `openspec/specs/database-foundation/spec.md`

---

## Task 13: Criar spec OpenSpec database-foundation
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 1h  

### Acceptance Criteria
- [ ] Arquivo `openspec/changes/database-schema-prisma/specs/database-foundation/spec.md` criado
- [ ] Requirements definidos conforme padrão OpenSpec
- [ ] Scenarios de teste descritos (connection, migration, query)
- [ ] Delta type definido: `ADDED`

---

## Task 14: Validar com OpenSpec CLI
**Status:** TODO  
**Assignee:** -  
**Estimated effort:** 15 min  

### Acceptance Criteria
- [ ] Comando executado: `npx @fission-ai/openspec validate database-schema-prisma --strict`
- [ ] Validação passa sem erros
- [ ] Todos os artefatos presentes e estruturados corretamente

---

## Summary

**Total estimated effort:** ~10 horas  
**Critical path:** Tasks 1 → 2 → 3 → 4 → 6 → 7 → 11  
**Parallel tracks:** Tasks 8 e 9 podem ser feitas em paralelo após Task 4  

**Dependencies:**
- PostgreSQL 18.6 rodando e acessível em `postgres:5432`
- `DATABASE_URL` configurada no `.env` dos containers
- Node.js 20+ no ambiente de desenvolvimento
