create extension if not exists pgcrypto;

-- Banco inicial do sistema. Este arquivo deve ser executado em um banco vazio.
-- Para alterações futuras, use migrations versionadas.

create table if not exists public.produtos(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  sku text,
  categoria text,
  preco_custo numeric(12,2) not null default 0 check(preco_custo>=0),
  preco_venda numeric(12,2) not null default 0 check(preco_venda>=0),
  estoque_atual integer not null default 0 check(estoque_atual>=0),
  estoque_minimo integer not null default 0 check(estoque_minimo>=0),
  custo_estoque_total numeric(14,2) not null default 0 check(custo_estoque_total>=0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists produtos_user_sku_unique on public.produtos(user_id,lower(sku)) where sku is not null and trim(sku)<>'';
create index if not exists produtos_user_idx on public.produtos(user_id);

create table if not exists public.vendas(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente text not null,
  data date not null default current_date,
  status text not null default 'Pago' check(status in('Pago','Em entrega','Pendente','Cancelada')),
  total numeric(12,2) not null default 0 check(total>=0),
  custo_total numeric(12,2) not null default 0 check(custo_total>=0),
  lucro numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.venda_itens(
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  quantidade integer not null check(quantidade>0),
  preco_unitario numeric(12,2) not null check(preco_unitario>=0),
  custo_unitario numeric(12,2) not null check(custo_unitario>=0),
  total numeric(12,2) not null check(total>=0),
  created_at timestamptz not null default now()
);

create table if not exists public.compras(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fornecedor text not null default 'Fornecedor não informado',
  data date not null default current_date,
  prazo text,
  status text not null default 'Em análise' check(status in('Em análise','Em rota','Recebido','Cancelada')),
  total numeric(12,2) not null default 0 check(total>=0),
  recebida_em timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.compra_itens(
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  quantidade integer not null check(quantidade>0),
  custo_unitario numeric(12,2) not null check(custo_unitario>=0),
  total numeric(12,2) not null check(total>=0),
  created_at timestamptz not null default now()
);

create table if not exists public.movimentacoes_estoque(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  tipo text not null check(tipo in('Entrada','Saída','Ajuste')),
  quantidade integer not null,
  estoque_anterior integer not null,
  estoque_novo integer not null,
  motivo text not null,
  referencia_tipo text,
  referencia_id uuid,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.metas(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null,
  target numeric(12,2) not null default 0 check(target>=0),
  unit text not null default 'R$' check(unit in('R$','%','itens')),
  tipo text not null default 'faturamento' check(tipo in('faturamento','lucro','margem','itens','estoque_baixo')),
  data_inicio date not null default current_date,
  data_fim date not null default current_date,
  created_at timestamptz not null default now(),
  check(data_fim>=data_inicio)
);


-- Torna o schema também recuperável caso alguma tabela já exista sem as colunas novas.
alter table public.produtos add column if not exists custo_estoque_total numeric(14,2) not null default 0;
alter table public.produtos add column if not exists ativo boolean not null default true;
alter table public.produtos add column if not exists updated_at timestamptz not null default now();
alter table public.compras add column if not exists recebida_em timestamptz;
alter table public.metas add column if not exists tipo text not null default 'faturamento';
alter table public.metas add column if not exists data_inicio date not null default current_date;
alter table public.metas add column if not exists data_fim date not null default current_date;

create index if not exists vendas_user_data_idx on public.vendas(user_id,data desc);
create index if not exists compras_user_data_idx on public.compras(user_id,data desc);
create index if not exists movimentos_user_data_idx on public.movimentacoes_estoque(user_id,data desc);
create index if not exists metas_user_idx on public.metas(user_id,data_inicio,data_fim);

alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.compras enable row level security;
alter table public.compra_itens enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.metas enable row level security;

do $$ declare t text; begin
  for t in select unnest(array['produtos','vendas','venda_itens','compras','compra_itens','movimentacoes_estoque','metas']) loop
    execute format('drop policy if exists %I on public.%I',t||'_own_select',t);
    execute format('drop policy if exists %I on public.%I',t||'_own_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_own_update',t);
    execute format('drop policy if exists %I on public.%I',t||'_own_delete',t);
  end loop;
end $$;

create policy produtos_own_select on public.produtos for select using(auth.uid()=user_id);
create policy produtos_own_insert on public.produtos for insert with check(auth.uid()=user_id and estoque_atual=0 and custo_estoque_total=0);
create policy produtos_own_update on public.produtos for update using(auth.uid()=user_id) with check(auth.uid()=user_id);

create policy vendas_own_select on public.vendas for select using(auth.uid()=user_id);
create policy compras_own_select on public.compras for select using(auth.uid()=user_id);
create policy movimentos_own_select on public.movimentacoes_estoque for select using(auth.uid()=user_id);
create policy metas_own_select on public.metas for select using(auth.uid()=user_id);
create policy metas_own_insert on public.metas for insert with check(auth.uid()=user_id);
create policy metas_own_update on public.metas for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy metas_own_delete on public.metas for delete using(auth.uid()=user_id);

create policy venda_itens_own_select on public.venda_itens for select using(exists(select 1 from public.vendas v where v.id=venda_id and v.user_id=auth.uid()));
create policy compra_itens_own_select on public.compra_itens for select using(exists(select 1 from public.compras c where c.id=compra_id and c.user_id=auth.uid()));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists produtos_touch_updated_at on public.produtos;
create trigger produtos_touch_updated_at before update on public.produtos for each row execute function public.touch_updated_at();

create or replace function public.protect_product_stock() returns trigger language plpgsql as $$
begin
  if current_setting('app.stock_operation', true) <> '1' then
    if new.estoque_atual is distinct from old.estoque_atual
       or new.custo_estoque_total is distinct from old.custo_estoque_total
       or new.preco_custo is distinct from old.preco_custo then
      raise exception 'Estoque e custo médio só podem ser alterados por operações de estoque.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists produtos_protect_stock on public.produtos;
create trigger produtos_protect_stock before update on public.produtos for each row execute function public.protect_product_stock();

create or replace function public.assert_product_owner(p_product_id uuid) returns public.produtos language plpgsql security definer set search_path=public as $$
declare p public.produtos;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  select * into p from public.produtos where id=p_product_id and user_id=auth.uid() and ativo=true for update;
  if not found then raise exception 'Produto não encontrado, inativo ou sem permissão.'; end if;
  return p;
end; $$;

create or replace function public.registrar_venda(p_cliente text,p_produto_id uuid,p_quantidade integer,p_preco_unitario numeric,p_data date,p_status text default 'Pago') returns uuid language plpgsql security definer set search_path=public as $$
declare p public.produtos; vid uuid; novo integer; tot numeric; custo numeric; novo_pool numeric;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if trim(coalesce(p_cliente,''))='' then raise exception 'Informe o cliente.'; end if;
  if p_quantidade is null or p_quantidade<=0 then raise exception 'A quantidade deve ser maior que zero.'; end if;
  if p_preco_unitario is null or p_preco_unitario<0 then raise exception 'Preço inválido.'; end if;
  if p_status not in('Pago','Em entrega','Pendente') then raise exception 'Status inválido.'; end if;
  p:=public.assert_product_owner(p_produto_id);
  if p.estoque_atual<p_quantidade then raise exception 'Estoque insuficiente. Disponível: %, solicitado: %.',p.estoque_atual,p_quantidade; end if;
  novo:=p.estoque_atual-p_quantidade;
  tot:=round(p_preco_unitario*p_quantidade,2);
  custo:=round(p.preco_custo*p_quantidade,2);
  novo_pool:=greatest(0,round(p.custo_estoque_total-custo,2));
  insert into public.vendas(user_id,cliente,data,status,total,custo_total,lucro) values(auth.uid(),trim(p_cliente),coalesce(p_data,current_date),p_status,tot,custo,tot-custo) returning id into vid;
  insert into public.venda_itens(venda_id,produto_id,quantidade,preco_unitario,custo_unitario,total) values(vid,p.id,p_quantidade,p_preco_unitario,p.preco_custo,tot);
  perform set_config('app.stock_operation','1',true);
  update public.produtos set estoque_atual=novo,custo_estoque_total=novo_pool,preco_custo=case when novo>0 then round(novo_pool/novo,2) else 0 end where id=p.id;
  insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,referencia_id,data) values(auth.uid(),p.id,'Saída',-p_quantidade,p.estoque_atual,novo,'Venda','venda',vid,coalesce(p_data,current_date));
  return vid;
end; $$;

create or replace function public.cancelar_venda(p_venda_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v public.vendas; i record; p public.produtos; novo integer; novo_pool numeric;
begin
  select * into v from public.vendas where id=p_venda_id and user_id=auth.uid() for update;
  if not found then raise exception 'Venda não encontrada.'; end if;
  if v.status='Cancelada' then return; end if;
  for i in select * from public.venda_itens where venda_id=p_venda_id loop
    p:=public.assert_product_owner(i.produto_id);
    novo:=p.estoque_atual+i.quantidade;
    novo_pool:=round(p.custo_estoque_total+(i.custo_unitario*i.quantidade),2);
    perform set_config('app.stock_operation','1',true);
    update public.produtos set estoque_atual=novo,custo_estoque_total=novo_pool,preco_custo=case when novo>0 then round(novo_pool/novo,2) else 0 end where id=p.id;
    insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,referencia_id) values(auth.uid(),p.id,'Entrada',i.quantidade,p.estoque_atual,novo,'Estorno de venda','venda_cancelada',p_venda_id);
  end loop;
  update public.vendas set status='Cancelada' where id=p_venda_id;
end; $$;

create or replace function public.registrar_compra(p_fornecedor text,p_produto_id uuid,p_quantidade integer,p_custo_unitario numeric,p_data date,p_prazo text,p_status text default 'Em análise') returns uuid language plpgsql security definer set search_path=public as $$
declare p public.produtos; cid uuid; novo integer; tot numeric; novo_pool numeric; novo_custo numeric;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  if p_quantidade is null or p_quantidade<=0 then raise exception 'A quantidade deve ser maior que zero.'; end if;
  if p_custo_unitario is null or p_custo_unitario<0 then raise exception 'Custo inválido.'; end if;
  if p_status not in('Em análise','Em rota','Recebido') then raise exception 'Status inválido.'; end if;
  p:=public.assert_product_owner(p_produto_id);
  tot:=round(p_custo_unitario*p_quantidade,2);
  insert into public.compras(user_id,fornecedor,data,prazo,status,total,recebida_em) values(auth.uid(),coalesce(nullif(trim(p_fornecedor),''),'Fornecedor não informado'),coalesce(p_data,current_date),nullif(trim(coalesce(p_prazo,'')),''),p_status,tot,case when p_status='Recebido' then now() else null end) returning id into cid;
  insert into public.compra_itens(compra_id,produto_id,quantidade,custo_unitario,total) values(cid,p.id,p_quantidade,p_custo_unitario,tot);
  if p_status='Recebido' then
    novo:=p.estoque_atual+p_quantidade;
    novo_pool:=round(p.custo_estoque_total+tot,2);
    novo_custo:=case when novo>0 then round(novo_pool/novo,2) else 0 end;
    perform set_config('app.stock_operation','1',true);
    update public.produtos set estoque_atual=novo,custo_estoque_total=novo_pool,preco_custo=novo_custo where id=p.id;
    insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,referencia_id,data) values(auth.uid(),p.id,'Entrada',p_quantidade,p.estoque_atual,novo,'Compra recebida','compra',cid,coalesce(p_data,current_date));
  end if;
  return cid;
end; $$;

create or replace function public.atualizar_status_compra(p_compra_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare c public.compras; i record; p public.produtos; novo integer; novo_pool numeric;
begin
  select * into c from public.compras where id=p_compra_id and user_id=auth.uid() for update;
  if not found then raise exception 'Compra não encontrada.'; end if;
  if p_status not in('Em análise','Em rota','Recebido','Cancelada') then raise exception 'Status inválido.'; end if;
  if c.status='Cancelada' then raise exception 'Compra já cancelada.'; end if;
  if c.status='Recebido' and p_status not in('Recebido','Cancelada') then raise exception 'Uma compra já recebida só pode permanecer recebida ou ser cancelada.'; end if;
  if c.status<>'Recebido' and p_status='Recebido' then
    for i in select * from public.compra_itens where compra_id=p_compra_id loop
      p:=public.assert_product_owner(i.produto_id); novo:=p.estoque_atual+i.quantidade; novo_pool:=round(p.custo_estoque_total+i.total,2);
      perform set_config('app.stock_operation','1',true);
      update public.produtos set estoque_atual=novo,custo_estoque_total=novo_pool,preco_custo=case when novo>0 then round(novo_pool/novo,2) else 0 end where id=p.id;
      insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,referencia_id,data) values(auth.uid(),p.id,'Entrada',i.quantidade,p.estoque_atual,novo,'Compra recebida','compra',p_compra_id,c.data);
    end loop;
  elsif c.status='Recebido' and p_status='Cancelada' then
    if exists (select 1 from public.movimentacoes_estoque m join public.compra_itens ci on ci.produto_id=m.produto_id where ci.compra_id=p_compra_id and m.created_at>coalesce(c.recebida_em,c.created_at) and not (m.referencia_tipo='compra' and m.referencia_id=p_compra_id)) then
      raise exception 'Não é possível cancelar uma compra recebida depois que o estoque desse produto já foi movimentado. Faça um ajuste de estoque em vez do estorno.';
    end if;
    for i in select * from public.compra_itens where compra_id=p_compra_id loop
      p:=public.assert_product_owner(i.produto_id);
      if p.estoque_atual<i.quantidade then raise exception 'Não é possível cancelar a compra: o estoque atual não comporta o estorno.'; end if;
      novo:=p.estoque_atual-i.quantidade; novo_pool:=round(p.custo_estoque_total-i.total,2);
      if novo_pool<0 then raise exception 'Custo do estoque inconsistente; não foi possível estornar a compra.'; end if;
      perform set_config('app.stock_operation','1',true);
      update public.produtos set estoque_atual=novo,custo_estoque_total=novo_pool,preco_custo=case when novo>0 then round(novo_pool/novo,2) else 0 end where id=p.id;
      insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,referencia_id) values(auth.uid(),p.id,'Saída',-i.quantidade,p.estoque_atual,novo,'Estorno de compra','compra_cancelada',p_compra_id,current_date);
    end loop;
  end if;
  update public.compras set status=p_status,recebida_em=case when p_status='Recebido' and recebida_em is null then now() when p_status='Cancelada' then recebida_em else recebida_em end where id=p_compra_id;
end; $$;

create or replace function public.ajustar_estoque(p_produto_id uuid,p_estoque_novo integer,p_motivo text,p_data date default current_date) returns void language plpgsql security definer set search_path=public as $$
declare p public.produtos; delta integer; novo_pool numeric;
begin
  if p_estoque_novo is null or p_estoque_novo<0 then raise exception 'O estoque não pode ser negativo.'; end if;
  if trim(coalesce(p_motivo,''))='' then raise exception 'Informe o motivo do ajuste.'; end if;
  p:=public.assert_product_owner(p_produto_id); delta:=p_estoque_novo-p.estoque_atual;
  novo_pool:=case when delta>=0 then round(p.custo_estoque_total+(delta*p.preco_custo),2) else round(greatest(0,p.custo_estoque_total+(delta*p.preco_custo)),2) end;
  perform set_config('app.stock_operation','1',true);
  update public.produtos set estoque_atual=p_estoque_novo,custo_estoque_total=novo_pool,preco_custo=case when p_estoque_novo>0 then round(novo_pool/p_estoque_novo,2) else 0 end where id=p.id;
  insert into public.movimentacoes_estoque(user_id,produto_id,tipo,quantidade,estoque_anterior,estoque_novo,motivo,referencia_tipo,data) values(auth.uid(),p.id,'Ajuste',delta,p.estoque_atual,p_estoque_novo,trim(p_motivo),'ajuste',coalesce(p_data,current_date));
end; $$;

-- RPCs são o único caminho de escrita para operações de estoque.
revoke all on function public.assert_product_owner(uuid) from public,anon,authenticated;
revoke all on function public.registrar_venda(text,uuid,integer,numeric,date,text) from public,anon;
revoke all on function public.cancelar_venda(uuid) from public,anon;
revoke all on function public.registrar_compra(text,uuid,integer,numeric,date,text,text) from public,anon;
revoke all on function public.atualizar_status_compra(uuid,text) from public,anon;
revoke all on function public.ajustar_estoque(uuid,integer,text,date) from public,anon;
grant execute on function public.registrar_venda(text,uuid,integer,numeric,date,text) to authenticated;
grant execute on function public.cancelar_venda(uuid) to authenticated;
grant execute on function public.registrar_compra(text,uuid,integer,numeric,date,text,text) to authenticated;
grant execute on function public.atualizar_status_compra(uuid,text) to authenticated;
grant execute on function public.ajustar_estoque(uuid,integer,text,date) to authenticated;

-- Em produtos, impedir exclusão física de registros com histórico; a aplicação usa ativo=false.
drop policy if exists produtos_own_delete on public.produtos;
