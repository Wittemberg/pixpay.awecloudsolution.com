# Guia de Configuração: GHCR, Portainer Registry, Stack e GitHub Actions

Este documento fornece o passo a passo exato para habilitar a entrega contínua (CI/CD) do projeto **PIXPAY** (`pixpay.awecloudsolution.com`).

---

## 1. Criação do Token de Acesso no GitHub (PAT) para o GHCR

Para que o Portainer consiga baixar imagens privadas do GitHub Container Registry (`ghcr.io`), é necessário gerar um Personal Access Token (PAT).

1. No GitHub, acesse seu perfil no canto superior direito e vá em **Settings** (ou acesse direto: `https://github.com/settings/tokens`).
2. No menu lateral esquerdo, clique em **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
3. Clique no botão **Generate new token** > **Generate new token (classic)**.
4. Preencha os campos:
   - **Note:** `Portainer GHCR - PIXPAY e Stacks`
   - **Expiration:** Escolha a validade desejada (recomendado: 90 dias ou No expiration para infraestrutura contínua).
   - **Select scopes:**
     - Marque `read:packages` (Download packages from GitHub Package Registry).
     - Marque `write:packages` (opcional, para testes locais de push se necessário).
5. Clique em **Generate token** no final da página.
6. **IMPORTANTE:** Copie o token gerado (`ghp_...`). Ele não será exibido novamente.

---

## 2. Cadastro da Registry `ghcr.io` no Portainer

Com o token em mãos, registre o `ghcr.io` no Portainer do servidor:

1. Acesse o Portainer em: `https://wit-portainer.awecloudsolution.com`
2. No menu lateral esquerdo, clique em **Registries**.
3. Clique no botão **+ Add registry**.
4. Selecione o provedor **Custom registry**:
   - **Name:** `GitHub Container Registry` (ou `ghcr.io`)
   - **Registry URL:** `ghcr.io`
   - **Authentication:** Ative a chave (toggle ligado).
   - **Username:** `wittemberg` (seu usuário GitHub)
   - **Password / Secret:** Cole o token PAT gerado no Passo 1 (`ghp_...`).
5. Clique em **Add registry**.
6. A registry aparecerá na listagem com status pronto para autenticação nos pulls do Swarm.

---

## 3. Criação da Stack `pixpay` no Portainer e Habilitação do Webhook

1. No Portainer, selecione o ambiente **Primary / Local** (Docker Swarm).
2. No menu lateral, clique em **Stacks**.
3. Clique no botão **+ Add stack**.
4. Configure os dados da stack:
   - **Name:** `pixpay`
   - **Build method:** Selecione **Web editor**.
   - **Web editor:** Cole o conteúdo do arquivo [deploy/stack.yml](file:///var/www/pixpay.awecloudsolution.com/deploy/stack.yml).
5. **Environment variables (Variáveis de Ambiente da Stack):**
   Adicione as seguintes variáveis na seção inferior do Portainer:
   - `IMAGE_TAG`: `main`
   - `POSTGRES_PASSWORD`: senha do PostgreSQL do servidor (padrão local configurado na stack postgres)
   - `JWT_SECRET`: uma chave aleatória segura (ex.: gerar no terminal com `openssl rand -hex 32`)
   - `ENCRYPTION_KEY`: chave de 32 bytes em hexadecimal (64 caracteres) gerada com `openssl rand -hex 32`
6. **Habilitar Webhook de Atualização Automática:**
   - Na seção **Stack webhook**, marque a opção **Create a stack webhook**.
   - Um link será gerado no formato:
     `https://wit-portainer.awecloudsolution.com/api/stacks/webhooks/SEU-TOKEN-UNICO-AQUI`
   - **Copie essa URL completa.** Ela será utilizada no GitHub Actions.
7. Clique no botão **Deploy the stack**.
8. O Swarm provisionará os serviços `pixpay_redis`, `pixpay_api`, `pixpay_web` e `pixpay_worker` na rede `interna` com roteamento pelo Traefik.

---

## 4. Configuração das Secrets e Variables no GitHub

No repositório do projeto no GitHub (`https://github.com/Wittemberg/pixpay.awecloudsolution.com`):

### 4.1 Secrets do Repositório
1. Vá em **Settings** > **Secrets and variables** > **Actions**.
2. Na aba **Secrets**, clique em **New repository secret**:
   - **Name:** `PORTAINER_STACK_WEBHOOK`
   - **Secret:** Cole a URL completa do webhook gerada no Portainer:
     `https://wit-portainer.awecloudsolution.com/api/stacks/webhooks/...`
3. Clique em **Add secret**.

### 4.2 Variables do Repositório
1. Na mesma página, clique na aba **Variables**.
2. Clique em **New repository variable**:
   - **Name:** `DEPLOY_ENABLED`
   - **Value:** `true`
3. Clique em **Add variable**.

### 4.3 Permissões do GITHUB_TOKEN
1. Em **Settings** > **Actions** > **General**.
2. Na seção **Workflow permissions**, certifique-se de que está selecionada a opção:
   - **Read and write permissions** (para que o workflow consiga publicar a imagem no `ghcr.io` automaticamente usando o `secrets.GITHUB_TOKEN`).
3. Clique em **Save**.

---

## 5. Fluxo de Execução e Verificação

Após concluir as etapas acima:

1. A cada `git push origin main`, o workflow `.github/workflows/delivery.yml` será disparado automaticamente:
   - **Job test:** Valida a sintaxe da stack Docker Swarm e os artefatos OpenSpec.
   - **Job publish:** Compila a imagem Docker, faz tag `ghcr.io/wittemberg/pixpay.awecloudsolution.com:sha-<commit>` e `main`, e publica no GHCR.
   - **Job deploy:** Executa `scripts/deploy.py`, que chama a URL do webhook no Portainer passando `IMAGE_TAG=sha-<commit>` e verifica se o endpoint `https://pixpay.awecloudsolution.com/api/health` converge com sucesso.
2. O Docker Swarm atualiza os containers sem downtime (`order: start-first`) e reverte automaticamente em caso de falha (`failure_action: rollback`).
