# Feature Data Model — WhatsApp da loja

Esta feature não introduz nenhuma tabela, campo ou entidade nova. Reusa
integralmente `stores` (`docs/data-model.md` §2.1), já materializada
desde a feature 001.

## Campos reusados, sem alteração

| Campo                          | Regra já aprovada                                          |
| ------------------------------ | ---------------------------------------------------------- |
| `whatsapp_number`              | Opcional; dígitos normalizados no padrão `55[0-9]{10,11}`. |
| `whatsapp_verification_status` | `unverified` (default) ou `verified`.                      |
| `whatsapp_verified_at`         | Preenchido só quando `verified`.                           |

Regras de transição (já aprovadas, `docs/data-model.md` §2.1):

- Alterar `whatsapp_number` com sucesso sempre grava
  `whatsapp_verification_status = 'unverified'` e `whatsapp_verified_at =
null`, mesmo se o número anterior já estivesse `verified`.
- Confirmar verificação grava `whatsapp_verification_status = 'verified'`
  e `whatsapp_verified_at = now()`. Exige `whatsapp_number` não nulo.

## Correção 2026-08-28: exposição pública do número (achado L-1 do `contract-reviewer`)

A suposição original desta seção — que a feature 003 já expunha
`whatsappNumber` corretamente em `PublicCatalog` — estava errada:
`resolve_public_store` (`supabase/migrations/202608250001_public_catalog_access.sql`)
devolve `whatsapp_number` incondicionalmente hoje, sem checar
`whatsapp_verification_status`. `whatsappAvailable` já é calculado
corretamente (`whatsapp_number is not null and status = 'verified'`); só o
número bruto vazava sem essa checagem. Decisão do mantenedor: corrigir
agora, dentro desta feature (FR-010/SC-006, `tasks.md` T026), não como
débito futuro — via `create or replace function` numa migration nova
(nunca editar a `202608250001` já mesclada).

## Correção 2026-08-28: privilégio de escrita ausente (achado A-1 do `contract-reviewer`)

A feature 001 só concedeu `SELECT` em `stores` para `authenticated`
(`supabase/migrations/202608220000_stores.sql` + policy de select em
`202608220001_store_memberships.sql`) — nenhum `GRANT UPDATE` nem policy de
`UPDATE` foi criado por nenhuma feature até aqui. Esta feature escreve em
`stores` pela primeira vez desde a 001 e o plano não previu essa lacuna
(`plan.md` original assumia "nenhuma migration necessária"). Corrigido via
nova migration (`tasks.md` T025), seguindo o mesmo padrão de policy
escopada por `store_memberships`/`store_admin` já usado em `products`
(feature 002).

## Correção 2026-08-28: privilégio de coluna (achado A-2 do `contract-reviewer`)

A correção do A-1 (grant de `UPDATE` de tabela inteira + policy de RLS
escopada só por linha) foi insuficiente: uma administradora conseguia
escrever `name`/`slug` (viola `CLAUDE.md`) e forjar
`whatsapp_verification_status`/`whatsapp_verified_at` direto, sem passar
pela confirmação real — reabrindo o L-1 por outro caminho. Corrigido
(`tasks.md` T028-T030) trocando as duas escritas por funções `security
definer` que resolvem a loja só via `store_memberships`/sessão;
`authenticated` fica sem nenhum `UPDATE` direto em `stores`. Terceira
lacuna de privilégio de banco mal escopado nesta feature (depois de A-1 e
do padrão já visto na feature 003) — candidato a virar checagem fixa de
planejamento.

## Fora do escopo desta feature

- Qualquer campo ou tabela para histórico de números anteriores.
