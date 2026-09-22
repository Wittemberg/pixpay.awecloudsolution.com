# database-foundation Specification

## Purpose
Estabelecer a camada de persistência relacional do PIXPAY com Prisma ORM, garantindo segregação multi-tenant estrita, integridade referencial e auditoria imutável de eventos de pagamento conforme ADR-003 e ADR-006.

## ADDED Requirements

### Requirement: Database Schema Initialization
The database package SHALL provide a complete Prisma schema defining all core entities with proper indexes and constraints.

#### Scenario: Schema includes all required tables
- GIVEN the Prisma schema is defined in `packages/database/prisma/schema.prisma`
- WHEN the schema is inspected
- THEN it SHALL contain exactly 9 models: `Tenant`, `User`, `TenantUser`, `ServiceAccount`, `PaymentAccount`, `Payment`, `PaymentEvent`, `WebhookEvent`, `AuditLog`

#### Scenario: Multi-tenant isolation enforced at schema level
- GIVEN any domain table in the schema
- WHEN the model is inspected
- THEN it SHALL contain a `tenant_id` field (except `User`, `WebhookEvent`)
- AND composite indexes SHALL include `tenant_id` as the first column
- AND foreign keys to `Tenant` SHALL use `onDelete: Cascade`

### Requirement: Migration Generation and Application
The database package SHALL generate idempotent SQL migrations compatible with PostgreSQL 18.

#### Scenario: Initial migration creates all tables
- GIVEN the Prisma schema is complete
- WHEN `prisma migrate dev --name init` is executed
- THEN a migration file SHALL be created in `prisma/migrations/`
- AND the migration SQL SHALL create all 9 tables
- AND all indexes SHALL be created
- AND all foreign key constraints SHALL be created

#### Scenario: Migration applies successfully to PostgreSQL 18.6
- GIVEN PostgreSQL 18.6 is running and accessible
- WHEN `prisma migrate deploy` is executed
- THEN the migration SHALL apply without errors
- AND all tables SHALL exist in the `public` schema
- AND all indexes SHALL be created correctly

### Requirement: Type-Safe Client Generation
The database package SHALL export a type-safe Prisma client with all generated types.

#### Scenario: Prisma client generates TypeScript types
- GIVEN the schema is defined
- WHEN `prisma generate` is executed
- THEN TypeScript types SHALL be generated in `node_modules/@prisma/client`
- AND the types SHALL include all models and their relations
- AND the types SHALL be importable from `@pixpay/database`

#### Scenario: Client can be imported by applications
- GIVEN the database package is built
- WHEN an application imports `{ prisma } from '@pixpay/database'`
- THEN the import SHALL succeed without TypeScript errors
- AND the client SHALL be ready for database operations

### Requirement: Database Connection Health Check
The database package SHALL provide connection validation capability.

#### Scenario: Health check validates database connectivity
- GIVEN the Prisma client is instantiated
- WHEN `prisma.$queryRaw\`SELECT 1\`` is executed
- THEN the query SHALL complete successfully if the database is reachable
- OR SHALL throw an error if the database is unreachable

### Requirement: Graceful Shutdown and Connection Cleanup
Applications using the database package SHALL properly disconnect on termination.

#### Scenario: Application disconnects on SIGTERM
- GIVEN an application has imported the Prisma client
- WHEN a SIGTERM signal is received
- THEN `prisma.$disconnect()` SHALL be called
- AND all active connections SHALL be closed gracefully

### Requirement: Immutable Event Logging
The schema SHALL support append-only event tables for audit trails.

#### Scenario: PaymentEvent table is append-only
- GIVEN the `PaymentEvent` model is defined
- WHEN the table structure is inspected
- THEN it SHALL NOT have an `updated_at` field
- AND it SHALL have a `created_at` field with default `now()`
- AND it SHALL have a foreign key to `Payment` with cascade delete

#### Scenario: AuditLog captures security events
- GIVEN the `AuditLog` model is defined
- WHEN the table structure is inspected
- THEN it SHALL contain fields: `tenant_id`, `action`, `ip_address`, `user_agent`, `metadata`
- AND it SHALL have an index on `(tenant_id, created_at)`

### Requirement: Encrypted Credentials Storage
The schema SHALL support encrypted storage of payment provider credentials.

#### Scenario: PaymentAccount stores encrypted credentials
- GIVEN the `PaymentAccount` model is defined
- WHEN the table structure is inspected
- THEN it SHALL have an `encrypted_credentials` field of type `Text`
- AND it SHALL have a unique constraint on `(tenant_id, provider, environment)`

### Requirement: Decimal Precision for Monetary Values
Monetary amounts SHALL use fixed-point decimal types to prevent rounding errors.

#### Scenario: Payment amount uses Decimal type
- GIVEN the `Payment` model is defined
- WHEN the `amount` field is inspected
- THEN it SHALL be of type `Decimal` with precision `@db.Decimal(10, 2)`
- AND the `currency` field SHALL default to `"BRL"`

## Non-Functional Requirements

### Performance
- Initial migration SHALL complete in under 5 seconds on PostgreSQL 18.6
- Prisma client generation SHALL complete in under 10 seconds
- Connection pool SHALL be limited to 10 connections per service

### Security
- `tenant_id` SHALL be non-nullable in all domain tables (except global tables)
- Foreign keys SHALL enforce referential integrity
- No plain-text credentials SHALL be stored in the schema

### Maintainability
- Schema SHALL use descriptive model and field names
- Indexes SHALL be named explicitly for clarity
- Migrations SHALL be version-controlled and reviewable

## Out of Scope
- Row-Level Security (RLS) policies in PostgreSQL (handled at application level)
- Database seeds or test fixtures (separate change)
- Repository pattern implementation (application layer concern)
- Connection pooling configuration beyond defaults (tuned via connection string)
