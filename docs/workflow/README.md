# Workflow V2 do Wacatalog

Este arquivo adapta o modo PRODUTO ao workflow canônico de documentação. Ele
preserva os gates humanos das etapas 03, 09 e 11 e coloca decisões estruturais
antes dos documentos derivados.

## Fluxo de 12 etapas

| Etapa | Resultado | Gate |
|---|---|---|
| 01 — Discovery | Problema, público, hipóteses, riscos e métricas | — |
| 02 — Histórias | Jornadas e critérios de aceitação do produto | — |
| 03 — Validação de produto | Escopo e premissas lapidados | Aprovação humana obrigatória |
| 04 — ADRs | Decisões arquiteturais registradas individualmente | Um gate humano por ADR |
| 05 — PRD canônico | `docs/prd/wacatalog-mvp.md` | Gate humano |
| 06 — Modelo e API | `docs/data-model.md` e `docs/api/openapi.yaml` | Um gate por documento; checker ao final |
| 06A — Tech Spec | Stack, versões, estrutura, comandos e critérios de bootstrap | Aprovação humana obrigatória |
| 07 — Especificação de feature | Spec Kit até análise de consistência | — |
| 08 — Planejamento de sprints | Fatias verticais, dependências e critérios de saída | — |
| 09 — Validação de sprint | Contrato executável aprovado | Aprovação humana obrigatória |
| 10 — Implementação | Código e evidências de verificação | — |
| 11 — Avaliação | Veredito sugerido pelo evaluator | Ratificação humana obrigatória |
| 12 — Aceitação | Critérios do produto verificados | Aceite humano |

## Ordem canônica

```text
ADR → gate → PRD → gate → data-model → gate → OpenAPI → lint → gate → checker
  → Tech Spec → gate → Spec Kit
```

O template V2 original colocava o PRD antes das decisões técnicas. Neste
projeto, a regra canônica mais recente prevalece: o material das etapas 01–03 é
entrada de produto, os ADRs vêm primeiro e o PRD canônico só é consolidado
depois das decisões aprovadas.

Cada documento é apresentado isoladamente. A apresentação deve destacar toda
regra, campo, constraint ou endpoint derivado que não estava explícito na fonte
a montante. Achados críticos ou lacunas voltam ao autor antes de avançar.

## Fluxo de feature

```text
constitution
  → specify
  → clarify
  → plan
  → checklist
  → tasks
  → analyze
  → gate da etapa 09
  → implementer
  → contract-reviewer
  → correções e nova revisão
  → evaluator
  → ratificação da etapa 11
```

O implementer e o reviewer trabalham sequencialmente. O reviewer é read-only;
o implementer corrige achados sem modificar o contrato aprovado.

## Estado atual

O bootstrap do harness e da aplicação foi validado. As etapas 01 a 03 foram
concluídas, e os ADRs, PRD, modelo de dados, OpenAPI, checker e Tech Spec foram
aprovados. A primeira especificação de feature está em
`specs/001-admin-store-access/`. Existe uma implementação inicial criada antes
de a rastreabilidade final do gate 09 ser registrada; ela não constitui
evidência atual de conclusão. Depois da remediação documental e de nova análise
read-only, o mantenedor aprovou o contrato corrigido na etapa 09 em 2026-08-23.

O `implementer` retomou em T010 e o `contract-reviewer` revisou em 6 rodadas
sequenciais (achados corrigidos a cada rodada: senha vazando em submit
pré-hidratação, suíte E2E flaky, contraste de foco, evidência coletada contra
servidor de dev em vez de build de produção, erro transitório de banco tratado
como não-autorizado, exceção escapando de um `catch` por `await` faltando, e
um flake real de autofill de browser diagnosticado por trace). `VERDICT: PASS`
na rodada 6; o mantenedor ratificou a etapa 11 em 2026-08-24. Nenhum commit
feito ainda. Pendências não bloqueantes: consolidação do delta de OpenAPI
(`GET /admin/store` responde 500 com corpo modelado, código
`service_unavailable` incluso — não documentado) e uma lista de achados
advisory de baixa severidade, ambos a cargo da sessão de documentação/
orquestração quando decidido. A sessão de documentação/orquestração não
implementa nem revisa o próprio trabalho.
