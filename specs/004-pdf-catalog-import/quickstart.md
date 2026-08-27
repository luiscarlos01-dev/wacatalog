# Quickstart — Importação de catálogo via PDF

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Loja e administrador de teste já provisionados pelas features 001/002,
  com ao menos um produto existente (para o cenário de duplicidade).
- Arquivos de PDF de teste fora do repositório: um PDF válido com
  produtos (incluindo um SKU que já existe na loja de teste), um PDF sem
  texto extraível (escaneado como imagem), um arquivo corrompido/inválido,
  e um PDF acima do limite de tamanho/páginas.
- Imagens de teste já usadas pela feature 002, para anexar durante a
  revisão.

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # extração, detecção de duplicidade, limites de recurso
pnpm build
pnpm test:e2e           # os três user stories, desktop e mobile
```

## Manual validation script

1. Entrar como administrador A (loja A).
2. Enviar o PDF válido; confirmar pré-visualização com os produtos
   extraídos, e que o item com SKU já existente aparece sinalizado.
3. Corrigir um campo de um item; confirmar que o valor corrigido aparece
   refletido antes de confirmar.
4. Tentar confirmar sem anexar imagem a um item não duplicado; confirmar o
   bloqueio.
5. Anexar imagem a todos os itens não duplicados; confirmar a importação;
   verificar que exatamente esses produtos foram criados, com os valores
   revisados, visibilidade/disponibilidade desligadas por padrão, e que o
   item duplicado não gerou nem criou nem alterou nada.
6. Repetir o envio, chegar até a pré-visualização, e cancelar; confirmar
   que a lista de produtos da loja continua idêntica à do passo 5.
7. Enviar o arquivo corrompido/inválido e o PDF sem texto extraível;
   confirmar mensagens claras em PT-BR nos dois casos, sem alteração no
   catálogo.
8. Enviar o PDF acima do limite; confirmar rejeição clara antes de
   qualquer processamento.
9. Repetir os passos 2 e 5 como administrador B (loja B); confirmar que a
   detecção de duplicidade e a criação nunca cruzam com a loja A.
10. Repetir os passos principais em viewport mobile; confirmar contraste,
    foco visível e navegação por teclado no fluxo de revisão.

## Evidence checklist (Stage 11)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`
      limpos.
- [ ] `pnpm test` cobrindo extração, duplicidade e limites de recurso
      (tamanho, páginas, timeout).
- [ ] `pnpm test:e2e` cobrindo os três user stories, isolamento
      cross-tenant, e os quatro cenários de arquivo inválido/limite.
- [ ] Revisão de segurança (Semgrep) confirmando ausência de execução de
      conteúdo ativo do PDF e ausência de biblioteca de geração de PDF
      (ADR-0008).
- [ ] Verificação de acessibilidade no fluxo de revisão (potencialmente
      vários itens), em mobile.
- [ ] Nenhum PDF ou imagem de teste real commitado; nenhum segredo em
      fixture, log ou commit.
