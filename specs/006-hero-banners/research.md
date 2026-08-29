# Research — Banners do hero

**Date**: 2026-08-29

## Decision: limite de 5 banners é validado na aplicação, não no banco

`hero_banners` não tem nenhuma constraint/trigger de contagem por loja
(confirmado lendo `supabase/migrations/202608250000_hero_banners.sql` na
íntegra). O único enforcement de banco existente é o índice único parcial
de posição entre banners ativos.

**Rationale**: é o mesmo nível de garantia já usado neste projeto para
outras regras de negócio sem constraint de banco dedicada (ex.: nenhuma
tabela deste projeto tem um trigger de "no máximo N linhas"). Adicionar
um trigger de contagem seria a solução mais robusta, mas é complexidade
nova não pedida pelo contrato aprovado — `create-banner.ts` faz
`select count(*)` escopado pela própria loja antes do `insert` e rejeita
com `409 banner_limit_reached` quando `count >= 5`.

**Alternatives considered**: trigger de banco contando linhas por
`store_id` — rejeitada por ora (YAGNI); registrar como possível reforço
futuro se o `contract-reviewer` encontrar um caminho que bypassa a
checagem de aplicação (ex.: chamada direta à API do Supabase).

## Decision: dois códigos de erro distintos para o `409` de `POST /admin/banners`

O contrato aprovado (`docs/api/openapi.yaml`) descreve o `409` de
`createBanner` genericamente como "Banner limit or position conflict",
sem diferenciar. Esta feature fixa dois valores de `code` no corpo
`Error` (`{ code, message }`, já usado por `jsonError` em todo o
projeto):

- `banner_limit_reached` — a loja já tem 5 banners.
- `position_conflict` — a posição informada já está ocupada por outro
  banner **ativo** da mesma loja (índice parcial do banco).

`PATCH /admin/banners/{bannerId}` usa só `position_conflict` no seu
`409` (não tem limite de contagem envolvido, só possível conflito de
posição ao mover ou ativar).

**Rationale**: mensagens de erro diferentes precisam de causas
diferentes pro frontend decidir o que exibir; `code` distinto é o padrão
já usado em todo o projeto (`bad_request`, `not_found`,
`service_unavailable`, etc.).

## Decision: `PUT /admin/banners/order` reatribui posição = índice+1 na lista enviada

`bannerIds[0]` vira posição 1, `bannerIds[1]` vira posição 2, e assim
por diante. A lista precisa ser exatamente o conjunto atual de banners da
própria loja (Assumptions em `spec.md`) — qualquer id faltando, repetido,
ou de outra loja é rejeitado por inteiro (`400`/`404`), sem aplicar nada.

**Rationale**: é a leitura mais direta de "replace the banner order" no
contrato já aprovado, e evita o estado ambíguo de uma reordenação parcial
deixando o restante em posições não especificadas.

## Decision: reordenar troca de posição entre dois banners ativos precisa de um passo intermediário

**O problema**: o índice único parcial (`hero_banners_store_id_position_key`,
`where is_active`) não é `deferrable` — e **não pode ser convertido** em
constraint `deferrable` via `ADD CONSTRAINT ... UNIQUE USING INDEX`,
porque essa conversão do Postgres não aceita índice parcial. Trocar a
posição de dois banners **ativos** numa única leva de `UPDATE`s (ex.:
banner A de 1→2 e banner B de 2→1) tentaria, na ordem errada, colocar dois
banners ativos na mesma posição mesmo que só por um instante dentro da
mesma transação — o índice não-deferrable rejeita isso imediatamente
(`23505`), mesmo que o estado final seja válido.

**Decision**: `reorder-banners.ts` aplica a mudança em duas fases dentro
de uma única transação:

1. `update hero_banners set is_active = false where id = any(<ids afetados>)`
   — tira temporariamente todos os banners que vão mudar de posição do
   escopo do índice parcial (que só se aplica a `is_active = true`),
   deixando qualquer posição livre pra escrever.
2. Um único `update ... set position = <nova posição> from (values ...)`
   escopado pelos `id`s, atribuindo a posição final de cada banner.
3. `update hero_banners set is_active = <valor original de cada banner>`
   — restaura o estado ativo original de cada um. Como as posições finais
   já formam uma permutação sem duplicata (garantido pela validação do
   conjunto completo, decisão acima), reativar não colide com nada.

Reordenar **não muda** o estado ativo de nenhum banner — os passos 1 e 3
só existem pra contornar a constraint, não são um efeito colateral
observável pela administradora.

**Alternatives considered**:
- Tornar o índice `deferrable` — inviável, é parcial (limitação do
  Postgres, não deste projeto).
- Trocar o índice parcial por uma constraint não-parcial em
  `(store_id, position, is_active)` — rejeitada: isso passaria a exigir
  posição única também entre banners **inativos**, mudando um
  comportamento já aprovado (`docs/data-model.md` §2.5 + a migration
  original) sem gate humano para essa mudança de regra.
- Deletar e recriar os banners a cada reorder — rejeitada, perderia
  `created_at`/`id` estáveis sem necessidade.
