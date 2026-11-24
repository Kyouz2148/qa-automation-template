# 🧪 QA Automation Template — Production-Ready (Playwright + k6 + GitHub Actions)

Repositório modelo (**GitHub Template**) pronto para produção, projetado para times de QA e Engenharia que desejam iniciar um projeto de automação escalável sem partir do zero.

Inclui **Playwright (Web E2E + API + Acessibilidade)**, **k6 (Testes de Carga e Performance)**, **GitHub Actions com Sharding/Paralelismo**, **Merge automático de relatórios** e **Comentário automático no Pull Request**.

---

## ✨ O que vem pronto neste template

- **Playwright Web E2E (`tests/web/`)**
  - Arquitetura **Page Object Model (POM)** com seletores semânticos (`getByRole`, `getByLabel`)
  - **Fixtures customizadas** (`src/fixtures/test.fixture.ts`) com injeção automática de páginas, clientes de API e limpeza de massa (`cleanupTaskIds`)
  - **Autenticação reutilizável** via `storageState` (`src/fixtures/auth.setup.ts`)
  - **Padrão híbrido API + UI**: cria pré-condições via API e valida fluxos críticos na interface
- **Playwright API & Contratos (`tests/api/`)**
  - Clientes HTTP tipados (`src/api/clients/`) sobre `APIRequestContext`
  - **Validação estrita de contratos com Zod** (`src/api/schemas/`)
  - Cobertura de CRUD, filtros, validação de entrada (`400`), autenticação (`401`) e `404`
- **Acessibilidade Automatizada (`tests/web/accessibility.web.spec.ts`)**
  - Auditoria WCAG 2.1 AA automatizada com `@axe-core/playwright`
- **Testes de Carga com k6 (`k6/`)**
  - Perfis reutilizáveis: `smoke`, `load`, `stress` e `spike` (`k6/config/options.js`)
  - Métricas customizadas (`Trend`, `Rate`, `Counter`) e **SLOs/Thresholds** rígidos
  - Geração automática de relatório em **Markdown** (`reports/k6-summary.md`) e **JSON**
- **CI/CD no GitHub Actions (`.github/workflows/`)**
  - **`ci-e2e-sharded.yml`**: Gate de qualidade (`typecheck` + `eslint` + `prettier`) → Matriz com **4 shards paralelos** → Merge de `blob-report` em HTML/JSON único → **Comentário automático e idempotente no PR** + upload de traces/screenshots em falhas
  - **`ci-load-k6.yml`**: Execução manual, agendada ou por label `run-load-test` no PR, com publicação no _Job Summary_ e comentário no PR
  - **`ci-nightly-full.yml`**: Regressão noturna cross-browser (`chromium`, `firefox`, `webkit`) com sharding
- **Demo App embutido (`demo-app/server.mjs`)**
  - Aplicação Web + API REST zero-dependência para que todos os testes rodem e passem _out-of-the-box_ no primeiro clone ou PR. Basta trocar `USE_DEMO_APP=false` e configurar `BASE_URL`/`API_URL` para apontar para seu sistema real.

---

## 🗂️ Estrutura do Projeto

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/test_gap.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci-e2e-sharded.yml        # Quality gate + 4x sharding + merge + PR comment
│       ├── ci-load-k6.yml            # Testes de carga k6 + SLOs + PR summary
│       └── ci-nightly-full.yml       # Cross-browser noturno (Chromium, Firefox, WebKit)
├── demo-app/
│   └── server.mjs                    # App Web + REST API local para execução imediata
├── k6/
│   ├── config/                       # Env e perfis (smoke, load, stress, spike)
│   ├── lib/                          # Auth helper + gerador de resumo Markdown/JSON
│   └── scenarios/                    # api-smoke.k6.js e tasks-load.k6.js
├── src/
│   ├── api/
│   │   ├── clients/                  # BaseApiClient, AuthClient, TasksClient
│   │   └── schemas/                  # Schemas Zod para validação de contrato
│   ├── config/env.ts                 # Validação de variáveis de ambiente com Zod
│   ├── fixtures/                     # auth.setup.ts e test.fixture.ts
│   ├── pages/                        # BasePage, LoginPage, DashboardPage
│   └── utils/
│       ├── data-factory.ts           # Fábrica de dados determinística/paralela
│       └── reporters/pr-summary.mjs  # Converte JSON do Playwright em Markdown para PR
├── tests/
│   ├── api/                          # auth.api.spec.ts, tasks.api.spec.ts
│   └── web/                          # auth.web.spec.ts, tasks.web.spec.ts, accessibility.web.spec.ts
├── docker-compose.yml                # Execução containerizada de demo-app + k6
├── eslint.config.mjs                 # ESLint v9 + typescript-eslint + eslint-plugin-playwright
├── Makefile                          # Atalhos locais (make setup, make test, make k6-smoke)
├── playwright.config.ts              # Config multi-projeto, blob reporter e webServer
└── tsconfig.json                     # TypeScript strict + path aliases (@pages/*, @api/*, etc.)
```

---

## 🚀 Quickstart Local

### 1. Instalar dependências e navegadores

```bash
cp .env.example .env
npm ci
npx playwright install --with-deps chromium
```

_(Ou simplesmente `make setup`)_

### 2. Validar código e executar os testes

```bash
# Typecheck + ESLint (regras Playwright) + Prettier
npm run validate

