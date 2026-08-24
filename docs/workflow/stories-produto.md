# Histórias do produto — Wacatalog

> **Etapa:** 02 — Histórias
>
> **Status:** validado no stress-test e aprovado na etapa 03.

## Convenções

As histórias abaixo descrevem comportamento de produto, não endpoints,
componentes ou decisões de implementação. Quando o comportamento ainda não
foi aprovado, o critério permanece como pergunta ou limite explícito.

## Jornada pública: consultar o catálogo

### H1 — Visualizar o catálogo da loja

Como cliente da revendedora, quero abrir o catálogo público da loja para
consultar seu sortimento.

Critérios de aceitação:

- Dado um catálogo de uma loja, quando o cliente acessá-lo, então somente o
  conteúdo público daquela loja será apresentado.
- Dado um produto não visível no catálogo, quando o cliente consultar o
  catálogo, então esse produto não será apresentado.
- Dado que o cliente esteja em dispositivo móvel, quando navegar pelo
  catálogo, então o conteúdo essencial continuará utilizável sem exigir
  linguagem técnica ou fluxo longo.

### H2 — Encontrar um produto

Como cliente da revendedora, quero localizar um produto visível para decidir
se devo pedir informações ou fazer um pedido.

Critérios de aceitação:

- Dado um produto visível, quando o cliente navegar pelo catálogo, então ele
  conseguirá identificar o produto e suas informações disponíveis no MVP.
- Quando um produto tiver SKU informado, o catálogo também o exibirá para a
  cliente.
- Dado um produto visível e disponível para pedido, quando o cliente abrir o
  produto, então poderá selecionar a quantidade desejada.
- A quantidade selecionada não poderá ultrapassar a quantidade disponível
  informada pela revendedora.
- Dado um produto cuja disponibilidade para pedido esteja desativada, quando o
  cliente o visualizar, então o estado não será apresentado como disponível
  para pedido.
- Ao confirmar a quantidade, o produto será adicionado ao carrinho.

### H2.1 — Revisar o carrinho

Como cliente, quero revisar os produtos e quantidades selecionados antes de
enviar o pedido para a revendedora.

Critérios de aceitação:

- Dado que o cliente tenha confirmado produtos, quando abrir o carrinho, então
  verá todos os produtos selecionados e suas quantidades.
- O cliente poderá continuar navegando e adicionar outros produtos antes de
  enviar o pedido.
- O carrinho não incluirá produtos ou quantidades que o cliente não tenha
  confirmado.
- Dado que o carrinho contenha itens, quando o cliente solicitar esvaziá-lo,
  então a interface pedirá confirmação antes de remover todos os itens.
- Dado o pedido de esvaziamento, quando o cliente cancelar a confirmação,
  então os produtos e quantidades permanecerão no carrinho.
- Dado o pedido de esvaziamento, quando o cliente confirmar, então todos os
  produtos e quantidades serão removidos do carrinho.

### H2.2 — Enviar o pedido pelo WhatsApp

Como cliente, quero enviar o conteúdo do carrinho para a revendedora pelo
WhatsApp para solicitar os produtos selecionados.

Critérios de aceitação:

- Dado um carrinho revisado, quando o cliente clicar em enviar pedido, então o
  WhatsApp da revendedora será aberto com uma mensagem pré-preenchida.
- A mensagem começará com uma saudação e a identificação da loja, listará os
  produtos com SKU quando informado, nome e quantidade, apresentará o total de
  unidades e terminará solicitando a confirmação da disponibilidade.
- Quando um produto tiver SKU informado, a mensagem também conterá seu SKU
  para facilitar o repasse do pedido à empresa representante.
- Quando um produto não tiver SKU informado, a mensagem conterá seu nome e sua
  quantidade normalmente.
- A mensagem não conterá preços.
- A revendedora poderá configurar e alterar o número de WhatsApp que receberá
  os pedidos da loja.
- A configuração aceitará formatos familiares de número brasileiro, mas
  armazenará somente dígitos no padrão internacional com `55`, validando DDD e
  número antes de salvar.
- O envio usará um link `wa.me` gerado a partir do número normalizado; sem um
  número válido configurado, o pedido não poderá ser enviado.
- A revendedora poderá testar o número configurado e deverá confirmar que o
  WhatsApp abriu a conta correta antes de habilitar o envio de pedidos.
