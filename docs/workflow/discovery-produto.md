# Discovery do produto — Wacatalog

> **Etapa:** 01 — Discovery
>
> **Status:** insumo de produto para as etapas 02 e 03; ainda não é PRD nem
> decisão arquitetural.

## Problema e oportunidade

O Wacatalog deve permitir que uma revendedora mantenha um catálogo digital
apresentável para seus clientes sem depender de um catálogo hard-coded ou de
um fluxo técnico complexo. O primeiro uso real será de uma revendedora, mas
a fundação precisa suportar múltiplas lojas desde o início.

O problema ainda é uma hipótese de produto: não há, neste repositório,
evidência medida sobre o fluxo atual da revendedora, o volume de produtos ou a
frequência de atualização. Essas lacunas precisam ser tratadas na validação da
etapa 03, não preenchidas por suposição.

## Público e contexto de uso

### Público primário

- **Cliente da revendedora:** consulta o catálogo público, principalmente em
  dispositivo móvel, para encontrar produtos que podem ser pedidos.
- **Administradora da loja:** mantém produtos e banners pelo painel, com pouca
  tolerância a linguagem técnica e a fluxos longos.

### Público operacional

- **Mantenedor do Wacatalog:** provisiona a loja e a conta administradora,
  mantém a identidade da loja no MVP e presta suporte de recuperação sem
  expor credenciais.

## Hipóteses de produto

| Hipótese | Sinal observável | Como testar |
| --- | --- | --- |
| Um catálogo público centraliza a consulta de produtos da revendedora. | Clientes consultam o catálogo quando precisam verificar o sortimento. | Observar uma jornada real de consulta e registrar onde a pessoa abandona ou pede ajuda. |
| A administradora consegue manter o catálogo sem assistência contínua. | Ela visualiza, cria, atualiza, desativa e exclui produtos e banners no painel. | Teste moderado com tarefas de CRUD, upload de imagem e registro de erros, dúvidas e tempo até concluir. |
| Separar visibilidade de disponibilidade evita estados ambíguos. | Um produto pode deixar de aparecer ou ficar indisponível para pedido sem perder seu cadastro. | Validar cenários com a revendedora e observar se cada estado é compreendido. |
| A quantidade disponível orienta a seleção do pedido. | O cliente seleciona uma quantidade que não ultrapassa o estoque informado pela revendedora. | Testar produtos com diferentes quantidades e confirmar o comportamento quando a quantidade não for suficiente. |
| Um carrinho simples facilita enviar vários produtos em um único pedido. | O cliente acumula produtos, revisa as quantidades e envia a solicitação pelo WhatsApp. | Observar uma jornada completa de seleção, revisão e abertura da mensagem no WhatsApp. |
| Sessão persistente e recuperação simples reduzem bloqueios de acesso. | A administradora retorna ao painel no dispositivo confiável e consegue recuperar a conta com suporte. | Testar login, retorno à sessão e recuperação em linguagem simples; nunca registrar a credencial. |
| A fundação multi-tenant não cria fricção no primeiro uso. | A primeira loja funciona sem atalhos que comprometam isolamento futuro. | Exercitar cenários de autorização entre lojas antes da implementação e revisar políticas no gate técnico. |

## Escopo candidato do MVP

### Incluído na hipótese atual

- Catálogo público por loja.
- Painel administrativo para o catálogo inicial, com CRUD de produtos: visualizar,
  criar, atualizar, desativar e excluir.
- Upload de imagem ao criar ou atualizar um produto e edição de sua descrição.
- SKU opcional, editável e único dentro do catálogo para identificação do
  produto pela cliente e apoio à operação da revendedora.
- Definição e atualização da quantidade disponível de cada produto pela
  administradora.
- Carrinho para acumular produtos e quantidades durante a consulta.
- Revisão do carrinho e envio do pedido para o WhatsApp da revendedora com
  mensagem pré-preenchida.
- Configuração e alteração do número de WhatsApp da loja pela revendedora.
- O número será informado em formato familiar, normalizado para dígitos no
  padrão internacional brasileiro (`55` + DDD + número) e usado em um link
  `wa.me` gerado automaticamente.
- Opção de esvaziar o carrinho com confirmação e cancelamento da ação.
- Desativação para preservar o cadastro e evitar um novo cadastro quando o
  produto não estiver ativo; ao reativá-lo, a administradora deverá configurar
  novamente sua visibilidade e disponibilidade.
- Produtos sem preço no MVP; o SKU opcional, editável e único dentro do
  catálogo serve para identificação do produto pela cliente e para a operação
  da revendedora.
- Controles independentes de visibilidade no catálogo e disponibilidade para
  pedido.
- Hero com até cinco banners ordenáveis, cada um com imagem, descrição
  acessível, título/texto opcional e estado ativo.
- A primeira validação considerará um catálogo de até 50 produtos; esse é um
  volume inicial de MVP, não um limite estrutural permanente.
- Imagens de produtos e banners em JPEG, PNG, WebP, HEIC ou HEIF, com limite de
  10 MB por arquivo e normalização automática para exibição em navegadores.
- Identidade da loja mantida pelo mantenedor.
- Contas administradoras provisionadas pelo mantenedor, com email e senha,
  sessão persistente no dispositivo confiável e recuperação orientada.
- Base multi-tenant desde o primeiro tenant, com dados e autorização
  associados à loja.

### Fora de escopo conhecido

