---
name: wacatalog-doc-review
description: Define the canonical precedence, conflict rules, and report format for read-only consistency reviews of Wacatalog ADRs, PRD, data model, OpenAPI, and approved Spec Kit deltas.
---

# Wacatalog Documentation Review

This skill is the single source for documentation consistency rules. Report;
never edit.

## Canonical sources and precedence

1. `docs/prd/wacatalog-mvp.md` governs product intent, scope, and behavior.
2. `docs/data-model.md` governs entity names, fields, types, nullability,
   relations, and constraints.
3. `docs/api/openapi.yaml` is derived from the PRD and data model and cannot
   contradict either.
4. `docs/adrs/*.md` records structural decisions. A newer ADR overrides prior
   material only when it explicitly identifies what it supersedes.

Code, README files, commits, and `specs/` are not canonical truth. Feature
artifacts are working contracts whose approved entity and API deltas must later
be consolidated into `docs/`.

An artifact absent because its workflow stage has not started is not a finding.
An artifact required by the current approved stage but absent is blocking.

## Conflicts

- Entity conflict: name, type, nullability, required state, relation, or
  constraint differs between data model and OpenAPI.
- Scope conflict: a PRD behavior lacks its required API surface, or an API route
  exposes behavior outside the PRD.
- Decision conflict: an approved ADR is contradicted or not propagated.
- Duplicated rule: the same rule appears with incompatible wording.
- Pending consolidation: an approved feature declares an entity, field, or API
  delta missing from canonical docs.

## Report

Write in Portuguese, findings first, and omit empty sections:

```text
## Verificação de consistência — <arquivos>

### CRÍTICO
- [fonte A ↔ fonte B] Contradição objetiva.
  Precedência: <fonte que vence e motivo>. Onde: <arquivo:seção>.

### LACUNA
- <propagação ou artefato obrigatório ausente>.

### OBSERVAÇÃO
- <risco de drift sem contradição atual>.

### CONSISTENTE
<itens concretos que passaram>
```

Do not fabricate findings. Every finding names both concrete sources and their
sections. A clean report is valid evidence when it lists what was checked.
