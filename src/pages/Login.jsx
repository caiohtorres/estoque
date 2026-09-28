import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setChecking(false)
    })
  }, [])

  if (checking) return <div className="loading-screen">Carregando...</div>
  if (hasSession) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        const m = err.message || ''
        if (m.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar (veja sua caixa de entrada).')
        else if (m.includes('Failed to fetch')) setError('Não foi possível conectar ao Supabase. Confira o arquivo .env.')
        else setError('E-mail ou senha incorretos.')
      } else {
        navigate('/', { replace: true })
      }
    } else {
      if (password.length < 6) {
        setLoading(false)
        return setError('A senha precisa ter pelo menos 6 caracteres.')
      }
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else if (data.session) navigate('/', { replace: true })
      else setInfo('Conta criada! Confirme seu e-mail para poder entrar.')
    }
    setLoading(false)
  }

  const isLogin = mode === 'login'

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><Package size={28} /></div>
        <h1>Meu Estoque</h1>
        <p className="login-subtitle">{isLogin ? 'Entre para acessar seu painel' : 'Crie sua conta para começar'}</p>

        {!isSupabaseConfigured && (
          <div className="alert error"><AlertCircle size={16} /> Supabase não configurado. Copie .env.example para .env e preencha a URL e a chave.</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </div>

          {error && <div className="alert error"><AlertCircle size={16} /> {error}</div>}
          {info && <div className="alert success"><CheckCircle2 size={16} /> {info}</div>}

          <button type="submit" className="btn primary block" disabled={loading}>
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button type="button" className="link-btn" onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(''); setInfo('') }}>
          {isLogin ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