- Cadastro público de contas.
- OAuth, Cognito e MFA no MVP.
- Preços de produtos.
- Pagamento, checkout e processamento automático do pedido.
- CTA e agendamento de banners do hero.
- Manutenção da identidade da loja por administradoras no MVP.
- Importação automática de produtos a partir do PDF mensal enviado à
  revendedora.

### Evolução futura identificada

Uma futura versão poderá permitir que a revendedora envie o PDF do catálogo
mensal e importe os produtos para a loja. Essa ideia não faz parte do MVP e
deverá ser planejada separadamente, incluindo extração dos campos, validação,
pré-visualização, tratamento de duplicidades e confirmação humana antes de
criar ou atualizar produtos.

## Restrições e invariantes

- A aplicação será full-stack em Next.js e hospedada na Vercel.
- Supabase será usado para Postgres, Storage e Auth.
- Credenciais, tokens e chaves privilegiadas não entram em código, logs,
  documentação, fixtures ou prompts; a chave `service_role` permanece
  server-only.
- Todo registro pertencente a uma loja e toda política de acesso devem ser
  escopados por essa loja.
- A credencial inicial é entregue fora do repositório.

## Riscos e perguntas críticas

| Risco ou lacuna | Impacto | Tratamento antes do próximo gate |
| --- | --- | --- |
| O pedido depende de carrinho e WhatsApp. | Mensagem incompleta ou número incorreto pode impedir a revendedora de receber a solicitação. | O número é configurável e testado pela revendedora; a mensagem tem formato definido e o envio fica indisponível sem número válido e confirmado. |
| A quantidade pode mudar enquanto o cliente navega. | O pedido pode solicitar mais unidades do que a revendedora possui no momento do envio. | O carrinho limita a quantidade ao estoque informado, mas o envio não reserva produtos; a revendedora confirma a disponibilidade no atendimento. |
| Não há volume, frequência de atualização ou inventário inicial documentados. | Pode haver decisões de UX e limites de armazenamento inadequados. | Obter dados da primeira revendedora antes de fixar metas ou limites não previstos. |
| Visibilidade e disponibilidade podem ser confundidas no painel. | Produtos podem aparecer ou ser pedidos em estado errado. | Validar a linguagem e os cenários com tarefas concretas na etapa 02. |
| Isolamento multi-tenant é estrutural e difícil de corrigir depois. | Vazamento entre lojas e risco de segurança. | Registrar decisões de autorização nos ADRs antes do modelo de dados e testar cenários negativos. |
| Recuperação assistida pode levar a compartilhamento indevido de credenciais. | Comprometimento da conta ou exposição de segredo. | Definir procedimento de suporte que nunca peça nem registre a senha. |
| Banners e produtos dependem de imagens. | Uploads inválidos ou experiência lenta em rede móvel. | Aceitar JPEG, PNG, WebP, HEIC e HEIF até 10 MB, com normalização automática e erro claro quando o processamento falhar. |
| Exclusão de produto é irreversível. | Perda acidental de conteúdo e necessidade de refazer o cadastro. | Exigir confirmação clara e orientar a administradora a desativar o produto quando quiser preservá-lo. |

## Métricas de descoberta e aceitação inicial

As métricas abaixo são instrumentos de validação; nenhum alvo numérico está
aprovado ainda.

- **Configuração inicial:** capacidade da primeira revendedora, com baixa
  familiaridade tecnológica, de manter o catálogo após uma orientação inicial
  simples, sem depender de intervenção técnica recorrente.
- **Consulta pública:** tempo e taxa de sucesso para encontrar um produto
  visível em um dispositivo móvel.
- **Estado do produto:** taxa de interpretação correta dos cenários de
  visibilidade e disponibilidade durante o teste.
- **Pedido:** taxa de conclusão da seleção, revisão do carrinho e abertura da
  mensagem de WhatsApp sem perder produtos ou quantidades.
- **Acesso:** taxa de conclusão de login, retorno à sessão e recuperação
  assistida sem exposição de credenciais.
- **Isolamento:** zero leituras ou mutações autorizadas entre lojas em cenários
  de teste negativos.
- **Operação:** quantidade e tipo de intervenções do mantenedor necessárias
  para provisionar a primeira loja e resolver bloqueios de acesso.
- **Volume inicial:** validação de um catálogo de até 50 produtos.

## Critérios para sair da etapa 01

Antes de escrever as histórias da etapa 02, o maintainer deve confirmar:

1. Se o problema e os dois públicos descritos representam o primeiro uso real.
2. Qual é o fluxo esperado depois que um cliente encontra um produto e como a
   disponibilidade para pedido participa dele.
3. Se o CRUD de produtos, incluindo visualizar, criar, atualizar, desativar,
   excluir, imagem, descrição e quantidade disponível, cobre a manutenção
   necessária.
4. Quais hipóteses podem ser testadas com a primeira revendedora e quais dados
   ainda precisam ser coletados.
5. Se o escopo candidato e as exclusões estão corretos para o MVP.

## Fontes

- `docs/workflow/checkpoint.md` — decisões de produto e autenticação aprovadas
  até a retomada.
- `docs/workflow/README.md` — etapas do workflow e gates humanos.
- `AGENTS.md` — invariantes do produto e regras de segurança.
- `.specify/memory/constitution.md` — princípios de contrato, acessibilidade,
  isolamento de tenants e evidência antes da conclusão.
