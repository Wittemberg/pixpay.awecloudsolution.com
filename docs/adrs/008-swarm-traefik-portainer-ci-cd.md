---
adr_number: "008"
status: aceito
created: 2026-09-20
supersedes: ""
superseded_by: ""
---

# ADR 008: Implantação Contínua em Docker Swarm via Traefik v3, GHCR e Portainer Webhook

## Contexto
O servidor de produção (IP `177.136.234.234`, host `servidor`) opera com Docker Swarm, Traefik v3 (`drb6ch7fgzeeujx0tseptpi2j`) como proxy reverso com certificados automáticos Let's Encrypt, Portainer EE (`wit-portainer.awecloudsolution.com`) e rede overlay interna (`interna`). O domínio `pixpay.awecloudsolution.com` já está configurado via CNAME. É necessário automatizar a entrega contínua sem intervenção manual no servidor e sem expor credenciais SSH em pipelines.

## Alternativas Consideradas
- **Deploy via SSH Direto no GitHub Actions:** Executar comandos SSH na máquina pelo runner do GitHub. (Descartado: expõe porta SSH na pipeline e não utiliza a infraestrutura nativa do Portainer).
- **Polling Periódico de Imagens (Watchtower):** Atualização periódica por intervalo de tempo. (Descartado: pouco controle sobre rollback e tempo de convergência).
- **Stack Swarm no Portainer com Imagens no GHCR e Trigger via Webhook:** GitHub Actions compila imagens Docker multi-stage, publica no GitHub Container Registry (`ghcr.io`), e dispara o webhook secreto da stack no Portainer, verificando em seguida a convergência pelo endpoint `/api/health`.

## Decisão
Adotamos o pipeline de **Publicação no GHCR + Trigger de Stack Webhook no Portainer + Verificação de Convergência via Script Python**:
1. Build de imagem única multi-stage otimizada com tags `main` e `sha-${REVISION}`.
2. Push seguro autenticado no `ghcr.io` usando `GITHUB_TOKEN`.
3. Disparo de webhook POST seguro no Portainer (`https://wit-portainer.awecloudsolution.com/api/stacks/webhooks/...`), passando `IMAGE_TAG=sha-...`.
4. Roteamento pelo Traefik v3 na rede overlay `interna` com regras para `Host(`pixpay.awecloudsolution.com`)`.
5. Verificação da saúde pelo script `scripts/deploy.py` conferindo o endpoint `/api/health`.

## Consequências
- **Positivas:**
  - Zero exposição de chaves SSH em pipelines de CI/CD.
  - Atualização atômica gerenciada pelo Docker Swarm com política de rollback automático (`update_config.failure_action: rollback`).
  - Aproveitamento total dos recursos existentes (Portainer EE, Traefik, Let's Encrypt).
- **Negativas:**
  - A URL do webhook do Portainer contém um token secreto que deve ser protegido como secret no GitHub (`PORTAINER_STACK_WEBHOOK`).
- **Neutras / trade-offs aceitos:**
  - A compilação da imagem ocorre nos runners do GitHub Actions, poupando a CPU e memória do servidor de produção (4GB RAM).
