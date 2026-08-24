# ADR-0002 — Isolamento multi-tenant e autorização por loja

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** dados, Storage e operações administrativas do MVP

## Contexto

O Wacatalog será validado com uma primeira revendedora, mas precisa nascer
multi-tenant. O limite de confiança é a loja: uma administradora pode operar
os dados da sua loja, mas não pode consultar ou alterar dados de outra loja.

O catálogo público também precisa identificar uma loja sem transformar o
identificador da URL em prova de autorização. A chave administrativa do
Supabase pode ignorar políticas de segurança e, portanto, não pode ser usada
como atalho em operações iniciadas pela administradora.

## Decisão

1. A loja será a unidade de tenancy do sistema. Todo registro pertencente a uma
   loja terá uma referência obrigatória à loja, direta ou por uma relação
   explicitamente definida no modelo de dados.
2. A autorização administrativa será baseada em uma relação de associação entre
   usuário autenticado e loja. O MVP terá o papel de administradora da loja;
   papéis adicionais ficam fora deste ADR.
3. As políticas de Row Level Security (RLS) do Postgres serão a barreira
   principal para tabelas tenant-owned. Cada política administrativa deverá
   verificar a associação do usuário autenticado à mesma loja do registro e
   cobrir leitura, criação, atualização e exclusão conforme a operação
   permitida. Leituras públicas terão políticas separadas e retornarão somente
   conteúdo publicado.
4. O Storage seguirá a mesma fronteira para operações administrativas: assets
   de produtos e banners serão organizados por loja e suas políticas verificarão
   a associação antes de permitir upload, atualização ou remoção. A leitura de
   assets publicados será uma exceção pública, pois clientes não fazem login e
   precisam visualizar as imagens do catálogo.
5. O catálogo público poderá ler somente dados publicados da loja solicitada:
   produtos ativos e visíveis, banners ativos e demais campos públicos. O
   identificador público da loja não concede acesso administrativo nem leitura
   de dados não publicados.
6. A aplicação fará verificações complementares antes de executar operações,
   mas nenhuma checagem apenas no cliente ou na URL substituirá as políticas do
   banco e do Storage.
7. A chave secreta administrativa será usada somente em operações confiáveis do
   mantenedor, como provisionamento, e nunca em uma operação cuja autorização
   dependa da administradora autenticada. O código server-only deverá resolver
   explicitamente a loja alvo antes de qualquer operação privilegiada.
8. Identificadores de outra loja não deverão permitir enumeração de dados. A
   aplicação retornará uma resposta que não revele a existência ou o conteúdo
   de registros fora do escopo autorizado.

## Consequências

### Positivas

- O isolamento é aplicado no banco e no Storage para operações administrativas,
  reduzindo a dependência de disciplina em cada tela ou endpoint.
- A estrutura suporta novas lojas sem criar um caminho especial para a primeira
  revendedora.
- A URL pública pode ser compartilhada sem conceder privilégios
  administrativos.
- A associação usuário-loja deixa espaço para papéis futuros sem colocar um
  tenant fixo em código de frontend.

### Negativas e riscos

- Todas as tabelas, políticas e consultas precisarão carregar e respeitar a
  loja; omitir a associação será erro de segurança, não apenas de filtragem.
- Políticas RLS que consultam associações exigem testes negativos entre lojas e
  atenção a recursão ou privilégios excessivos nas funções auxiliares.
- Operações administrativas com chave secreta exigem revisão server-only e não
  podem ser testadas com credenciais reais em fixtures ou logs.

## Regras derivadas para os documentos seguintes

- O modelo de dados deve definir lojas, associações de usuários e referências
  tenant-owned, incluindo unicidade de SKU dentro da loja.
- O modelo de Storage deve definir caminhos e políticas escopados por loja.
- O PRD e o contrato de API devem tratar a loja como escopo explícito das
  operações administrativas.
- Os testes devem cobrir leitura, criação, atualização, exclusão e Storage
  entre duas lojas, garantindo negação sem vazamento de dados.
- O plano de implementação deve separar operações públicas, operações da
  administradora e operações privilegiadas do mantenedor.

## Alternativas consideradas

- **Filtrar somente na aplicação:** rejeitado; um erro em endpoint ou consulta
  poderia expor dados entre lojas.
- **Usar apenas o `user_id` em cada registro:** rejeitado como fronteira
  principal; o requisito é autorização por loja e a fundação precisa permitir
  associação futura de usuários a lojas.
- **Confiar no tenant vindo da URL ou do frontend:** rejeitado; entrada do
  cliente não é prova de autorização.
- **Usar a chave secreta em todas as operações server-side:** rejeitado; ela
  ignora RLS e ampliaria o impacto de um erro de autorização.

## Fontes

- `AGENTS.md` — invariantes de multi-tenancy e segurança.
- `docs/workflow/checkpoint.md` — decisão de fundação multi-tenant.
- `docs/workflow/stories-produto.md` — H9 e H10.
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
