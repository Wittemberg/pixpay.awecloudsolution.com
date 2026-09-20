# Proposal: Bootstrap Platform Runtime

## Why

A stack do Portainer falhou ao iniciar os serviços `api`, `web` e `worker` porque os entrypoints definidos no `deploy/stack.yml` (`apps/api/dist/main.js`, `apps/web/server.js` e `apps/worker/dist/main.js`) ainda não existiam compilados na imagem Docker. Esta mudança implementa os serviços fundamentais da Fase 0 (API REST com healthcheck `/api/health`, Web Dashboard minimalista com interface inicial e Worker de background com conexão Redis), garantindo que os containers subam saudáveis no Docker Swarm.

## What Changes

- Implementação do servidor base da API em `apps/api/dist/main.js` respondendo a `/api/health` e `/api/v1/health`.
- Implementação do servidor base do Frontend Web em `apps/web/server.js` servindo a interface web minimalista em `/` e `/api/health`.
- Implementação do runtime do Worker em `apps/worker/dist/main.js` escutando e gerenciando processos assíncronos.
- Atualização do `Dockerfile` multi-stage para copiar e empacotar todos os serviços na imagem final do GHCR.
- Garantia de que a verificação de saúde (`HEALTHCHECK`) no Docker e no Swarm convirja com sucesso.

## Capabilities

### New Capabilities
- `bootstrap-runtime`: Execução dos serviços essenciais de API, Web e Worker no Docker Swarm com healthchecks integrados.

### Modified Capabilities
*(Nenhuma modificação de capacidades prévias; este é o primeiro bootstrap funcional do runtime).*

## Impact

- Afeta os serviços `api`, `web` e `worker` definidos em `deploy/stack.yml`.
- Corrige o erro `MODULE_NOT_FOUND` de `/app/apps/api/dist/main.js`.
- Habilita o endpoint de verificação do Portainer e do pipeline de CI/CD (`https://pixpay.awecloudsolution.com/api/health`).