- Enquanto o número não estiver válido e confirmado, o carrinho será
  preservado e o envio permanecerá indisponível.
- O envio da lista não reservará os produtos; valores e disponibilidade serão
  confirmados pela revendedora no atendimento.
- O MVP não processará pagamento, checkout ou confirmação automática do
  pedido; a continuidade ocorrerá no WhatsApp.

## Jornada da administradora: acessar o painel

### H3 — Entrar com conta provisionada

Como administradora da loja, quero entrar com meu email e senha para manter o
catálogo.

Critérios de aceitação:

- Dado que o mantenedor provisionou a conta, quando a administradora informar
  credenciais válidas, então terá acesso ao painel associado à sua loja.
- Dado que não existe cadastro público no MVP, quando uma pessoa não
  provisionada tentar criar conta, então o produto não oferecerá onboarding
  self-service.
- A senha, tokens e chaves privilegiadas nunca serão exibidos em logs,
  documentação, fixtures ou mensagens de suporte.

### H4 — Retornar ao painel em dispositivo confiável

Como administradora, quero permanecer autenticada no meu dispositivo confiável
para não repetir o login a cada visita.

Critérios de aceitação:

- Dado um login válido em dispositivo confiável, quando a administradora
  retornar ao painel, então a sessão persistente permitirá continuar sem novo
  login enquanto permanecer válida.
- Dado que a sessão não seja mais válida, quando a administradora acessar o
  painel, então o produto pedirá autenticação novamente sem expor a sessão ou
  credenciais.

### H5 — Recuperar o acesso com suporte claro

Como administradora, quero recuperar o acesso em linguagem simples e obter
ajuda do mantenedor sem compartilhar minha senha.

Critérios de aceitação:

- Dado que a administradora não consiga entrar, quando iniciar a recuperação,
  então verá instruções compreensíveis e o caminho de suporte do mantenedor.
- O procedimento de suporte nunca solicitará, registrará ou retransmitirá a
  senha da administradora.
- O fluxo de recuperação, duração de sessão e procedimento operacional serão
  detalhados no ADR de autenticação após a aprovação da etapa 03.

## Jornada da administradora: manter produtos

### H6 — Gerenciar produtos com CRUD

Como administradora da loja, quero visualizar, criar, atualizar, desativar e
excluir os produtos do catálogo para manter as informações atuais.

Critérios de aceitação:

- Dado que a administradora esteja autorizada para uma loja, quando visualizar
  a área de produtos, então verá os produtos pertencentes à sua loja.
- Dado que a administradora esteja autorizada para uma loja, quando criar um
  produto, então o registro ficará associado àquela loja.
- Ao criar um produto, a administradora poderá informar opcionalmente seu SKU,
  enviar uma imagem e informar sua descrição, além da quantidade disponível e
  dos demais campos aprovados para o produto.
- Quando informado, o SKU deverá ser único dentro do catálogo da loja.
- Dado um produto existente da loja, quando a administradora atualizá-lo,
  incluindo SKU, imagem, descrição ou quantidade disponível, então a mudança
  será refletida no catálogo conforme seu estado de visibilidade e
  disponibilidade.
- Dado um produto existente da loja, quando a administradora solicitar sua
  exclusão, então verá a confirmação “Tem certeza de que deseja excluir
  definitivamente o produto ‘{nome}’? Essa ação não pode ser desfeita. Para
  apenas ocultá-lo e preservá-lo, use ‘Desativar’.” com as ações “Cancelar” e
  “Excluir definitivamente”.
- Quando a administradora cancelar a confirmação, o produto permanecerá
  preservado.
- Quando a administradora confirmar “Excluir definitivamente”, o produto será
  removido definitivamente do catálogo e da listagem de produtos.
- Depois de uma exclusão definitiva, para voltar a usar o produto, a
  administradora deverá cadastrá-lo novamente.
- Dado um produto existente da loja, quando a administradora solicitar sua
  desativação, então o cadastro será preservado, mas o produto deixará de ser
  apresentado no catálogo e de ser considerado disponível para pedido.
- Dado um produto desativado, quando a administradora decidir reutilizá-lo,
  então poderá reativá-lo sem cadastrá-lo novamente, mas deverá configurar
  novamente seus estados de visibilidade e disponibilidade.
- O MVP não exibe nem gerencia preços de produtos; o SKU é opcional, editável e
  único dentro do catálogo, servindo como identificador operacional, não como
  preço.
