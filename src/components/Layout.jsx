import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <div className="main-area">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
