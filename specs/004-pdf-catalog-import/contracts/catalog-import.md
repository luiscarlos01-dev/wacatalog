# Catalog Import Contract

Esta feature adiciona **um** endpoint novo a `docs/api/openapi.yaml`, tag
`Catalog import`. Toda criação efetiva de produto reusa
`POST /admin/assets` e `POST /admin/products` já aprovados, sem alteração
de contrato.

## Endpoint novo: `POST /admin/catalog-imports`

- `security`: `bearerAuth` (mesma autorização de loja de todo o admin).
- `requestBody`: `multipart/form-data`, `required: [file]`. `file`:
  binário, PDF, até o limite de tamanho definido em `plan.md` (10 MB).
- `responses`:
  - `200`: `{ candidates: CatalogImportCandidate[] }` — array pode ser
    vazio (PDF válido, nada extraído; FR-011).
  - `400`: `BadRequest` (multipart malformado).
  - `401` / `403`: `Unauthorized` / `Forbidden`.
  - `413`: `PayloadTooLarge` (arquivo acima do limite de tamanho).
  - `415`: `UnsupportedMediaType` (arquivo não é PDF).
  - `422`: `ValidationError` (PDF corrompido, excede limite de páginas, ou
    timeout de processamento — ADR-0008 regra 3).
  - `500`: `ServiceUnavailable`.

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
