# PRD — Wacatalog MVP

- **Status:** Aceito
- **Data:** 2026-08-22
- **Fonte de produto:** `docs/workflow/discovery-produto.md`,
  `docs/workflow/stories-produto.md` e `docs/workflow/checkpoint.md`
- **Decisões estruturais:** `docs/adrs/0001` a `docs/adrs/0006`

## 1. Resumo

O Wacatalog é um catálogo digital multi-tenant para revendedoras. A primeira
validação será feita com uma revendedora com baixa familiaridade tecnológica,
que precisa manter seus produtos e receber pedidos de clientes pelo WhatsApp.

O MVP terá catálogo público por loja, painel autenticado para manutenção,
upload de imagens, carrinho temporário e envio de uma mensagem pré-preenchida
para o WhatsApp configurado da loja.

## 2. Problema e objetivo

Hoje, a revendedora depende de materiais enviados periodicamente e de processos
manuais para apresentar produtos e receber solicitações. O produto deve reduzir
o atrito para manter um catálogo consultável e transformar a seleção da cliente
em uma mensagem clara que possa ser atendida e repassada pela revendedora.

Objetivo do MVP:

> Permitir que a primeira revendedora mantenha seu catálogo com uma orientação
> inicial simples e consiga receber e repassar pedidos de suas clientes sem
> depender de intervenção técnica recorrente.

## 3. Público

### Cliente da revendedora

Consulta o catálogo principalmente no celular, encontra produtos, escolhe
quantidades e envia uma solicitação pelo WhatsApp.

### Administradora da loja

É a revendedora, com baixa familiaridade tecnológica. Mantém produtos, banners,
disponibilidade e número de WhatsApp em linguagem simples.

### Mantenedor

Provisiona lojas e contas, mantém a identidade da loja no MVP e presta suporte
de recuperação sem solicitar ou manipular senhas.

## 4. Escopo incluído

### 4.1 Catálogo público

- catálogo identificado por loja;
- somente produtos ativos e visíveis da loja são listados;
- produto visível pode exibir nome, SKU quando informado, descrição, imagem e
  estado de disponibilidade;
- SKU, quando informado, aparece para a cliente;
- banners ativos aparecem no hero na ordem configurada;
- hero com no máximo cinco banners;
- conteúdo utilizável em dispositivos móveis.

### 4.2 Produtos

A administradora poderá:

- visualizar produtos da própria loja;
- criar produto;
- editar nome, SKU, descrição, imagem e quantidade disponível;
- controlar visibilidade no catálogo separadamente da disponibilidade para
  pedido;
- desativar produto para preservar seu cadastro;
- reativar produto e configurar novamente visibilidade e disponibilidade;
- excluir produto definitivamente após confirmação explícita.

O produto terá, no mínimo, nome, descrição, quantidade disponível, estados de
visibilidade, disponibilidade e atividade, além de SKU opcional e referência de
imagem. O nome é obrigatório para que a cliente identifique o produto; preço,
categoria e SKU obrigatório não fazem parte do MVP.

Quando informado, o SKU será editável e único dentro do catálogo da loja.

### 4.3 Imagens

- formatos aceitos: JPEG, PNG, WebP, HEIC e HEIF;
- limite: 10 MB por arquivo original;
- imagens serão normalizadas para formato compatível com navegadores;
- falhas de formato, tamanho ou processamento terão mensagem clara;
- a entrada deve funcionar com fotos enviadas diretamente do celular.

### 4.4 Banners

Cada banner terá imagem, descrição acessível, texto opcional, estado ativo e
posição. O MVP não terá CTA, link de campanha ou agendamento de banners.

### 4.5 Carrinho e WhatsApp

- a cliente pode selecionar uma quantidade limitada pela quantidade disponível;
- pode adicionar outros produtos e revisar os itens;
- pode esvaziar o carrinho, mas precisa confirmar;
- cancelar a confirmação preserva os itens;
- confirmar remove todos os itens;
- o carrinho não reserva estoque e não cria pedido persistido;
- o envio abre o WhatsApp da loja com mensagem pré-preenchida;
- a mensagem contém saudação, identificação da loja, produtos, SKU quando
  houver, nomes, quantidades, total de unidades e solicitação de confirmação;
- a mensagem não contém preços;
- sem SKU, o item é enviado com nome e quantidade.

Mensagem de referência:

```text
Olá! Gostaria de solicitar os seguintes produtos do catálogo da [nome da loja]:

- SKU: ABC123 — Produto exemplo — 2 unidades
- Outro produto — 1 unidade

Total: 3 unidades.

Aguardo a confirmação da disponibilidade.
```

### 4.6 WhatsApp da loja

- a revendedora pode configurar e alterar o número que recebe pedidos;
- a entrada aceita formatos familiares de número brasileiro;
- o sistema normaliza para dígitos no padrão internacional brasileiro;
- o envio usa link `wa.me` gerado a partir do número normalizado;
- a revendedora deve testar o número e confirmar que a conta correta foi
  aberta;
