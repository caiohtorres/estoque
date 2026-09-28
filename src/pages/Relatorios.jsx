import { useMemo, useState } from 'react'
import { BarChart3, AlertCircle, CalendarDays, Download, TrendingUp, ShoppingCart, ReceiptText } from 'lucide-react'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { useProdutos } from '../hooks/useProdutos'
import { useVendas } from '../hooks/useOperacoes'
import { brl } from '../lib/format'
import PageHeader from '../components/PageHeader'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const colors = ['#4f46e5', '#16a34a', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6']

function toDateInput(date) {
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function startOfWeek(date) {
  const d = new Date(`${date}T00:00:00`)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateInput(d)
}

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateInput(d)
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR')
}

function getPeriodRange(period) {
  const today = toDateInput(new Date())
  if (period === 'hoje') return { start: today, end: today }
  if (period === 'semana') return { start: startOfWeek(today), end: today }
  if (period === 'mes') {
    const d = new Date(`${today}T00:00:00`)
    return { start: toDateInput(new Date(d.getFullYear(), d.getMonth(), 1)), end: today }
  }
  if (period === '30dias') return { start: addDays(today, -29), end: today }
  return { start: today, end: today }
}

export default function Relatorios() {
  const { produtos, error: pe } = useProdutos()
  const { data: vendas, loading: vendasLoading, error: ve } = useVendas()
  const [period, setPeriod] = useState('mes')
  const initial = getPeriodRange('mes')
  const [startDate, setStartDate] = useState(initial.start)
  const [endDate, setEndDate] = useState(initial.end)

  const ativos = useMemo(() => vendas.filter((v) => v.status !== 'Cancelada'), [vendas])

  const vendasPeriodo = useMemo(() => {
    if (startDate > endDate) return []
    return ativos.filter((v) => v.data >= startDate && v.data <= endDate)
  }, [ativos, startDate, endDate])

  const resumo = useMemo(() => {
    const faturamento = vendasPeriodo.reduce((s, v) => s + Number(v.total || 0), 0)
    const lucro = vendasPeriodo.reduce((s, v) => s + Number(v.lucro || 0), 0)
    const custo = vendasPeriodo.reduce((s, v) => s + Number(v.custo_total || 0), 0)
    const pedidos = vendasPeriodo.length
    const itens = vendasPeriodo.reduce((s, v) => s + (v.venda_itens || []).reduce((q, item) => q + Number(item.quantidade || 0), 0), 0)
    const margem = faturamento ? (lucro / faturamento) * 100 : 0
    const ticket = pedidos ? faturamento / pedidos : 0
    return { faturamento, lucro, custo, pedidos, itens, margem, ticket }
  }, [vendasPeriodo])

  const porDia = useMemo(() => {
    const map = new Map()
    vendasPeriodo.forEach((v) => {
      const current = map.get(v.data) || { data: v.data, faturamento: 0, custo: 0, lucro: 0, pedidos: 0 }
      current.faturamento += Number(v.total || 0)
      current.custo += Number(v.custo_total || 0)
      current.lucro += Number(v.lucro || 0)
      current.pedidos += 1
      map.set(v.data, current)
    })
    return [...map.values()].sort((a, b) => b.data.localeCompare(a.data))
  }, [vendasPeriodo])

  const categorias = useMemo(() => {
    const byCategory = {}
    vendasPeriodo.forEach((v) => {
      ;(v.venda_itens || []).forEach((item) => {
        const key = item.produtos?.categoria || 'Sem categoria'
        byCategory[key] = (byCategory[key] || 0) + Number(item.total || 0)
      })
    })
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  }, [vendasPeriodo])

  const estoqueResumo = useMemo(() => ({
    custo: produtos.reduce((s, p) => s + Number(p.estoque_atual || 0) * Number(p.preco_custo || 0), 0),
    potencial: produtos.reduce((s, p) => s + Number(p.estoque_atual || 0) * Number(p.preco_venda || 0), 0),
  }), [produtos])

  const chartByDay = {
    labels: [...porDia].reverse().map((x) => formatDate(x.data)),
    datasets: [
      { label: 'Faturamento', data: [...porDia].reverse().map((x) => x.faturamento), backgroundColor: '#4f46e5', borderRadius: 6 },
      { label: 'Lucro', data: [...porDia].reverse().map((x) => x.lucro), backgroundColor: '#16a34a', borderRadius: 6 },
    ],
  }

  const categoryChart = {
    labels: categorias.map(([label]) => label),
    datasets: [{ data: categorias.map(([, value]) => value), backgroundColor: colors }],
  }

  function applyPreset(value) {
    setPeriod(value)
    if (value !== 'custom') {
      const range = getPeriodRange(value)
      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  function exportCsv() {
    const rows = [
      ['Relatório de lucro', `${formatDate(startDate)} a ${formatDate(endDate)}`],
      [],
      ['Data', 'Pedidos', 'Faturamento', 'Custo', 'Lucro', 'Margem %'],
      ...porDia.map((row) => [row.data, row.pedidos, row.faturamento.toFixed(2), row.custo.toFixed(2), row.lucro.toFixed(2), row.faturamento ? ((row.lucro / row.faturamento) * 100).toFixed(2) : '0.00']),
      [],
      ['TOTAL', resumo.pedidos, resumo.faturamento.toFixed(2), resumo.custo.toFixed(2), resumo.lucro.toFixed(2), resumo.margem.toFixed(2)],
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-lucro-${startDate}-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = vendasLoading
  const error = pe || ve

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Acompanhe faturamento, custo e lucro por período.">
        <button type="button" className="btn primary" onClick={exportCsv} disabled={loading}><Download size={16} /> Exportar CSV</button>
      </PageHeader>

      {error && <div className="alert error"><AlertCircle size={16} /> {error}</div>}

      <div className="card pad report-filters">
        <div className="report-filter-title"><CalendarDays size={18} /><div><strong>Período do relatório</strong><span>Escolha um período pronto ou informe as datas.</span></div></div>
        <div className="period-buttons">
          <button type="button" className={`btn ${period === 'hoje' ? 'primary' : 'secondary'}`} onClick={() => applyPreset('hoje')}>Hoje</button>
          <button type="button" className={`btn ${period === 'semana' ? 'primary' : 'secondary'}`} onClick={() => applyPreset('semana')}>Esta semana</button>
          <button type="button" className={`btn ${period === 'mes' ? 'primary' : 'secondary'}`} onClick={() => applyPreset('mes')}>Este mês</button>
          <button type="button" className={`btn ${period === '30dias' ? 'primary' : 'secondary'}`} onClick={() => applyPreset('30dias')}>Últimos 30 dias</button>
          <button type="button" className={`btn ${period === 'custom' ? 'primary' : 'secondary'}`} onClick={() => setPeriod('custom')}>Personalizado</button>
        </div>
        <div className="date-range">
          <div className="form-group"><label>Data inicial</label><input type="date" value={startDate} max={endDate} onChange={(e) => { setStartDate(e.target.value); setPeriod('custom') }} /></div>
          <div className="form-group"><label>Data final</label><input type="date" value={endDate} min={startDate} onChange={(e) => { setEndDate(e.target.value); setPeriod('custom') }} /></div>
          <div className="period-current">{formatDate(startDate)} → {formatDate(endDate)}</div>
        </div>
      </div>

      <div className="stats-grid report-stats">
        <div className="stat-card"><div className="stat-icon indigo"><ReceiptText size={22} /></div><div><span>Faturamento</span><strong>{loading ? '…' : brl(resumo.faturamento)}</strong></div></div>
        <div className="stat-card"><div className="stat-icon green"><TrendingUp size={22} /></div><div><span>Lucro</span><strong>{loading ? '…' : brl(resumo.lucro)}</strong></div></div>
        <div className="stat-card"><div className="stat-icon amber"><ShoppingCart size={22} /></div><div><span>Custo das vendas</span><strong>{loading ? '…' : brl(resumo.custo)}</strong></div></div>
        <div className="stat-card"><div className="stat-icon red"><BarChart3 size={22} /></div><div><span>Margem</span><strong>{loading ? '…' : `${resumo.margem.toFixed(1)}%`}</strong></div></div>
      </div>

      <div className="card pad period-summary">
        <div><span>Pedidos</span><strong>{resumo.pedidos}</strong></div>
        <div><span>Itens vendidos</span><strong>{resumo.itens}</strong></div>
        <div><span>Ticket médio</span><strong>{brl(resumo.ticket)}</strong></div>
        <div><span>Lucro por item</span><strong>{resumo.itens ? brl(resumo.lucro / resumo.itens) : brl(0)}</strong></div>
      </div>

      <div className="card pad">
        <h3>Lucro por dia</h3>
        <div className="chart-wrap">
          {porDia.length ? <Bar data={chartByDay} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: (value) => brl(value) } } } }} /> : <div className="empty-state"><p>Nenhuma venda no período selecionado.</p></div>}
        </div>
      </div>

      <div className="chart-grid">
        <div className="card pad"><h3>Faturamento por categoria</h3><div className="chart-wrap">{categorias.length ? <Doughnut data={categoryChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /> : <div className="empty-state"><p>Sem vendas por categoria no período.</p></div>}</div></div>
        <div className="card pad"><h3>Resumo diário</h3><div className="table-wrap"><table className="table"><thead><tr><th>Data</th><th className="num">Pedidos</th><th className="num">Faturamento</th><th className="num">Lucro</th></tr></thead><tbody>{porDia.map((row) => <tr key={row.data}><td data-label="Data">{formatDate(row.data)}</td><td data-label="Pedidos" className="num">{row.pedidos}</td><td data-label="Faturamento" className="num">{brl(row.faturamento)}</td><td data-label="Lucro" className="num"><strong>{brl(row.lucro)}</strong></td></tr>)}{!porDia.length && <tr><td colSpan="4"><div className="empty-state">Sem dados.</div></td></tr>}</tbody></table></div></div>
      </div>

      <div className="card pad stock-report"><h3>Posição atual do estoque</h3><div className="period-summary"><div><span>Custo do estoque</span><strong>{brl(estoqueResumo.custo)}</strong></div><div><span>Valor de venda potencial</span><strong>{brl(estoqueResumo.potencial)}</strong></div></div></div>
    </div>
  )
}
