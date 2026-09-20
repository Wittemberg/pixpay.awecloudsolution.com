# Design: Bootstrap Platform Services

## Architecture Overview

Para resolver a ausência dos arquivos executáveis exigidos por `deploy/stack.yml`, implementamos os serviços fundamentais em Node.js puro e robusto com zero dependências externas pesadas no runtime inicial:

```
apps/
├── api/
│   └── dist/
│       └── main.js       # Servidor HTTP nativo Node.js escutando na porta 3000
├── web/
│   └── server.js         # Servidor HTTP servindo dashboard HTML5/CSS3 na porta 3001
└── worker/
    └── dist/
        └── main.js       # Runtime de background worker com loop de eventos
```

## Technical Decisions

1. **Serviço API (`apps/api/dist/main.js`):**
   - Cria um servidor HTTP nativo (`http.createServer`).
   - Responde `GET /api/health` com JSON estruturado contendo status, revision e timestamp.
   - Responde rotas `/api/v1/*` iniciais e `/mcp` com headers de CORS e JSON adequados.
   - Trata shutdown gracioso (`SIGTERM` / `SIGINT`).
2. **Serviço Web (`apps/web/server.js`):**
   - Servidor HTTP nativo na porta 3001 servindo a UI minimalista com design responsivo (Dark Mode moderno, padrão Wittemberg, calculadora de PIX com Copia e Cola e simulação de QR Code).
3. **Serviço Worker (`apps/worker/dist/main.js`):**
   - Inicializa com logs estruturados em JSON, monitora a conectividade com `REDIS_URL` e mantém o processo vivo aguardando jobs de reconciliação e webhooks.
4. **Empacotamento Dockerfile:**
   - O `Dockerfile` copia os diretórios `apps/` para a imagem `/app` e assegura permissões adequadas de execução.
