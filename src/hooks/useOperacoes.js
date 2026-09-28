import { useCallback,useEffect,useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/format'
function useTable(table,select){const[data,setData]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');const reload=useCallback(async()=>{setLoading(true);let q=supabase.from(table).select(select);if(['vendas','compras','movimentacoes_estoque'].includes(table))q=q.order('data',{ascending:false});q=q.order('created_at',{ascending:false});const r=await q;if(r.error)setError(friendlyError(r.error));else{setError('');setData(r.data||[])}setLoading(false)},[table,select]);useEffect(()=>{reload()},[reload]);return{[table]:data,data,loading,error,reload}}
export function useVendas(){return useTable('vendas','*, venda_itens(*, produtos(nome, sku, categoria, ativo))')}
export function useCompras(){return useTable('compras','*, compra_itens(*, produtos(nome, sku, categoria, ativo))')}
export function useMovimentacoes(){return useTable('movimentacoes_estoque','*, produtos(nome, sku)')}
export function useMetas(){return useTable('metas','*')}
