# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
pnpm dev              # Next.js dev server (--webpack)
pnpm build             # build de produção (--webpack)
pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint .
pnpm format:check      # prettier . --check
pnpm test              # vitest run (unit)
pnpm test:watch        # vitest em watch
pnpm test:e2e          # playwright test
pnpm test:e2e:ui       # playwright test --ui
pnpm db:types          # gera src/types/database.ts a partir do schema local do Supabase
```

Rodar um único teste unitário: `pnpm vitest run <path>` (ou `pnpm test:watch <path>`
para watch). Rodar um único spec E2E: `pnpm exec playwright test <path>` (ou
`--ui` para o modo interativo). Node `>=24.19.0 <25`, pnpm `11.22.0` (ver
`engines`/`packageManager` em `package.json`).

## Arquitetura

Next.js 16 (App Router) + Supabase (Postgres, Storage, Auth), full-stack,
hospedado na Vercel. Multi-tenant: toda tabela tenant-owned e toda policy de
acesso são escopadas à loja (RLS no Postgres).

- `src/app/(admin)/admin/` — área autenticada do admin de loja (route group).
- `src/app/(admin-auth)/admin/` — login/recuperação de senha (route group
  separado do admin autenticado).
- `src/features/<domínio>/` — lógica de cada domínio (hoje `auth`,
  `store-access`), consumida pelas rotas em `src/app`.
- `src/lib/auth/`, `src/lib/store/`, `src/lib/supabase/`, `src/lib/config/` —
  infraestrutura compartilhada: guarda de sessão/tenant, mapeamento de erros,
  clientes Supabase (browser vs server) e configuração.
- `src/types/database.ts` — tipos gerados do schema Supabase (`pnpm db:types`);
  não editar manualmente.
- Alias de import: `@/*` → `src/*` (`tsconfig.json`).
- `supabase/` — migrations e config do Supabase local.
- `e2e/` (Playwright) e `tests/` + `src/**/*.test.ts(x)` (Vitest) — specs
  incluem fixtures dedicadas em `e2e/fixtures/`.

Autorização de admin é sempre feita no servidor (guarda de contexto de loja em
`src/lib/auth/get-authenticated-store.ts`), nunca confiando em estado do
cliente. Nunca usar o cliente Supabase `service_role` para contornar RLS em
código que atende requisições de admin.

## Fase atual do produto

Segue o workflow V2 de 12 etapas em `docs/workflow/README.md`. Planejamento e
implementação acontecem em sessões separadas. Não escrever código de produto
antes de o gate humano da etapa 09 aprovar o contrato do sprint.

## Invariantes do produto

- Catálogo multi-tenant mesmo durante a validação com a primeira revendedora.
- Autenticação por email/senha, contas provisionadas pelo mantenedor; sem
  cadastro self-service, OAuth ou MFA no MVP.
- Recuperação de senha usa linguagem simples e nunca expõe credenciais.
- Nunca armazenar, logar, commitar ou colar senhas, tokens, chaves privadas ou
  credenciais de service role.
- Produtos têm controles separados de visibilidade e disponibilidade; preço
  está fora do escopo do MVP.
- Hero suporta no máximo 5 banners ordenados (imagem, descrição acessível,
  título/texto opcional, estado ativo); CTA/agendamento fora do escopo.
- Identidade da loja é mantida pelo mantenedor do projeto, não pelas
  administradoras, no MVP.

## Fontes de verdade

1. `docs/adrs/*.md` — decisões arquiteturais. Um ADR mais novo só substitui
   outra fonte quando declarar isso explicitamente.
2. `docs/prd/wacatalog-mvp.md` — escopo e comportamento do produto.
3. `docs/data-model.md` — entidades, campos, relações e constraints.
4. `docs/api/openapi.yaml` — contrato HTTP derivado do modelo de dados.

`specs/` são contratos de trabalho de feature, não documentação canônica.
Quando uma feature concluída altera entidades ou API, o delta aprovado deve
ser consolidado em `docs/`, na ordem canônica acima.

Dentro de uma feature, o conjunto aprovado de `spec.md`, `plan.md`, `tasks.md`,
`data-model.md`, `contracts/` e constituição (`.specify/memory/constitution.md`)
forma o contrato de implementação. Implementadores não podem alterar esse
contrato para fazer o código passar; podem apenas marcar checkboxes de tarefas
concluídas. Ambiguidades voltam ao planejamento.

## Padrões de código

Antes de criar ou editar código, consultar `docs/patterns/README.md` (índice
com seleção sob demanda por domínio) e `docs/patterns/versions.md`. Não
carregar todos os patterns por padrão — abrir só os aplicáveis à mudança. Se
uma versão estiver `pending`, não inventar implementação; devolver a decisão ao
planejamento. Ordem de precedência em conflito:

```text
AGENTS.md/CLAUDE.md > ADR aprovado > PRD/modelo de dados/OpenAPI aprovados
  > contrato aprovado da feature > docs/patterns/ > docs genéricos da tecnologia
```

## Gates do workflow (humanos, não negociáveis)

- Etapa 03 — mantenedor aprova o enquadramento do produto antes da arquitetura.
- Documentos canônicos — cada alteração em ADR, PRD, modelo de dados e OpenAPI
  tem gate humano próprio antes do documento seguinte.
- Etapa 09 — mantenedor aprova o escopo/contrato do sprint antes do código de
  produto.
- Etapa 11 — o evaluator propõe veredito; só o mantenedor ratifica.

## Agents e orquestração

O trabalho roda em 4 sessões separadas do Claude Code. Três delas acionam um
subagent dedicado que carrega uma skill do projeto; a de orquestração roda a
skill diretamente no top-level da sessão (ver nota abaixo):

| Sessão            | Subagent (`.claude/agents/`)          | Skill principal (`.claude/skills/`)                              |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Orquestração      | — (top-level da sessão, sem subagent) | `wacatalog-orchestrator`                                         |
| Documentação/spec | `docs-lead`                           | `wacatalog-doc-workflow` (+ `wacatalog-doc-review`, `speckit-*`) |
| Implementação     | `implementer`                         | `wacatalog-implementer`                                          |
| Code review       | `contract-reviewer` (read-only)       | `wacatalog-contract-review`                                      |

Sequência estrita: `docs-lead` fecha a feature no Spec Kit → **gate etapa 09**
→ `implementer` → evidências de verificação → `contract-reviewer` (read-only,
não corrige os próprios achados) → se houver bloqueio, achados voltam ao
`implementer` → nova revisão → **gate etapa 11**. A sessão de orquestração
sequencia e lembra os gates, mas nunca implementa, revisa ou aprova em nome do
mantenedor.

**Orquestração nunca roda como subagent spawnado.** Validado empiricamente
(2026-08-23): `ListAgents`/`SendMessage` são desabilitadas pelo harness dentro
de qualquer subagent chamado via `Agent`/`Task`, mesmo quando declaradas no
`tools:` do agent — só funcionam no top-level da sessão. A skill
`wacatalog-orchestrator` deve ser carregada diretamente na sessão dedicada
(via `Skill` tool), não via `Agent(subagent_type: "orchestrator")`.

Como os nomes de sessão (`ListAgents`) mudam a cada reinício, o mapeamento
papel → sessão atual fica em `.claude/orchestration/roster.md`, confirmado com
o mantenedor no início de cada rodada — nunca hardcoded.

## Contrato de qualidade

- Seguir o package manager e formatter existentes: pnpm, TypeScript strict.
- Antes de declarar a implementação concluída, inspecionar o output real de
  tipos, lint, testes, análise de segurança e build de produção.
- Testes unitários obrigatórios para regras de domínio, transformações e
  validações isoláveis. Testes E2E obrigatórios para jornadas críticas —
  autenticação, isolamento de tenant, gestão de produtos, uploads e envio de
  pedidos, quando esses fluxos existirem. Um não substitui o outro.
- Testes unitários e E2E derivam objetivo e critérios de aceitação do contrato
  aprovado da feature.
- Não inventar framework de teste; se o comando de teste necessário não
  existir/aprovado, registrar a indisponibilidade e devolver a escolha ao
  planejamento.
- Trabalho de UI exige validação no browser em larguras mobile e desktop,
  navegação por teclado, foco visível, contraste, movimento reduzido e textos
  em PT-BR.
- Preferir Context7 para docs de framework, browser/Playwright para
  comportamento de UI e Semgrep para análise de segurança quando disponíveis.
- Reportar checks indisponíveis explicitamente; nunca converter ferramenta
  ausente em resultado aprovado.
- Não commitar, push, deploy ou alterar serviços externos sem autorização
  explícita do mantenedor.

## Gate de Pull Request no GitHub Actions

- Toda PR aberta/reaberta/pronta para revisão/sincronizada dispara o workflow
  de revisão do Claude Code, que compara o diff contra o contrato aprovado da
  feature e os `docs/patterns/` aplicáveis; falha sem `PASS` explícito.
- PRs que alterem código passam por typecheck, lint, testes unitários, testes
  E2E e build de produção no head da PR, sem secrets disponíveis nesse job.
- Checks da PR são complementares ao review local pós-commit; passar na PR não
  autoriza merge, commit, push ou deploy por si só.
- `main` bloqueia push direto e merge sem os dois gates independentes:
  `Claude Code review` com `PASS` no commit mais recente + aprovação explícita
  do mantenedor.

## Manutenção do harness

- `AGENTS.md` (Codex CLI) e este `CLAUDE.md` (Claude Code) coexistem por ora —
  o projeto está migrando do Codex para o Claude Code. Mudanças de processo
  devem ser propagadas nos dois enquanto o Codex ainda estiver em uso.
- As skills `.claude/skills/wacatalog-*` e `speckit-*` são cópias de
  `.agents/skills/` (mantidas em paralelo para o Codex); ajustes de conteúdo
  devem ser replicados manualmente nos dois locais até a migração terminar.
- Não editar manualmente os artefatos gerados do Spec Kit em `.specify/` ou as
  skills `speckit-*`, salvo atualização aprovada da versão fixada do Spec Kit.
- Comportamentos específicos do projeto pertencem às skills `wacatalog-*`, aos
  subagents customizados em `.claude/agents/` ou a este arquivo.
