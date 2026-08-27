# ADR-0007 — Leitura pública via funções SECURITY DEFINER

- **Status:** Aceito
- **Data:** 2026-08-26
- **Escopo:** leitura anônima (`anon`) de `stores`, `products` e `hero_banners`
  para o catálogo público. Não altera autorização administrativa.

## Contexto

A ADR-0002 (regra 3) previu que leituras públicas teriam "políticas [RLS]
separadas" das políticas administrativas, na mesma tabela. Ao implementar a
feature 003 (catálogo público), a primeira versão seguiu esse desenho:
`grant select` direto para `anon` em `stores`/`products`, com uma política de
RLS filtrando por `is_active`/`is_visible`.

O contract-reviewer identificou um problema real nesse desenho: RLS do
Postgres filtra **linhas**, não **colunas**. Qualquer `grant select` numa
tabela expõe automaticamente **todas** as suas colunas pela Data API do
Supabase (PostgREST) para quem tiver a chave publishable — que já é
distribuída no bundle do browser — via `GET /rest/v1/<tabela>?select=*`,
independentemente de quais colunas a query da própria aplicação usa. Isso
vazaria campos fora dos schemas já aprovados `PublicCatalog`/`PublicProduct`/
`PublicBanner` (`docs/api/openapi.yaml`), como
`whatsapp_verification_status`, timestamps internos, `products.store_id` e
`products.is_active`.

## Decisão

1. `anon` não recebe nenhum grant direto de tabela em `stores`, `products` ou
   `hero_banners`. RLS continua sendo a barreira principal para autorização
   **administrativa** (usuário autenticado associado à loja) — a ADR-0002
   permanece válida integralmente para esse caso.
2. Para leitura **pública** (não autenticada), três funções SQL
   `security definer`, `stable`, com `set search_path = ''` e
   `returns table` de formato fixo, expõem exatamente os campos já aprovados:
   `resolve_public_store(p_slug)`, `list_public_products(p_store_slug,
   p_storage_base_url)` e `list_public_hero_banners(p_store_slug,
   p_storage_base_url)`.
3. `anon` recebe `EXECUTE` somente nessas três funções (revogado de `public`
   primeiro, concedido explicitamente a `anon`); nenhum outro caminho de
   leitura anônima é aberto.
4. Alterar o `select`/`returns table` de qualquer uma dessas três funções —
   adicionar coluna, remover filtro, trocar `join` — é uma mudança de
   **fronteira de segurança**, não um refactor comum: exige a mesma revisão
   (Semgrep + `contract-reviewer`) que uma mudança de política de RLS
   exigiria, e deve ser tratada como tal em qualquer PR futuro.
5. Isso substitui, **somente para leitura pública/anônima**, o modelo de
   "política RLS separada" previsto pela ADR-0002 regra 3. A ADR-0002
   continua valendo integralmente para autorização administrativa
   (autenticado + membership) e para Storage administrativo.

## Consequências

### Positivas

- Nenhuma coluna além do contrato já aprovado pode vazar pela Data API,
  porque `anon` não tem `select` em nenhuma tabela tenant-owned.
- A superfície pública inteira é auditável lendo três funções pequenas, em
  vez de reconstruir mentalmente a interação entre grants, RLS e o contrato
  da aplicação.
- As três entidades públicas (loja, produto, banner) seguem o mesmo padrão,
  sem uma exceção híbrida (RLS pra uma, função pra outra).

### Negativas e riscos

- `security definer` roda com o privilégio do dono da função: um erro de SQL
  dentro dela (por exemplo, esquecer o filtro `is_active`) vaza dado sem uma
  segunda camada de RLS pra conter o erro, diferente de uma política RLS que
  atua independentemente da query.
- Exige disciplina de revisão específica para essas três funções — um PR que
  as toque precisa do mesmo escrutínio de segurança que um PR de RLS/policy.
- `set search_path = ''` mitiga sequestro de schema, mas exige qualificação
  explícita (`public.tabela`) em qualquer função nova desse tipo; omitir a
  qualificação é um erro fácil de cometer e difícil de notar em revisão
  superficial.

## Regras derivadas para os documentos seguintes

- `docs/data-model.md` §5 deve descrever este mecanismo (três funções
  `security definer` de shape fixo) para leitura pública, não a linguagem
  genérica de "política RLS separada" herdada da ADR-0002 regra 3.
- Checklists de revisão de segurança devem tratar qualquer alteração no
  corpo dessas três funções como mudança de fronteira, equivalente a uma
  mudança de RLS.

## Alternativas consideradas

- **Grant SELECT direto + RLS por linha** (desenho original do
  `specs/003-public-catalog/plan.md`): rejeitado — vaza colunas fora do
  contrato aprovado via Data API, independentemente da query da aplicação.
- **Views públicas** (`create view ...`) em vez de funções: avaliado;
  comportamento de segurança equivalente, mas a assinatura de função deixa o
  contrato de entrada (`p_store_slug`, `p_storage_base_url`) explícito de
  forma mais direta que uma view parametrizada por sessão/GUC.
- **Nenhum acesso direto do `anon` ao Postgres; tudo via `service_role` no
  servidor**: rejeitado por ora — adicionaria uma segunda fronteira de
  credencial privilegiada numa rota pública de alto tráfego, quando a chave
  publishable + funções restritas já é suficiente. Pode ser revisitada se o
  volume ou um requisito de auditoria justificar.

## Fontes

- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md` (regra 3, agora
  parcialmente superada por esta ADR só para leitura pública).
- `supabase/migrations/202608250001_public_catalog_access.sql` (comentário
  do implementer explicando o problema do grant direto).
- Achado do `contract-reviewer` na revisão da feature 003
  (`specs/003-public-catalog/`).
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL — SECURITY DEFINER functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
