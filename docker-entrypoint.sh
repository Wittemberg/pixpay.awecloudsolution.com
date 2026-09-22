#!/bin/sh
set -e

# Aguarda disponibilidade do PostgreSQL
echo "Waiting for PostgreSQL..."
until nc -z -v -w30 postgres 5432; do
  echo "Waiting for database connection..."
  sleep 2
done
echo "PostgreSQL is available"

# Executa migrations Prisma se DATABASE_URL estiver configurada
if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  cd /app/packages/database
  npx prisma migrate deploy
  cd /app
fi

# Executa o comando passado como argumento
exec "$@"
