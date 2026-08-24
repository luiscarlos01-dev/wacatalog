# Roster de sessões — Wacatalog

Mantido pela sessão de orquestração (skill `wacatalog-orchestrator`, carregada
no top-level da sessão — não é um subagent). Nomes de sessão vêm de
`ListAgents` e mudam a cada reinício — nunca hardcode um nome aqui manualmente
sem confirmar com `ListAgents` primeiro.

Atualizado em: 2026-08-23

| Papel | Nome da sessão (ListAgents) | Confirmado em | Observações |
|---|---|---|---|
| orchestrator | wacatolog-7c (esta sessão, top-level, sem subagent) | 2026-08-23 | Validado: `ListAgents`/`SendMessage` funcionam no top-level. |
| docs | wacatolog-24 | 2026-08-23 | Skill `wacatalog-doc-workflow` carregada, sequência canônica confirmada contra `docs/workflow/README.md`. |
| implementer | wacatolog-89 | 2026-08-23 | Skill `wacatalog-implementer` carregada; regras confirmadas (só tarefa delimitada pós-gate 09, não reinterpreta contrato, não revisa o próprio trabalho, sem commit/push/deploy sem autorização). |
| contract-reviewer | wacatolog-bd | 2026-08-23 | Skill `wacatalog-contract-review` carregada; regras confirmadas (read-only, critical/high/medium bloqueiam, low é advisory, achados voltam pro implementer). |
