# Catalog Import Contract

Esta feature adiciona **um** endpoint novo a `docs/api/openapi.yaml`, tag
`Catalog import`, mais um bucket privado novo do Supabase Storage
(`catalog-import-uploads`). Toda criação efetiva de produto reusa
`POST /admin/assets` e `POST /admin/products` já aprovados, sem alteração
de contrato.

## Upload: direto ao Storage, fora deste endpoint (ADR-0008, revisado 2026-08-27)

O PDF **não** é enviado no corpo de `POST /admin/catalog-imports`. Vercel
Functions têm um teto rígido de 4,5 MB de corpo de requisição/resposta,
não configurável — inviável para um catálogo real (mantenedor confirmou
faixa de até ~100 MB). O navegador envia o arquivo diretamente ao bucket
privado `catalog-import-uploads` usando a sessão autenticada da
administradora (mesmo padrão de client upload já usado pela Vercel/
Supabase para arquivos grandes), sem passar pelo servidor Next.js.

## Endpoint novo: `POST /admin/catalog-imports`

- `security`: `bearerAuth` (mesma autorização de loja de todo o admin).
- `requestBody`: `application/json`, `required: [storagePath]`.
  `storagePath`: caminho do PDF já enviado ao bucket
  `catalog-import-uploads`, escopado à própria loja — nunca os bytes do
  arquivo.
- `responses`:
  - `200`: `{ candidates: CatalogImportCandidate[] }` — array pode ser
    vazio (PDF válido, nada extraído; FR-011).
  - `400`: `BadRequest` (corpo malformado).
  - `401` / `403`: `Unauthorized` / `Forbidden`.
  - `404`: `NotFound` (`storagePath` não corresponde a um objeto existente
    — upload nunca completou, ou já foi processado/removido).
  - `413`: `PayloadTooLarge` (arquivo no Storage acima do limite de 50 MB —
    teto real do Supabase Storage no plano Free, ver ADR-0008).
  - `415`: `UnsupportedMediaType` (arquivo não é PDF).
  - `422`: `ValidationError` (PDF corrompido, excede limite de páginas, ou
    timeout de processamento — ADR-0008).
  - `500`: `ServiceUnavailable`.

O servidor busca o arquivo do Storage (chamada de saída, sem o teto de
entrada da Function) e o remove do bucket após o processamento, sucesso ou
falha.

### Schema `CatalogImportCandidate`

```yaml
type: object
required: [name, sku, description, isDuplicateSku]
properties:
  name:
    type: string
  sku:
    type: [string, "null"]
  description:
    type: string
    description: >
      Pode vir vazio quando a extração não encontrou texto associável;
      correção manual é obrigatória antes de confirmar (FR-006), e a
      criação (POST /admin/products) já rejeita nome/descrição vazios.
  isDuplicateSku:
    type: boolean
    description: >
      true quando o SKU extraído já pertence a um produto existente da
      mesma loja, ou colide com outro candidato do mesmo PDF (FR-004/FR-005).
```

Nenhum campo de preço existe neste schema — preço extraído do PDF é
descartado antes de chegar à resposta (FR-003), nunca serializado.

## Reusado sem alteração

- `POST /admin/assets` (anexar imagem a cada candidato antes de
  confirmar).
- `POST /admin/products` (criar produto por candidato confirmado; já
  aplica unicidade de SKU e posse de asset — `checkAssetOwnership`,
  `createProduct`).

## Observação registrada, fora do escopo desta feature

Mesmo padrão já registrado para outros endpoints: `POST /admin/catalog-imports`
inclui `500` desde a criação (aprendizado das rodadas anteriores), então não
há débito a registrar aqui desta vez.
