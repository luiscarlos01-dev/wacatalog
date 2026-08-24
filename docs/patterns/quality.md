---
title: Qualidade e verificação
scope: Typecheck, lint, testes, build, segurança e QA de browser
status: constrained
applies_to: "qualquer entrega de código"
source_of_truth: "AGENTS.md; docs/workflow/quality-gates.md"
last_reviewed: 2026-08-22
version_baseline: "Vitest 4.1.10; Testing Library React 16.3.2; Playwright 1.62.1"
documentation_snapshot: "pacotes oficiais consultados em 2026-08-22"
related_patterns: [typescript, eslint, prettier, security, frontend-accessibility]
---

# Qualidade e verificação

## Contract summary

Toda entrega deve ser verificada proporcionalmente ao risco. Vitest cobre
domínio e integrações leves, Testing Library cobre componentes e Playwright
cobre jornadas E2E; este arquivo mantém a matriz de checks e os gates de
evidência.

## Non-negotiable rules

### MUST

- Inspecionar o output real de typecheck, lint, testes e build quando existirem.
- Cobrir com testes unitários as regras de domínio, transformações, validações e
  outras funções determinísticas isoláveis.
- Cobrir com E2E as jornadas críticas e o comportamento entre camadas,
  especialmente autenticação, tenancy, CRUD, upload e pedido quando forem
  implementados.
- Testar fluxos críticos de autenticação, tenancy, CRUD, upload e pedido quando
  forem implementados.
- Fazer QA em browser para UI em viewport mobile e desktop.
- Verificar teclado, foco visível, contraste, movimento reduzido e copy PT-BR.
- Registrar checks indisponíveis como `not executed`, nunca como aprovados.

### MUST NOT

- Declarar “pronto” com base apenas em revisão visual ou compilação.
- Fazer bypass de hook, lint ou teste com `--no-verify` sem pedido explícito.
- Inventar framework de testes antes da decisão técnica.
- Usar E2E para substituir todos os testes unitários.
- Usar testes unitários para alegar que uma jornada de browser está validada.

### SHOULD

- Rodar o conjunto curto durante o ciclo e o conjunto completo antes da entrega.
- Priorizar testes de autorização e regressão de fluxos críticos.
- Guardar evidência suficiente para reproduzir a verificação.

## Decision rules

- **Se** o check não existe no projeto, **então** reporte-o como não disponível;
  não substitua silenciosamente por outro.
- **Se** a mudança atravessa autenticação, tenant ou upload, **então** inclua
  teste autorizado e não autorizado.
- **Se** a mudança altera uma regra determinística, **então** inclua teste
  unitário; **se** altera uma jornada de usuário, **então** inclua E2E.
- **Se** a mudança altera UI, **então** inclua browser QA e acessibilidade.

## CI contract

Quando o projeto tiver sido inicializado, o workflow de PR espera estes scripts
no `package.json`:

```text
typecheck → lint → test:unit → test:e2e → build
```

Cada comando deve retornar código diferente de zero quando falhar. O E2E deve
subir a aplicação conforme a configuração do framework aprovado; o workflow não
deve mascarar uma aplicação que não compila ou não inicia.

O review do Claude Code é um job separado e read-only. Ele lê o contrato e os
patterns, publica findings e só passa com veredito estruturado `PASS`.

O secret `ANTHROPIC_API_KEY` deve existir somente na configuração protegida do
GitHub Actions. A proteção da branch deve exigir os checks `Claude Code review`
e `PR quality`; uma execução ausente, falha ou sem veredito estruturado não pode
ser tratada como aprovação.

Nenhuma PR pode entrar em `main` sem a combinação de `Claude Code review = PASS`
no commit mais recente e aprovação do mantenedor. A proteção da branch deve
bloquear push direto e exigir ambos os gates; o workflow não consegue substituir
essa configuração externa do GitHub.

## Verification checklist

- [ ] Typecheck.
- [ ] Lint.
- [ ] Format check.
- [ ] Testes relevantes.
- [ ] Build de produção.
- [ ] Semgrep ou análise equivalente quando disponível.
- [ ] Browser QA quando houver UI.
- [ ] Checks indisponíveis explicitamente listados.

## Unknowns / not approved

- Cobertura mínima e política de snapshots.

## Sources

- `AGENTS.md`
- `docs/workflow/quality-gates.md`

## Change log

- `2026-08-22` — criado a partir do contrato de qualidade do projeto.
