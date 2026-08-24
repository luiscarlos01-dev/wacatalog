# ADR-0005 — Persistência relacional do MVP

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** entidades persistidas e limites do modelo do MVP

## Contexto

O Wacatalog precisa sustentar lojas, administradoras, produtos e banners com
isolamento por loja. O cliente também precisa montar um carrinho e enviar uma
mensagem pelo WhatsApp, mas o MVP não processará checkout, pagamento ou pedido
persistido.

As decisões de produto exigem estados independentes para visibilidade e
disponibilidade, SKU opcional único dentro da loja e distinção entre
desativação reversível e exclusão definitiva.

## Decisão

1. O Supabase Postgres será a fonte de verdade para identidade da loja,
   associações de administradoras, configurações da loja, produtos e banners.
2. O modelo será relacional e normalizado. Registros pertencentes a uma loja
   carregarão a referência da loja ou estarão ligados a ela por uma relação
   explícita, conforme o ADR-0002.
3. O produto terá, no mínimo, nome, SKU opcional, descrição, referência de
   imagem, quantidade disponível, visibilidade no catálogo, disponibilidade para
   pedido e estado ativo. Quando preenchido, o SKU será único dentro da loja.
4. Visibilidade, disponibilidade para pedido e estado ativo serão campos
   independentes:
   - não visível: não aparece no catálogo;
   - visível e indisponível: aparece, mas não pode ser pedido;
   - desativado: não aparece e não pode ser pedido;
   - quantidade disponível: limita a seleção, mas não substitui a
     disponibilidade para pedido.
5. A desativação preservará o registro. A exclusão definitiva removerá o
   registro e suas referências de asset conforme as regras do ADR-0003. A
   reativação exigirá nova configuração de visibilidade e disponibilidade; os
   estados anteriores não serão restaurados automaticamente.
6. Banners pertencerão a uma loja, terão ordem explícita, estado ativo, imagem,
   descrição acessível e texto opcional. O modelo deverá impedir mais de cinco
   banners ativos ou ordenáveis conforme a regra de produto aprovada.
7. Preços não terão campos nem operações no modelo do MVP.
8. O carrinho será uma seleção temporária do cliente para montar a mensagem do
   WhatsApp. O MVP não persistirá pedidos, pagamentos, reservas de estoque,
   checkout ou confirmação automática.
9. Constraints do banco e políticas RLS serão usadas para reforçar invariantes
   de integridade e isolamento; validações de interface não serão a única
   proteção.

## Consequências

### Positivas

- O modelo representa diretamente as regras de produto e evita estados
  implícitos difíceis de autorizar.
- A ausência de preço e pedido persistido mantém o MVP menor e coerente com a
  continuidade do atendimento no WhatsApp.
- A desativação preserva o trabalho da revendedora, enquanto a exclusão deixa
  explícita a perda definitiva do cadastro.
- Constraints e RLS reduzem a chance de duplicidade de SKU ou vazamento entre
  lojas.

### Negativas e riscos

- Limitar banners e manter estados independentes exige regras de transição e
  testes de combinações inválidas.
- Sem pedido persistido, o Wacatalog não terá histórico, acompanhamento ou
  reconciliação automática de solicitações.
- O carrinho temporário pode ser perdido ao trocar de dispositivo ou quando o
  armazenamento local for apagado.

## Regras derivadas para os documentos seguintes

- `docs/data-model.md` deve detalhar entidades, chaves, constraints, índices,
  relações e políticas derivadas deste ADR.
- O contrato OpenAPI não deve criar endpoints de preço, checkout, pagamento,
  reserva ou pedido persistido.
- A especificação de feature deve cobrir as combinações de visibilidade,
  disponibilidade e desativação.
- Testes devem verificar SKU opcional e único por loja, quantidade não negativa,
  limite de cinco banners, exclusão definitiva e ausência de acesso entre
  lojas.

## Alternativas consideradas

- **Guardar o carrinho e o pedido no banco:** rejeitado para o MVP; adicionaria
  ciclo de vida, estado de pedido e responsabilidades de operação que hoje
  pertencem ao WhatsApp.
- **Usar documento JSON como fonte principal:** rejeitado; as relações entre
  loja, administradora, produto, banner e asset precisam de constraints e
  autorização relacionais.
- **Usar quantidade como sinônimo de disponibilidade:** rejeitado; o produto
  precisa poder estar visível sem aceitar pedidos.
- **Usar exclusão lógica para toda remoção:** rejeitado; a regra aprovada exige
  exclusão definitiva quando a administradora confirmar essa ação.

## Fontes

- `AGENTS.md` — invariantes de produto, tenancy e escopo do MVP.
- `docs/workflow/checkpoint.md` — decisões aprovadas na etapa 03.
- `docs/workflow/stories-produto.md` — H2, H6, H7, H8 e H10.
- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md` — fronteira de
  autorização por loja.
- `docs/adrs/0003-storage-e-imagens-do-catalogo.md` — referência de assets.
