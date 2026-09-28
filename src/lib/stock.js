import { supabase } from './supabase'
export const registrarVenda=(p)=>supabase.rpc('registrar_venda',p)
export const cancelarVenda=(id)=>supabase.rpc('cancelar_venda',{p_venda_id:id})
export const registrarCompra=(p)=>supabase.rpc('registrar_compra',p)
export const atualizarStatusCompra=(id,status)=>supabase.rpc('atualizar_status_compra',{p_compra_id:id,p_status:status})
export const ajustarEstoque=(p)=>supabase.rpc('ajustar_estoque',p)
