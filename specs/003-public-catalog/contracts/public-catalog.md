# Public Catalog Contract

Esta feature implementa (não redefine) o contrato já aprovado em
`docs/api/openapi.yaml`: `GET /stores/{storeSlug}/catalog`, sem
autenticação (`security: []`).

## Preservado do contrato existente

- `200` com `PublicCatalog` (`store`, `products[]`, `banners[]`);
- `404` quando o `storeSlug` não corresponde a nenhuma loja;
- `store.whatsappAvailable`/`store.whatsappNumber` fazem parte da resposta,
  mas não têm UI nesta feature (consumidos por uma futura feature de
  carrinho/WhatsApp);
- `products[]` usa o schema `PublicProduct` (sem preço, sem dado
  administrativo);
- `banners[]` usa o schema `PublicBanner`, no máximo 5, ordenados por
  posição.

## Regras de negócio aplicadas nesta feature (`docs/data-model.md` §4-5)

1. Só produtos com `is_active = true` e `is_visible = true` aparecem.
2. Só banners com `is_active = true` aparecem, ordenados por `position`.
3. Nenhum dado de associação, credencial ou administração é exposto.
4. Nenhuma policy aceita `store_id`/`storeSlug` alternativo como prova
   suficiente — a loja é sempre resolvida no servidor pelo slug da URL.

## Observação registrada, fora do escopo desta feature

Mesmo achado já registrado para os contratos de produtos/assets/store:
`GET /stores/{storeSlug}/catalog` também não documenta resposta `500` em
`docs/api/openapi.yaml`. Diferente dos outros casos, esta rota não usa
`getAuthenticatedStore` (é pública), mas ainda pode falhar por erro de
consulta ao banco — mesma consolidação futura de documentação, não
implementar aqui.
