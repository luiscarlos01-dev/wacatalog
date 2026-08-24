# ADR-0003 — Storage e imagens do catálogo

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** imagens de produtos e banners do MVP

## Contexto

As imagens serão enviadas principalmente por celulares. O MVP precisa aceitar
arquivos comuns de câmera, inclusive HEIC/HEIF, sem exigir conversão manual da
revendedora. Depois do upload, as imagens precisam ser compatíveis com os
navegadores e adequadas para uma experiência móvel.

Produtos e banners publicados são conteúdo público do catálogo. As operações
de criação, substituição e remoção, porém, continuam pertencendo à loja e
devem respeitar a autorização multi-tenant.

## Decisão

1. O Supabase Storage será usado para armazenar imagens de produtos e banners.
2. O upload aceitará JPEG, PNG, WebP, HEIC e HEIF, com limite de 10 MB por
   arquivo original.
3. O sistema normalizará os arquivos aceitos para um formato compatível com
   navegadores antes de apresentá-los no catálogo. O arquivo normalizado será a
   versão usada pelo produto; a retenção do original não é necessária no MVP.
4. Os assets serão organizados por loja e entidade, usando caminhos gerados
   pelo sistema que não dependam do nome original enviado pela revendedora.
5. A leitura dos assets publicados será pública, pois as imagens fazem parte do
   catálogo público. A visibilidade do produto ou o estado ativo do banner
   controlará a listagem no catálogo; a existência de uma URL pública conhecida
   não será tratada como dado privado.
6. Upload, substituição e remoção exigirão autenticação e associação da
   administradora à loja proprietária. O cliente não poderá escolher livremente
   o caminho ou a loja do asset.
7. A substituição de uma imagem deverá persistir a nova versão antes de remover
   a anterior. A exclusão definitiva do produto ou banner deverá remover o
   asset associado quando isso for seguro.
8. A aplicação exibirá erro claro quando o arquivo exceder o limite, tiver
   formato não aceito ou não puder ser normalizado. A falha não deverá deixar o
   cadastro apontando para uma imagem inexistente.

## Consequências

### Positivas

- A revendedora pode enviar fotos diretamente do celular, inclusive em HEIC ou
  HEIF.
- O catálogo recebe arquivos compatíveis com navegadores sem expor o fluxo de
  conversão para a usuária.
- Leitura pública simplifica o carregamento de imagens no catálogo móvel.
- Os caminhos gerados e as operações de escrita escopadas reduzem colisões e
  alterações entre lojas.

### Negativas e riscos

- Uma imagem publicada pode continuar acessível por sua URL direta mesmo depois
  de deixar de aparecer no catálogo, até ser removida ou sair de caches. Isso é
  aceitável para imagens comerciais públicas, mas não serve para dados
  sensíveis.
- Normalização de HEIC/HEIF exige processamento adicional e deve falhar de modo
  recuperável em arquivos corrompidos ou incomuns.
- O limite de 10 MB controla o upload original, mas não elimina a necessidade
  de redimensionamento e compressão para redes móveis.

## Regras derivadas para os documentos seguintes

- O modelo de dados deve guardar a referência do asset junto da entidade e da
  loja proprietária.
- O contrato deve distinguir erro de arquivo inválido, erro de processamento e
  falha de persistência.
- O plano de implementação deve validar MIME e conteúdo real do arquivo, não
  apenas a extensão informada pelo navegador.
- Testes devem cobrir upload válido, HEIC/HEIF, limite de tamanho, arquivo
  inválido, substituição, remoção e tentativa de escrita em outra loja.
- O PRD deve explicar em PT-BR que imagens públicas podem deixar de aparecer
  no catálogo sem serem imediatamente inacessíveis por uma URL já conhecida.

## Alternativas consideradas

- **Bucket privado com URLs assinadas:** rejeitado para o MVP por adicionar
  expiração, renovação e complexidade ao carregamento do catálogo público.
  Pode ser reavaliado se imagens privadas forem necessárias.
- **Aceitar somente JPEG/PNG/WebP:** rejeitado porque cria atrito para fotos
  HEIC/HEIF vindas de celulares.
- **Manter o arquivo original como única versão:** rejeitado porque não
  garante exibição consistente nem desempenho adequado em dispositivos móveis.
- **Armazenar imagens no banco de dados:** rejeitado por custo e inadequação
  para assets binários.

## Fontes

- `AGENTS.md` — uso de Supabase Storage, escopo por loja e requisitos de
  segurança.
- `docs/workflow/checkpoint.md` — formatos, limite e normalização aprovados na
  etapa 03.
- `docs/workflow/stories-produto.md` — H6 e H8.
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
