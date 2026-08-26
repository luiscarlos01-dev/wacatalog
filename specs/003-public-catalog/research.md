# Research — Catálogo público

**Date**: 2026-08-25

## Decision: URL da página pública é `/{storeSlug}`, diferente do path do contrato HTTP

A página do catálogo fica em `/{storeSlug}` (raiz), enquanto o contrato HTTP
aprovado usa `/stores/{storeSlug}/catalog`. Página e endpoint reusam a mesma
função de domínio, sem duplicar a regra de filtro.

**Rationale**: Nem o PRD nem nenhum ADR fixam a URL da página pública — só o
path da API está aprovado em OpenAPI. Uma URL curta é melhor para
compartilhamento (link direto da loja), e o mesmo padrão de página/API
distintas já existe entre `/admin` (página) e `/admin/store` (API).

**Alternatives considered**:

- Página em `/stores/{storeSlug}`: rejeitado, sem benefício sobre a URL
  curta e mais alinhado à API do que à experiência da cliente.
- Reusar o mesmo path para página e API: inviável no App Router (`page.tsx`
  e `route.ts` não coexistem no mesmo segmento — mesma limitação já
  documentada em `specs/002-product-management/plan.md`).

## Decision: `hero_banners` é materializada nesta feature, sem CRUD administrativo

A tabela `hero_banners` (já 100% especificada em `docs/data-model.md` §2.5)
é criada nesta feature porque a consulta pública precisa lê-la. O contrato
administrativo já aprovado (`/admin/banners*`) não é implementado aqui.

**Rationale**: Diferente de `assets` na feature 002 (onde a ausência
bloqueava 100% dos user stories de produto), aqui todos os user stories do
catálogo público continuam testáveis com banners vazios — não há bloqueio
total que justifique escalar a decisão ao mantenedor. Dados de teste para o
cenário "hero com banners" são inseridos diretamente via fixture/SQL, mesmo
padrão já usado para provisionar lojas/administradoras de teste nas
features anteriores.

**Alternatives considered**:

- Incluir o CRUD administrativo de banners nesta feature: rejeitado — não é
  necessário pra nenhum user story do catálogo público ser testável, e
  ampliaria o escopo além do que o PRD §4.1 (catálogo) pede. Fica para uma
  feature própria, mesma separação já usada entre produtos (002) e catálogo
  público (003).
- Não criar a tabela agora, adiar toda a feature: rejeitado — o catálogo
  público (produtos) já é 100% testável e valioso isoladamente; adiar tudo
  por causa de banners contradiria a priorização P1/P2 do próprio spec.

## Decision: sem cache/revalidação explícita nesta feature

A página e o route handler usam o comportamento padrão do Next.js (sem
`revalidate` nem `fetch cache` configurado).

**Rationale**: `docs/patterns/nextjs.md` recomenda adicionar cache "somente
após definir a necessidade de consistência" — o MVP não define uma meta de
performance numérica nem uma tolerância de staleness. Adicionar cache agora
seria otimização prematura (princípio de simplicidade, `CLAUDE.md`).

**Alternatives considered**: ISR com `revalidate` fixo — avaliado e
descartado por falta de um requisito que justifique a complexidade agora;
pode ser revisitado com dado real de uso.

## Nota: `docs/patterns/nextjs.md` está desatualizado em relação à ADR-0004

O pattern doc ainda lista "App Router versus Pages Router" como "Unknowns /
not approved", mas a ADR-0004 (mesma data, 2026-08-22) já decidiu App
Router, e as features 001/002 já o usam. Por precedência
(`AGENTS.md`/`CLAUDE.md` > ADR > ... > `docs/patterns/`), a ADR-0004 vale, e
esta feature segue App Router sem novo gate. Registrado aqui só para
sinalizar que `docs/patterns/nextjs.md` merece uma atualização de
manutenção fora do escopo desta feature.
