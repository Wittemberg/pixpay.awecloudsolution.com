import { PrismaClient } from '@prisma/client';

// Singleton pattern para evitar múltiplas instâncias em desenvolvimento
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export tipos principais para uso nas aplicações
export type {
  Tenant,
  User,
  TenantUser,
  ServiceAccount,
  PaymentAccount,
  Payment,
  PaymentEvent,
  WebhookEvent,
  AuditLog,
  Prisma,
} from '@prisma/client';
