# Nexora AI — SaaS B2B de Inteligência Artificial

Plataforma multiempresa com frontend Next.js, API FastAPI, PostgreSQL/pgvector, Redis, Celery, DeepInfra e Stripe. Cada registro operacional leva `company_id` e todas as consultas autenticadas aplicam o tenant do JWT.

## O que está implementado

- Cadastro de empresa e owner, login JWT e rotação de refresh token
- Perfis owner, admin, member e superadmin com RBAC
- Convites de equipe, limites por plano e painel de consumo
- Agentes personalizados, pastas, conversas, mensagens e arquivos
- Chat via API compatível com OpenAI da DeepInfra e registro de tokens/custo
- Upload validado com storage persistente e worker Celery preparado para extração/RAG
- Stripe Checkout e webhook de assinatura, falha de pagamento e cancelamento
- API documentada automaticamente em `/docs`
- Frontend responsivo e dark mode; landing page, login, cadastro e dashboard
- Docker Compose pronto para PostgreSQL com pgvector, Redis, backend, worker e frontend

## Desenvolvimento local

1. Copie `.env.example` para `.env` e troque `SECRET_KEY`.
2. Execute `docker compose up --build`.
3. Acesse frontend em `http://localhost:3000`, API em `http://localhost:8000/docs`.
4. Cadastre a primeira empresa em `/cadastro`.

Sem `DEEPINFRA_API_KEY`, o chat retorna uma mensagem de configuração — todo o restante funciona normalmente.

## Implantação completa no EasyPanel

### 1. Preparar domínio e projeto

1. No EasyPanel, crie um projeto, por exemplo `nexora`.
2. Aponte dois registros DNS para o IP do servidor:
   - `app.seudominio.com` (frontend)
   - `api.seudominio.com` (backend)
3. Aguarde a propagação DNS antes de ativar HTTPS.

### 2. Criar pelo Docker Compose

1. Dentro do projeto, escolha **Service → Docker Compose**.
2. Use a origem **GitHub** e informe `https://github.com/douglasoliveira21/saas-ia`.
3. Selecione a branch publicada e o arquivo `/docker-compose.yml`.
4. Ative deploy automático (webhook) se quiser publicar a cada push.

Se a sua versão do EasyPanel não oferecer Compose por repositório, crie os serviços individualmente: dois serviços de App usando `backend/Dockerfile` (API e worker), um usando `frontend/Dockerfile`, além dos templates PostgreSQL e Redis. Use as URLs internas fornecidas pelo EasyPanel em `DATABASE_URL` e `REDIS_URL`.

### 3. Variáveis de ambiente

Cadastre no serviço/Compose:

```env
APP_NAME=Nexora AI
ENVIRONMENT=production
SECRET_KEY=UMA_CHAVE_ALEATORIA_FORTE_DE_64_CARACTERES
POSTGRES_PASSWORD=UMA_SENHA_FORTE
DATABASE_URL=postgresql+psycopg://postgres:SENHA@postgres:5432/nexora
REDIS_URL=redis://redis:6379/0
FRONTEND_URL=https://app.seudominio.com
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api/v1
DEEPINFRA_API_KEY=sua_chave
DEEPINFRA_BASE_URL=https://api.deepinfra.com/v1/openai
DEFAULT_AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

Importante: `NEXT_PUBLIC_API_URL` é incorporada no build do frontend. Depois de alterá-la, faça **Rebuild**, não somente Restart.

### 4. Domínios e portas

1. No serviço `frontend`, adicione `app.seudominio.com`, porta interna `3000`, e ative HTTPS.
2. No serviço `backend`, adicione `api.seudominio.com`, porta interna `8000`, e ative HTTPS.
3. Não exponha PostgreSQL (`5432`) nem Redis (`6379`) publicamente.
4. Confira `https://api.seudominio.com/health`; deve retornar `{"status":"ok"...}`.

### 5. Configurar DeepInfra

1. Crie uma API key no painel DeepInfra.
2. Preencha `DEEPINFRA_API_KEY` no backend e worker.
3. Confirme que `DEFAULT_AI_MODEL` é um identificador disponível na conta.
4. Reinicie backend e worker e teste pelo dashboard.

### 6. Configurar Stripe

1. No Stripe, crie os produtos Starter, Professional e Enterprise com preços mensais recorrentes.
2. Copie cada `price_...` para as três variáveis `STRIPE_*_PRICE_ID`.
3. Em **Developers → Webhooks**, crie o endpoint:
   `https://api.seudominio.com/api/v1/billing/webhook`
4. Marque os eventos `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.
5. Copie o signing secret `whsec_...` para `STRIPE_WEBHOOK_SECRET`.
6. Comece em modo teste (`sk_test_...`) e só depois troque para produção.

### 7. Volumes, backup e operação

- Mantenha volumes persistentes para `postgres_data`, `redis_data` e `storage_data`.
- Configure backup diário do volume PostgreSQL no EasyPanel e retenção mínima de 7 dias.
- Para backup manual: `pg_dump -Fc -U postgres nexora > nexora.dump` dentro do container do banco.
- A API executa `alembic upgrade head` automaticamente a cada deploy.
- Monitore logs dos serviços `backend` e `worker`; configure alertas para reinícios e uso de disco.
- Antes de vender acesso, troque todos os segredos, configure SMTP, revise preços/custos por modelo e execute testes de carga e segurança.

## Endpoints principais

`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/dashboard`, `GET|POST /api/v1/agents`, `POST /api/v1/chat`, `POST /api/v1/files`, `POST /api/v1/team/invite`, `POST /api/v1/billing/checkout`.

## Licença

Código proprietário. Defina a política de licença antes da distribuição comercial.
