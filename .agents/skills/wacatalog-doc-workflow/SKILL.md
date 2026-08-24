---
name: wacatalog-doc-workflow
description: Apply the Wacatalog canonical documentation sequence and human gates when creating or changing ADRs, the MVP PRD, data model, OpenAPI contract, or consolidating Spec Kit feature artifacts.
---

# Wacatalog Documentation Workflow

Read `AGENTS.md` and `docs/workflow/README.md` before changing canonical docs.
Load `wacatalog-doc-review` when checking consistency; it is the single source
for precedence, conflict definitions, and report format.

## Canonical sequence

Use this order:

```text
ADR → human gate → PRD → human gate → data-model → human gate
    → OpenAPI → Redocly lint → human gate → docs-consistency-checker
```

Do not draft the full cascade for one approval. Present one document at a time
and list every rule, field, constraint, default, or endpoint derived beyond its
upstream source.

ADRs record structural decisions before downstream documents. Corrections flow
downstream; never rewrite an upstream product decision merely to match
implementation.

## Feature flow (Spec Kit)

Before a feature reaches the stage 09 gate, drive it through the Spec Kit
steps, in this order:

```text
constitution (only if .specify/memory/constitution.md is missing or needs an
  approved update)
  → specify
  → clarify
  → plan
  → checklist
  → tasks
  → analyze
  → human gate (stage 09)
```

Do not skip `analyze` before the gate — it is the final consistency check
across `spec.md`, `plan.md`, and `tasks.md`. Do not hand-edit generated
artifacts under `.specify/` outside these steps.

## Feature consolidation

Treat `specs/` as a working contract, not canonical documentation. After an
approved feature, identify its entity and API deltas, check the current
canonical baseline, then consolidate the delta in canonical order. Run the
read-only checker again after consolidation.

Stop when a required human gate is missing. Report the exact next approval and
do not continue into the next document.
