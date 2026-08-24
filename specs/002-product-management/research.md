# Research — Gestão de produtos

**Date**: 2026-08-24

## Decision: Bucket único público, caminho gerado por loja/tipo/id

Usar um único bucket do Supabase Storage (`catalog-assets`), com leitura
pública e escrita restrita a operação autorizada da loja. Caminho do objeto:
`{storeId}/{kind}/{assetId}.webp` (`kind` é `product` ou `banner`, mesmo enum
já aprovado em `ProductInput`/`BannerInput`). O nome enviado pela revendedora
nunca é usado no caminho.

**Rationale**: ADR-0003 já decidiu leitura pública (regra 5) e caminhos
gerados pelo sistema (regra 4), mas deixou bucket/path como "não aprovado"
(`docs/patterns/supabase-storage.md`). Um bucket único com prefixo por loja e
tipo é o suficiente mais simples: cumpre a regra 4 sem introduzir convenção
nova de nomenclatura, e o prefixo por loja facilita policy de escrita restrita
por `storeId` sem duplicar buckets por loja (que não escalaria com múltiplas
lojas).

**Alternatives considered**:

- Um bucket por loja: rejeitado, não escala e não é exigido pela ADR.
- Manter extensão original no caminho: rejeitado, ADR-0003 regra 3 já decide
  que a versão normalizada (sempre WebP, `docs/patterns/supabase-storage.md`)
  é a única servida; manter a extensão original criaria ambiguidade sobre
  qual arquivo é o real.

## Decision: Limpeza de asset ao excluir produto é condicional, não em cascata direta

Ao excluir definitivamente um produto, remover o objeto do Storage e a linha
de `assets` somente se nenhum outro `products`/`hero_banners` ainda referencia
o mesmo `asset_id`. Caso contrário, preservar o asset.

**Rationale**: ADR-0003 regra 7 diz "remover o asset associado quando isso for
seguro", delegando o julgamento de segurança à implementação em vez de exigir
cascata incondicional. `docs/data-model.md` §6 exige "sem deixar referência
órfã" no sentido de não deixar um asset sem dono útil, não de apagar um
recurso ainda em uso por outra entidade. Checar referências restantes antes de
apagar evita quebrar um banner ou outro produto que reusa a mesma imagem.

**Alternatives considered**:

- Apagar sempre, incondicionalmente: rejeitado, quebraria qualquer reuso de
  imagem entre entidades sem aviso.
- Nunca apagar (manter todo asset indefinidamente): rejeitado, contradiz
  ADR-0003 regra 7 e acumula lixo de Storage sem necessidade.

## Decision: Normalização sempre para WebP via `sharp`, validação por conteúdo real

Validar o arquivo recebido pelo conteúdo real (magic bytes / `sharp` decode),
não pela extensão ou `Content-Type` informado pelo cliente; rejeitar antes de
qualquer escrita no Storage se a validação falhar. Normalizar sempre para
WebP, conforme `docs/patterns/supabase-storage.md` (`version_baseline: sharp
0.35.3`) e ADR-0003 regra 3. O arquivo original (incluindo HEIC/HEIF) não é
retido após a normalização, também por decisão já aprovada.

**Rationale**: `sharp` já está instalado (`package.json`) e é a biblioteca
aprovada; confiar em `Content-Type`/extensão contraria a regra MUST NOT já
registrada em `docs/patterns/supabase-storage.md`.

**Alternatives considered**: nenhuma — decisão já fechada nos documentos
canônicos, este research apenas confirma que não há necessidade de reabri-la
para esta feature.

## Decision: Reautorização por operação, reusando `getAuthenticatedStore`

Toda rota de produto e de asset chama `getAuthenticatedStore` (já existente,
`src/lib/auth/get-authenticated-store.ts`) para resolver `storeId` no
servidor antes de qualquer leitura/escrita, e nunca aceita um `storeId`
vindo do cliente.

**Rationale**: Mesmo padrão já validado pela feature 001 (`GET /admin/store`);
reusar evita duplicar lógica de autorização e mantém RLS como segunda camada,
não a única.

**Alternatives considered**: middleware de autorização centralizado —
avaliado e não adotado agora por não haver ainda um segundo padrão de rota
que justifique a abstração (YAGNI); pode ser revisitado se um terceiro
domínio repetir a mesma necessidade.
