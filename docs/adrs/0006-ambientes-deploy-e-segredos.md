# ADR-0006 — Ambientes, deploy e gestão de segredos

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** execução da aplicação e configuração operacional do MVP

## Contexto

O Wacatalog será hospedado na Vercel e usará Supabase para Auth, Postgres e
Storage. O produto precisa permitir validação em previews sem misturar dados de
teste com a loja real, além de manter chaves privilegiadas fora do repositório
e do navegador.

## Decisão

1. A Vercel será a plataforma de hospedagem da aplicação Next.js.
2. O fluxo terá três ambientes operacionais: local, preview e produção.
3. Local e preview usarão um projeto Supabase não produtivo; produção usará um
   projeto Supabase separado. Dados reais da primeira loja não serão usados em
   previews ou fixtures.
4. Deploys de preview poderão validar alterações antes da produção. Produção
   será promovida somente após as verificações previstas no workflow e
   autorização explícita do mantenedor.
5. Configurações serão fornecidas por variáveis de ambiente da Vercel ou pelo
   ambiente local protegido. Nenhum segredo será salvo em código, documentação,
   fixtures, logs ou prompts.
6. A URL e a chave publicável do Supabase poderão ser usadas no cliente quando
   necessário. A chave secreta administrativa, incluindo `service_role`, será
   configurada somente em ambientes server-only e nunca será exposta ao
   navegador.
7. Migrações de banco e mudanças de Storage serão executadas de forma
   controlada no ambiente correspondente. Não haverá migração automática para
   produção sem revisão e autorização do mantenedor.
8. Logs e mensagens de erro não deverão conter senhas, tokens, chaves,
   credenciais, dados de recuperação ou PII desnecessária.

## Consequências

### Positivas

- Previews podem ser testadas sem risco de alterar dados reais da loja.
- A separação de projetos reduz o impacto de erros em migrações e seeds.
- A configuração por ambiente mantém segredos fora do código e permite
  diferentes URLs, chaves e limites operacionais.
- O fluxo de promoção preserva os gates humanos do projeto.

### Negativas e riscos

- Dois projetos Supabase exigem configuração e manutenção adicionais.
- Seeds, migrações e configurações podem divergir se não houver verificação
  explícita entre ambientes.
- A operação de produção dependerá de disciplina para não copiar dados reais
  para previews ou registrar segredos em ferramentas de diagnóstico.

## Regras derivadas para os documentos seguintes

- O PRD não deve prometer disponibilidade, backup ou observabilidade que ainda
  não tenham decisão operacional própria.
- O plano de implementação deve documentar variáveis necessárias por ambiente,
  sem registrar seus valores secretos.
- O contrato de deploy deve exigir build, testes, análise de segurança e QA
  proporcional antes da promoção para produção.
- A documentação operacional deve descrever recuperação de acesso sem pedir ou
  expor credenciais.

## Alternativas consideradas

- **Um único projeto Supabase para todos os ambientes:** rejeitado por misturar
  dados e aumentar o risco de preview atingir produção.
- **Segredos em arquivos `.env` versionados:** rejeitado por risco de exposição.
- **Deploy direto em produção a cada alteração:** rejeitado porque elimina
  validação por preview e o gate operacional.
- **Hospedar fora da Vercel:** rejeitado porque Vercel é a plataforma aprovada
  para o MVP.

## Fontes

- `AGENTS.md` — Vercel, segredos, deploy e gates operacionais.
- `docs/workflow/quality-gates.md` — verificações antes de declarar conclusão.
- `docs/adrs/0001-autenticacao-com-supabase-auth.md` — fronteira de segredos de
  autenticação.
- `docs/adrs/0002-isolamento-multi-tenant-e-autorizacao.md` — uso controlado da
  chave administrativa.
