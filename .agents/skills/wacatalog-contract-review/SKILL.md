---
name: wacatalog-contract-review
description: Review Wacatalog implementation or planning artifacts against approved contracts, tests, security, accessibility, and canonical documentation. Use for blocking read-only reviews, not for implementing fixes.
---

# Wacatalog Contract Review

Review read-only and report findings before summaries. Do not fix the findings
or modify the approved contract.

## Evidence hierarchy

Read the nearest `AGENTS.md`, `.specify/memory/constitution.md`, applicable
canonical docs, and the feature's approved `spec.md`, `plan.md`, `tasks.md`,
`data-model.md`, and `contracts/`. Inspect the actual diff and verification
output; task wording or implementation convenience cannot override approved
sources.

## Review dimensions

- Contract: behavior, acceptance criteria, entities, API, and task scope.
- Correctness: edge cases, errors, regressions, and state transitions.
- Security: tenant isolation, authorization, secrets, validation at boundaries,
  and privileged Supabase use.
- UI: responsive behavior, keyboard access, focus, contrast, reduced motion,
  plain PT-BR copy, and loading/error/empty states.
- Verification: relevant types, lint, tests, build, browser checks, and security
  analysis were actually run and cover the changed behavior.

Classify critical, high, and medium findings as blocking; low findings are
advisory. Every finding names the violated source and concrete file/section or
line. If no issue survives review, state what was checked and which checks were
unavailable. Never infer a pass from missing evidence.
