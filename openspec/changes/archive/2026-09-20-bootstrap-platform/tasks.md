# Tasks: Bootstrap Platform Services

- [x] 1. Criar o entrypoint da API em `apps/api/dist/main.js` com rotas `/api/health`, `/api/v1/health` e `/mcp`. <!-- id: 1 -->
- [x] 2. Criar o entrypoint do Frontend Web em `apps/web/server.js` servindo a interface web minimalista. <!-- id: 2 -->
- [x] 3. Criar o entrypoint do Worker em `apps/worker/dist/main.js` com tratamento de sinais e logs estruturados. <!-- id: 3 -->
- [x] 4. Atualizar o `Dockerfile` para incluir a estrutura de `apps/` na imagem final. <!-- id: 4 -->
- [x] 5. Compilar localmente a imagem Docker com as tags `main` e tag local de teste. <!-- id: 5 -->
- [x] 6. Validar a execução dos 3 containers e testar os healthchecks via HTTP. <!-- id: 6 -->
- [x] 7. Validar os artefatos com `openspec validate bootstrap-platform --strict`. <!-- id: 7 -->
