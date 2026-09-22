<!-- harness-skills:start -->
## Biblioteca de desenvolvimento de Wittemberg

Leia [.harness/AGENTS.md](.harness/AGENTS.md) para selecionar skills e padrões aplicáveis à tarefa. Os caminhos desse documento são relativos à pasta `.harness/`.

Preserve as decisões e instruções deste projeto. Use a biblioteca sob demanda, sem carregar todos os snapshots ou ativar ferramentas externas automaticamente.
<!-- harness-skills:end -->

## Projeto PIXPAY (pixpay.awecloudsolution.com)

- Leia `docs/estado-atual.md` e a mudança ativa antes de implementar.
- Siga rigorosamente `.harness/docs/manual.md`. Uma mudança OpenSpec por vez.
- Documento Mestre de Especificação em `docs/PIXPAY_DOCUMENTO_MESTRE.md`.
- PRDs de produto em `docs/prds/` (PRD global / roadmap em `docs/prd.md`).
- Arquitetura técnica global em `docs/trd.md` e decisões duráveis em `docs/adrs/`.
- Tarefas canônicas no ciclo OpenSpec (`openspec/changes/`); não criar listas concorrentes.
- Stack no Portainer / Docker Swarm conectado à rede `interna` via Traefik v3 (`letsencryptresolver`).
- PostgreSQL 18.6 gerenciado na rede Swarm overlay (`postgres:5432` - DNS interno Docker).
- Prisma ORM 5.22.0 com migrations automáticas via docker-entrypoint.sh.
- Node.js 26.9.0 runtime com HTTP server nativo (sem Express).
- Monorepo workspace: `packages/database` (Prisma Client singleton) + `apps/api` + `apps/worker`.
- Multi-tenancy via `tenant_id` discriminator + modo single-tenant provisório com `DEFAULT_TENANT_ID = 'default-tenant'`.
- Nunca versionar segredos, chaves secretas de PSP, URLs de webhook ou credenciais no repositório.
- A IA interpreta intenção via MCP; o backend valida, autoriza e executa. O Hermes nunca recebe credenciais financeiras.
- Premissas inferidas devem estar sempre visíveis. Não assumir comportamento financeiro sem verificação.