- enquanto o número não estiver válido e confirmado, o envio fica indisponível
  e o carrinho é preservado.

### 4.7 Acesso e recuperação

- acesso por email e senha;
- contas criadas pelo mantenedor;
- sem cadastro público;
- sessão persistente em dispositivo confiável;
- recuperação por email em linguagem simples;
- suporte do mantenedor sem solicitar ou registrar senha;
- sem OAuth, Cognito ou MFA no MVP.

### 4.8 Tenancy e operação

- toda loja tem seus próprios produtos, banners, assets e configurações;
- administradora só acessa dados da loja associada;
- catálogo público só expõe conteúdo publicado da loja solicitada;
- RLS e políticas de Storage reforçam o isolamento;
- identidade visual da loja é mantida pelo mantenedor no MVP;
- o primeiro catálogo será validado com até 50 produtos.

## 5. Regras de negócio

1. Produto não visível não aparece, independentemente da disponibilidade.
2. Produto visível e indisponível pode ser consultado, mas não pode ser
   adicionado ao carrinho.
3. Produto desativado não aparece e não pode ser pedido.
4. Quantidade disponível não substitui o estado de disponibilidade.
5. O envio não reserva estoque; a revendedora confirma disponibilidade no
   atendimento.
6. Desativar preserva o cadastro; excluir definitivamente remove o cadastro.
7. Ao reativar, visibilidade e disponibilidade precisam ser configuradas
   novamente.
8. SKU informado é único dentro da loja e pode ser editado.
9. Preços não são armazenados, exibidos ou enviados.
10. O sistema não cria pedido, pagamento, checkout ou histórico de pedidos no
    MVP.

## 6. Exclusão definitiva

Antes da exclusão, a interface exibirá:

> Tem certeza de que deseja excluir definitivamente o produto “{nome}”? Essa
> ação não pode ser desfeita. Para apenas ocultá-lo e preservá-lo, use
> “Desativar”.

Ações disponíveis: `Cancelar` e `Excluir definitivamente`.

Cancelar preserva o produto. Confirmar remove o produto definitivamente.

## 7. Requisitos de experiência e acessibilidade

- cópia principal em PT-BR simples;
- layout responsivo com prioridade para celular;
- navegação por teclado;
- foco visível;
- contraste adequado;
- diálogos com confirmação clara;
- suporte à preferência de movimento reduzido;
- mensagens de erro acionáveis e sem linguagem técnica desnecessária;
- estados de carregamento, vazio, sucesso e falha nos fluxos principais.

## 8. Segurança e privacidade

- senhas, tokens, chaves privadas e chaves administrativas nunca entram em
  código, logs, fixtures, documentação operacional ou prompts;
- a chave `service_role` fica somente no servidor;
- toda operação administrativa verifica sessão e loja;
- RLS é a barreira principal de dados;
- assets públicos não devem conter dados pessoais ou secretos;
- previews não usam dados reais da primeira loja;
- erros não revelam a existência de registros de outra loja.

## 9. Critério de sucesso da primeira validação

A validação será considerada bem-sucedida quando:

- a revendedora conseguir manter um catálogo de até 50 produtos após uma
  orientação inicial simples;
- conseguir configurar e testar o WhatsApp sem intervenção técnica recorrente;
- uma cliente conseguir encontrar um produto, escolher quantidade, revisar o
  carrinho e enviar a mensagem;
- a revendedora conseguir interpretar e repassar o pedido à empresa
  representante;
- a jornada não perder SKU, produto ou quantidade no caminho;
- os cenários de acesso entre lojas forem negados.

## 10. Fora do MVP

- preços;
- pagamento e checkout;
- pedido persistido, histórico ou reserva automática de estoque;
- cadastro público;
- OAuth, Cognito e MFA;
- CTA e agendamento de banners;
- edição da identidade da loja pela revendedora;
- importação de catálogo mensal por PDF;
- automações de leitura, OCR ou atualização em massa por arquivo.

A importação de PDF está registrada como evolução futura no issue do projeto e
deverá ter pré-visualização, validação, tratamento de duplicidades e confirmação
humana antes de criar ou atualizar produtos.

## 11. Derivações explícitas dos ADRs

Este PRD consolida as seguintes decisões estruturais, sem substituí-las:

- Supabase Auth e contas provisionadas: ADR-0001;
- loja como fronteira de autorização e RLS: ADR-0002;
- Storage e imagens públicas normalizadas: ADR-0003;
- App Router e fronteiras server/client: ADR-0004;
- persistência relacional e ausência de pedido persistido: ADR-0005;
- Vercel, ambientes separados e segredos: ADR-0006.

Detalhes derivados neste PRD que ainda precisam ser refletidos no modelo e no
contrato incluem nome obrigatório do produto, estados e transições, limite de
banners, formato de configuração do WhatsApp e mensagens de erro.

## 12. Gate

Este PRD está proposto. Após a aprovação humana, serão elaborados o modelo de
dados, o contrato OpenAPI e a revisão de consistência na ordem canônica.