# Rodar toda a suíte (API + Web Chromium + Acessibilidade)
npm test

# Rodar apenas API ou apenas Web
npm run test:api
npm run test:web

# Abrir relatório HTML interativo
npm run report:html
```

### 3. Executar testes de carga com k6

Com o `k6` instalado localmente (ou via Docker Compose):

```bash
# Terminal 1: iniciar a aplicação alvo (ou usar URL de staging no .env)
npm run demo:start

# Terminal 2: rodar smoke ou load
npm run k6:smoke
npm run k6:load
npm run k6:stress
```

Ou via Docker Compose (sem precisar instalar k6 localmente):

```bash
K6_PROFILE=smoke docker compose up --abort-on-container-exit --exit-code-from k6
```

---

## ⚡ Como funciona o Sharding + Relatório no PR

```text
[Quality Gate: tsc + lint + prettier]
                 │
    ┌────────────┼────────────┬────────────┐
    ▼            ▼            ▼            ▼
[Shard 1/4]  [Shard 2/4]  [Shard 3/4]  [Shard 4/4]
  (blob)       (blob)       (blob)       (blob)
    └────────────┴────────────┴────────────┘
                 │
                 ▼
  [Merge Reports (playwright merge-reports)]
        ├── reports/html/         (HTML único interativo)
        ├── reports/results.json  (JSON consolidado)
        └── reports/pr-comment.md (Markdown gerado via pr-summary.mjs)
                 │
                 ▼
  [Comentário automático atualizado no PR + Step Summary]
```

- O script `src/utils/reporters/pr-summary.mjs` consolida totais (`Passed`, `Failed`, `Flaky`, `Skipped`, `Duration`), agrupa por projeto (`api`, `web-chromium`, etc.) e lista os erros das falhas em bloco expansível `<details>`.
- O workflow usa o marcador `<!-- qa-automation-report -->` para **atualizar o comentário existente** em novos commits do mesmo PR, evitando spam na timeline.

---

## 🔧 Como adaptar para o seu projeto real

1. **Ative como GitHub Template**: No GitHub, acesse **Settings → General → Template repository** para liberar o botão _"Use this template"_.
2. **Aponte para seu ambiente**:
   - No `.env` local ou em **Settings → Secrets and variables → Actions**:
     - `USE_DEMO_APP=false`
     - `BASE_URL=https://staging.sua-empresa.com`
     - `API_URL=https://api-staging.sua-empresa.com`
     - Secrets: `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`
3. **Substitua os clientes, schemas e Page Objects**:
   - Adicione seus endpoints em `src/api/clients/` e contratos em `src/api/schemas/`
   - Modele suas telas em `src/pages/` e exponha-as em `src/fixtures/test.fixture.ts`
   - Ajuste os thresholds de SLO em `k6/config/options.js`

---

## 📜 Scripts disponíveis

| Comando                         | Descrição                                                       |
| ------------------------------- | --------------------------------------------------------------- |
| `npm test`                      | Executa todos os projetos configurados no Playwright            |
| `npm run test:api`              | Executa apenas testes de API (`tests/api`)                      |
| `npm run test:web`              | Executa setup de auth + testes Web no Chromium                  |
| `npm run test:web:all-browsers` | Executa testes Web em Chromium, Firefox e WebKit                |
| `npm run validate`              | Roda `tsc --noEmit`, `eslint` e `prettier --check`              |
| `npm run report:merge`          | Faz merge de blob reports locais                                |
| `npm run report:pr`             | Gera `reports/pr-comment.md` a partir de `reports/results.json` |
| `npm run k6:smoke`              | Roda teste de fumaça k6                                         |
| `npm run k6:load`               | Roda teste de carga k6                                          |
| `npm run k6:stress`             | Roda teste de estresse k6                                       |
