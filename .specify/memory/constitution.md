# Wacatalog Constitution

## Core Principles

### I. Contract Before Code

Product code starts only after the approved planning chain and Stage 09 gate.
The approved constitution, canonical docs, feature specification, plan, tasks,
data model, and contracts govern implementation. Ambiguity returns to planning;
implementation never edits the contract to legitimize its own behavior.

### II. Simple and Accessible Experience

The catalog and administration experience serve mobile users and a seller with
limited digital familiarity. Flows use plain PT-BR language, few decisions,
clear recovery, accessible interaction, and responsive layouts. Visual polish
must not add friction or obscure the primary task.

### III. Tenant Isolation and Least Privilege

Multi-tenancy is a data and authorization invariant from the first reseller.
Tenant-owned data is scoped to a store, policies deny cross-store access, and
privileged Supabase credentials stay on trusted server boundaries. Secrets and
personal data never enter source control, logs, fixtures, or agent prompts.

### IV. Evidence Before Completion

Completion claims require observed evidence proportional to risk. Type checks,
lint, tests, security analysis, production builds, and browser validation are
run when applicable. Missing or broken verification is reported explicitly and
cannot be represented as success.

### V. Simplicity With Traceability

Use the smallest design that satisfies the approved requirement. Avoid
premature abstraction, compatibility shims, and speculative features. Decisions
with structural consequences are recorded in ADRs before their derived PRD,
data model, API, or implementation changes.

## Product and Technical Constraints

- Next.js is the full-stack application and Vercel is the target host.
- Supabase provides Postgres, Storage, and Auth for the MVP.
- Auth uses maintainer-provisioned email/password accounts, persistent trusted
  sessions, and simple recovery. Public sign-up, Cognito, OAuth, and MFA are out
  of scope for the MVP.
- The database and authorization model are multi-tenant from the start.
- Product prices are not shown or managed in the MVP.
- Product visibility and order availability are independent states.
- Hero management is limited to five ordered banners without CTA or scheduling.

## Development Workflow and Gates

Use the 12-stage workflow in `docs/workflow/README.md`. Human approval is
mandatory at Stages 03 and 09, and human ratification is mandatory at Stage 11.
Canonical documents follow ADR → PRD → data-model → OpenAPI with one human gate
per document and a read-only consistency check at the end. Implementer and
reviewer roles are separate; review findings are fixed by the implementer and
revalidated by the reviewer.

## Governance

This constitution governs Spec Kit feature work. Amendments require explicit
maintainer approval, a version increment, and a note describing affected
artifacts. `AGENTS.md` supplies operational instructions but cannot silently
weaken these principles. Reviewers report deviations instead of editing the
governing contract.

**Version**: 1.0.0 | **Ratified**: 2026-08-22 | **Last Amended**: 2026-08-22
