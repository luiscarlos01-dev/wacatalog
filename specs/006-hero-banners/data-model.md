# Feature Data Model — Banners do hero

Esta feature não introduz nenhuma tabela, campo ou entidade nova. Reusa
integralmente `hero_banners` (`docs/data-model.md` §2.5), já
materializada desde a feature 003.

## Campos reusados, sem alteração

| Campo | Regra já aprovada |
| --- | --- |
| `image_asset_id` | Obrigatório; deve apontar para asset da mesma loja. |
| `accessible_description` | Obrigatório; não pode ser vazio. |
| `title` | Opcional. |
| `text` | Opcional. |
| `position` | Obrigatório; inteiro entre 1 e 5. |
| `is_active` | Obrigatório; controla presença no hero público. Default `false`. |

Regras de transição/constraint já aprovadas e materializadas:

- No máximo 5 banners por loja (regra de negócio; sem constraint de
  banco — ver `research.md`).
- Duas linhas da mesma loja não podem ter a mesma `position` **enquanto
  ambas estiverem `is_active = true`** (índice único parcial
  `hero_banners_store_id_position_key`,
  `supabase/migrations/202608250000_hero_banners.sql`). Banners
  inativos não entram nessa checagem.
- `image_asset_id` deve apontar para um asset da mesma loja (checado na
  aplicação, mesmo padrão de `lib/products/verify-owned-asset.ts`).

## Achado desta rodada de planejamento: privilégio administrativo ausente

`hero_banners` foi criada na feature 003 (`202608250000_hero_banners.sql`)
com `revoke all ... from authenticated` deliberado — o comentário da
própria migration diz que leitura/escrita administrativa "are reserved
for a future banner-management feature". Esta é essa feature.

Diferente do achado A-1/A-2 da feature 005 (que só apareceu depois de
implementado, achado pelo `contract-reviewer`), este foi identificado
**nesta rodada de planejamento**, antes de qualquer código — a migration
de privilégio já entra em `tasks.md` como pré-requisito bloqueante, não
como correção posterior.

**Desenho do grant** (`plan.md` — Storage): `GRANT SELECT, INSERT,
UPDATE, DELETE ON hero_banners TO authenticated` + 4 policies de RLS
(`select`/`insert`/`update`/`delete`) escopadas por
`store_memberships`/`store_admin`, mesmo padrão de `products` (feature
002). Ao contrário de `stores` (feature 005), não há aqui nenhuma coluna
que a administradora não devesse poder escrever — todo campo de
`hero_banners` já é responsabilidade administrativa por natureza — então
o grant de tabela inteira + RLS por linha é suficiente, sem precisar do
desenho via função `security definer` usado para fechar o achado A-2.

## Fora do escopo desta feature

- Qualquer campo, tabela ou comportamento de CTA, link de campanha ou
  agendamento (PRD §4.4, fora do MVP).
- O lado público (`list_public_hero_banners`, feature 003) — já
  implementado, consome os mesmos campos sem alteração.
- O ciclo de vida do asset de imagem (`/admin/assets`) — esta feature só
  referencia um asset já enviado pelo id.
