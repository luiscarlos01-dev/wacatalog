# Research — Importação de catálogo via PDF

**Date**: 2026-08-27

## Decision: processamento síncrono, sem fila de job

`POST /admin/catalog-imports` extrai e retorna os candidatos na mesma
requisição/resposta, sem job assíncrono nem estado de "importação em
andamento" persistido.

**Rationale**: O volume é pequeno e limitado (até 50 páginas, ADR-0008) e o
spec já assume que fechar a tela antes de confirmar equivale a cancelar
(sem retomar depois). Uma fila de job exigiria armazenar estado de
progresso e um mecanismo de polling só para um caso de uso que cabe
dentro de um timeout razoável de requisição — complexidade não justificada
(princípio de simplicidade).

**Alternatives considered**: fila de job com polling — rejeitada por
enquanto; revisitar se o limite de páginas/timeout se mostrar insuficiente
em uso real, ou se o plano de hospedagem Vercel tiver um limite de execução
mais curto do que o timeout de processamento definido no plan.md.

## Decision: detecção de duplicidade é uma query simples, no mesmo request

Depois de extrair os candidatos, o servidor consulta `products` filtrando
por `store_id = <loja resolvida>` e `sku IN (<SKUs extraídos, não nulos>)`,
na mesma chamada que processa o PDF, e marca cada candidato cujo SKU bate
com um resultado.

**Rationale**: Reusa a mesma autorização já resolvida
(`getAuthenticatedStore`) e a mesma tabela já existente; não precisa de
nenhum endpoint, view ou índice novo — `(store_id, sku)` já tem índice
único parcial (`docs/data-model.md` §2.4).

## Decision: candidato extraído não tem identificador de servidor

Cada candidato na resposta de `POST /admin/catalog-imports` é identificado
só pela posição no array; o cliente pode atribuir uma chave local (ex.:
`crypto.randomUUID()`) para controle de estado da revisão, sem que o
servidor precise gerar ou rastrear nenhum ID.

**Rationale**: Consistente com candidatos serem efêmeros (ADR-0008 regra 5) — não existe nada no servidor para esse ID referenciar depois da
resposta.

## Decision: confirmação é uma sequência de chamadas ao endpoint de criação já existente, não um endpoint de lote novo

O cliente, depois da revisão, chama `POST /admin/assets` (por item, se uma
imagem foi anexada) e `POST /admin/products` (por item confirmado) — os
mesmos endpoints já aprovados e implementados na feature 002 — uma vez por
item, em vez de um novo endpoint de criação em lote.

**Rationale**: `createProduct`/`checkAssetOwnership`
(`src/lib/products/`) já implementam exatamente a regra de negócio
necessária (unicidade de SKU, posse do asset, defaults). Um endpoint de
lote duplicaria essa lógica ou exigiria extraí-la para reuso — sem
necessidade, dado o volume pequeno (até ~50 itens) e o requisito explícito
de FR-010 (falha de um item não bloqueia os demais, que a chamada
item-a-item já garante naturalmente, sem precisar de semântica de
transação parcial no servidor).

**Alternatives considered**: endpoint `POST /admin/catalog-imports/confirm`
recebendo a lista inteira e criando tudo no servidor — rejeitado por
duplicar regra de negócio já aprovada e por tornar o tratamento de falha
parcial (FR-010) mais complexo do que só deixar o cliente chamar o
endpoint existente por item.
