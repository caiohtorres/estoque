export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Traduz erros do Supabase para mensagens que o usuário entende.
export function friendlyError(err) {
  if (!err) return ''
  const code = err.code
  const msg = err.message || ''
  if (code === '42P01' || msg.includes('schema cache'))
    return 'A tabela "produtos" não existe no Supabase. Rode o arquivo supabase/schema.sql no SQL Editor.'
  if (code === '42501' || msg.toLowerCase().includes('row-level security'))
    return 'Sem permissão para salvar. Verifique se você está logado e se as políticas (RLS) do schema.sql foram criadas.'
  if (code === '23505') return 'Já existe um produto com esse código (SKU).'
  if (code === '23502') return 'Preencha todos os campos obrigatórios.'
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
    return 'Não foi possível conectar ao Supabase. Confira VITE_SUPABASE_URL e a chave no arquivo .env.'
  if (msg.toLowerCase().includes('invalid api key'))
    return 'Chave do Supabase inválida. Confira VITE_SUPABASE_PUBLISHABLE_KEY no .env.'
  return msg || 'Ocorreu um erro inesperado.'
}
