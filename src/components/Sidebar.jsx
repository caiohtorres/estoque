import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Wallet, Boxes, BarChart3, Target, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

const menu = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Produtos', path: '/produtos', icon: Package },
  { label: 'Compras', path: '/compras', icon: ShoppingCart },
  { label: 'Vendas', path: '/vendas', icon: Wallet },
  { label: 'Estoque', path: '/estoque', icon: Boxes },
  { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
  { label: 'Metas', path: '/metas', icon: Target },
]

export default function Sidebar({ open, onClose }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo"><div className="logo-mark"><Package size={18} /></div><strong>Meu Estoque</strong></div>
      <nav>
        {menu.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={19} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="logout-button" onClick={handleLogout}><LogOut size={19} /> Sair</button>
    </aside>
  )
}
