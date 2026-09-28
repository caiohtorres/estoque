import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/format'

export function useProdutos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('produtos').select('*').order('nome', { ascending: true })
    if (err) setError(friendlyError(err))
    else { setError(''); setProdutos(data || []) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { produtos, loading, error, reload: load }
}
