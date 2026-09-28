import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Header({ onMenu }) {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''))
  }, [])

  return (
    <header className="top-header">
      <button className="mobile-menu" type="button" aria-label="Abrir menu" onClick={onMenu}><Menu size={22} /></button>
      <div className="header-text">
        <h2>Olá! 👋</h2>
        <span>Controle seu estoque e suas vendas.</span>
      </div>
      {email && (
        <div className="user-chip" title={email}>
          <div className="avatar">{email[0].toUpperCase()}</div>
          <span>{email}</span>
        </div>
      )}
    </header>
  )
}