- A exclusão é definitiva; a desativação é a alternativa para preservar o
  cadastro e poupar um novo cadastro.

### H7 — Controlar visibilidade e disponibilidade separadamente

Como administradora, quero controlar se o produto aparece no catálogo e se
está disponível para pedido usando estados independentes.

Critérios de aceitação:

- Dado um produto visível e indisponível para pedido, quando o cliente consultar
  o catálogo, então ele poderá ver o produto sem que ele seja indicado como
  disponível para pedido.
- A quantidade disponível limita quantas unidades o cliente poderá selecionar;
  ela não substitui o controle independente de disponibilidade para pedido.
- Dado um produto não visível, quando o cliente consultar o catálogo, então o
  produto não aparecerá, independentemente de seu estado de disponibilidade.
- Dado um produto desativado, quando o cliente consultar o catálogo, então o
  produto não aparecerá e não será indicado como disponível para pedido.
- Os rótulos, combinações válidas e ação de pedido precisam ser validados com
  a revendedora na etapa 03.

## Jornada da administradora: manter o hero

### H8 — Gerenciar banners ordenados

Como administradora da loja, quero manter os banners principais para apresentar
o catálogo com uma ordem controlada.

Critérios de aceitação:

- O hero aceitará no máximo cinco banners ordenados.
- Cada banner terá imagem, descrição acessível, título/texto opcional e estado
  ativo.
- Um banner inativo não será apresentado no hero público.
- O MVP não inclui CTA nem agendamento de banners.
- O upload aceitará JPEG, PNG, WebP, HEIC e HEIF, com limite de 10 MB por
  arquivo.
- Imagens aceitas serão normalizadas automaticamente para formato compatível
  com navegadores antes de serem apresentadas no catálogo.
- O sistema exibirá uma mensagem clara quando o arquivo não puder ser
  processado.
- Regras detalhadas de ordenação serão definidas antes do contrato técnico.

## Jornada operacional: provisionar e isolar lojas

### H9 — Provisionar a primeira loja

Como mantenedor, quero provisionar uma loja e sua administradora para iniciar
o primeiro uso sem cadastro público.

Critérios de aceitação:

- Dado uma nova loja, quando o mantenedor a provisionar, então a loja terá uma
  identidade e uma conta administradora associada conforme o processo
  aprovado.
- A identidade da loja é mantida pelo mantenedor no MVP; a administradora não
  a edita pelo painel.
- A credencial inicial será entregue fora do repositório e não aparecerá em
  logs, documentos ou prompts.

### H10 — Impedir acesso entre lojas

Como mantenedor, quero que dados e operações de uma loja não sejam acessíveis
por outra loja.

Critérios de aceitação:

- Dado que a administradora esteja autenticada em uma loja, quando consultar
  ou alterar dados, então somente registros autorizados daquela loja estarão
  disponíveis.
- Dado um identificador ou tentativa de acesso de outra loja, quando a
  operação ocorrer, então ela será negada sem revelar dados da loja alvo.
- Regras de autorização, políticas do banco e fronteiras server/client serão
  registradas nos ADRs antes da implementação.

## Critério de sucesso da primeira validação

- O primeiro catálogo será validado com até 50 produtos.
- A primeira revendedora, com baixa familiaridade tecnológica, deverá conseguir
  manter produtos, configurar e testar o WhatsApp, receber um pedido de uma
  cliente e repassá-lo à empresa representante após uma orientação inicial
  simples, sem depender de intervenção técnica recorrente.
- A cliente deverá conseguir encontrar um produto, selecionar a quantidade,
  revisar o carrinho e enviar o pedido com SKU quando informado.

## Evolução futura fora do MVP

- A importação de um catálogo mensal em PDF poderá ser planejada em uma
  feature posterior. Ela deverá prever extração dos campos, pré-visualização,
  validação, tratamento de duplicidades e confirmação da revendedora antes de
  criar ou atualizar produtos.

## Fontes

- `docs/workflow/discovery-produto.md` — hipóteses, escopo e riscos da etapa 01.
- `docs/workflow/checkpoint.md` — decisões aprovadas até a retomada.
- `AGENTS.md` — invariantes do produto e restrições de segurança.
- `.specify/memory/constitution.md` — princípios de acessibilidade, isolamento
  de tenants e evidência antes da conclusão.
