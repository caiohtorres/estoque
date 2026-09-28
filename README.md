# Meu Estoque

Sistema de estoque em React + Vite + Supabase. Compras, vendas, ajustes, movimentações, metas e relatórios usam o mesmo banco e as operações de estoque são transacionais.

## Desenvolvimento

1. Instale Node.js 20+.
2. Crie um arquivo `.env` na raiz a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

3. No Supabase, use um banco de aplicação novo/vazio e execute **todo** `supabase/schema.sql` no SQL Editor.
4. No projeto:

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Fluxo de estoque

- Produto novo começa com estoque zero.
- Compra em análise/em rota não altera o estoque.
- Compra recebida adiciona unidades e recalcula o custo médio ponderado.
- Venda reduz o estoque e registra o custo médio vigente no item vendido.
- Cancelamento de venda devolve unidades e o respectivo custo ao estoque.
- Ajuste define o saldo físico final e registra a diferença.
- Compra recebida só pode ser estornada se o estoque daquele produto não tiver sofrido movimentações posteriores; isso evita distorcer o custo médio.
- Produtos com histórico não são apagados: são desativados. Produtos inativos não aparecem em novas compras/vendas.
- Alterações diretas de estoque/custo pelo cliente são bloqueadas no banco; somente as RPCs de operação podem fazê-las.

## Relatórios e metas

Relatórios permitem hoje, semana, mês, últimos 30 dias e período personalizado. O lucro é `faturamento - custo das vendas`.

Metas possuem tipo e período próprios: faturamento, lucro, margem, itens vendidos ou produtos abaixo do estoque mínimo.

## Segurança

- RLS por `auth.uid()`.
- Itens de vendas/compras são somente leitura pelo cliente; gravação acontece pelas operações transacionais.
- RPCs críticas só são executáveis por usuários autenticados.
- `.env` não deve ser versionado.

## Produção

Antes do primeiro deploy, configure no Supabase Auth as URLs de produção e recuperação de senha. No host, cadastre as mesmas variáveis do `.env` como variáveis de ambiente.
