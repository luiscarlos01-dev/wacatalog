# Assets Contract

Esta feature implementa (não redefine) o contrato `Assets` já aprovado em
`docs/api/openapi.yaml`: `POST /admin/assets`, multipart (`file`, `kind`).
Nenhum código deste endpoint existia antes desta feature; o contrato HTTP e a
decisão arquitetural (ADR-0003) já estavam aprovados.

## Preservado do contrato existente

- formatos aceitos: JPEG, PNG, WebP, HEIC, HEIF;
- limite de 10 MB por arquivo original;
- `201` com `Asset` (`id`, `contentType`, `byteSize`, `publicUrl`, ...) em
  sucesso;
- `400` para requisição malformada, `401`/`403` para autenticação/autorização,
  `413` para arquivo acima do limite, `415` para formato não aceito.

## Decisões de implementação (ver `research.md`, sem conflito com o contrato)

- validação por conteúdo real do arquivo, não por extensão/`Content-Type`
  informado;
- normalização sempre para WebP via `sharp`; original não é retido;
- caminho gerado pelo sistema (`{storeId}/{kind}/{assetId}.webp`), nunca o
  nome enviado pela revendedora;
- bucket único, leitura pública, escrita restrita à loja autenticada;
- exclusão de asset (disparada pela exclusão de produto) só remove o objeto
  quando nenhuma outra entidade da loja ainda o referencia.

## Observação registrada, fora do escopo desta feature

Mesmo achado do contrato de produtos: `POST /admin/assets` também não
documenta `500` em `docs/api/openapi.yaml`. Registrar para a mesma
consolidação futura.
