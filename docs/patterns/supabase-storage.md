---
title: Supabase Storage
scope: Upload, validação, nomes e acesso a imagens
status: proposed / constrained
applies_to: "upload, leitura, remoção e transformação de arquivos"
source_of_truth: "AGENTS.md; docs/workflow/checkpoint.md"
last_reviewed: 2026-08-22
version_baseline: "@supabase/supabase-js 2.112.3; sharp 0.35.3"
documentation_snapshot: "Context7 /supabase/supabase em 2026-08-22"
related_patterns: [supabase, supabase-postgres, security, frontend-accessibility]
---

# Supabase Storage

## Contract summary

Supabase Storage será usado para imagens de produtos e banners. O produto
aceita JPEG, PNG, WebP, HEIC e HEIF, até 10 MB por arquivo, com normalização
para formato compatível com navegadores.

## Non-negotiable rules

### MUST

- Validar tipo e tamanho na borda e repetir controles no servidor quando o
  arquivo atravessar uma operação privilegiada.
- Associar cada objeto à loja correta por convenção e policy.
- Gerar nomes de objeto a partir de identificadores controlados, não de nomes
  livres fornecidos pelo usuário.
- Normalizar o formato para WebP antes de disponibilizar a imagem ao navegador,
  usando `sharp` em runtime Node.
- Tratar upload, substituição e remoção como operações autorizadas da loja.

### MUST NOT

- Confiar apenas na extensão do arquivo.
- Permitir path arbitrário vindo do cliente.
- Tornar bucket ou objeto público sem decisão aprovada.
- Logar conteúdo sensível ou URLs privadas desnecessariamente.

### SHOULD

- Limitar dimensões e conteúdo quando o processamento for definido.
- Remover ou substituir o objeto anterior sem deixar órfãos, respeitando o
  contrato de retenção.
- Fornecer descrição acessível da imagem na camada de produto.

## Verification checklist

- [ ] Tipos aceitos e rejeitados.
- [ ] Arquivo acima de 10 MB rejeitado.
- [ ] Usuário de uma loja não acessa objeto de outra.
- [ ] Formato normalizado abre em navegadores suportados.
- [ ] Falha no upload não deixa registro inconsistente.

## Unknowns / not approved

- Buckets, visibilidade, policies e convenção final de paths.
- Limites finais de dimensão; `sharp 0.35.3` é a biblioteca aprovada para o
  bootstrap.
- Estratégia de URLs assinadas e cache.

## Sources

- `AGENTS.md`
- `docs/workflow/checkpoint.md`
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## Change log

- `2026-08-22` — criado a partir das restrições de imagem e do SDK proposto.
