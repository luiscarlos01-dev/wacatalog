# Products Contract

Esta feature consome o contrato `Products` já aprovado em
`docs/api/openapi.yaml`: `GET/POST /admin/products`,
`GET/PATCH/DELETE /admin/products/{productId}`,
`POST /admin/products/{productId}/deactivate`,
`POST /admin/products/{productId}/reactivate`. Não redefine nenhum campo,
endpoint ou código de resposta já aprovado.

## Preservado do contrato existente

- autenticação por bearer/sessão em toda rota;
- `401` para ausência/invalidade de autenticação, `403` para identidade válida
  sem autorização para a loja alvo;
- `404` quando o produto não existe ou pertence a outra loja (nunca revela
  qual dos dois);
- `409` quando o SKU já está em uso por outro produto da mesma loja;
- `422` para falha de validação de domínio;
- nenhum identificador de loja vindo do browser pode sobrepor a resolução de
  loja feita no servidor.

## Regras de negócio aplicadas nesta feature (PRD §5, sem redefinir contrato)

1. Produto não visível não aparece, independente da disponibilidade.
2. Produto visível e indisponível é consultável, mas não pedível.
3. Produto desativado não aparece nem é pedível.
4. Quantidade disponível não substitui o estado de disponibilidade.
5. Desativar preserva o cadastro; excluir remove definitivamente.
6. Reativar sempre volta com `isVisible=false` e `isOrderable=false`,
   independente do estado anterior à desativação.
7. SKU, quando informado, é único por loja e pode ser editado.

## Observação registrada, fora do escopo desta feature

Nenhum dos endpoints `/admin/products*` documenta resposta `500`
(`service_unavailable`), mesmo achado já reportado para `GET /admin/store` e
corrigido em `docs/api/openapi.yaml`. Como a implementação desta feature reusa
o mesmo helper de autorização (`getAuthenticatedStore`), o mesmo caminho de
falha existe aqui. Não é bloqueio de plan/tasks — registrar para consolidação
de documentação depois da revisão desta feature (mesmo padrão do delta L-5 da
feature 001).
