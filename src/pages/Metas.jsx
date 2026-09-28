import { useMemo, useState } from 'react'
import { Target, Trophy, TrendingUp, ArrowUpRight, Plus, Trash2, AlertCircle } from 'lucide-react'
import { useProdutos } from '../hooks/useProdutos'
import { useVendas, useMetas } from '../hooks/useOperacoes'
import { supabase } from '../lib/supabase'
import { brl, friendlyError } from '../lib/format'
import { todayInput } from '../lib/date'
import PageHeader from '../components/PageHeader'

const today=todayInput()
const empty={label:'',target:'',tipo:'faturamento',unit:'R$',data_inicio:today,data_fim:today}
const typeMeta={
  faturamento:{label:'Faturamento',unit:'R$',icon:TrendingUp},
  lucro:{label:'Lucro',unit:'R$',icon:Trophy},
  margem:{label:'Margem',unit:'%',icon:Trophy},
  itens:{label:'Itens vendidos',unit:'itens',icon:ArrowUpRight},
  estoque_baixo:{label:'Produtos abaixo do mínimo',unit:'itens',icon:Target},
}

export default function Metas(){
  const {produtos,error:pe}=useProdutos()
  const {data:vendas,error:ve}=useVendas()
  const {data:metas,error:me,reload}=useMetas()
  const [form,setForm]=useState(empty)
  const [actionError,setActionError]=useState('')

  const atual=useMemo(()=>{
    const result={}
    metas.forEach(m=>{
      const a=vendas.filter(v=>v.status!=='Cancelada'&&v.data>=m.data_inicio&&v.data<=m.data_fim)
      const fat=a.reduce((s,v)=>s+Number(v.total||0),0)
      const lucro=a.reduce((s,v)=>s+Number(v.lucro||0),0)
      const itens=a.reduce((s,v)=>(s+(v.venda_itens||[]).reduce((q,i)=>q+Number(i.quantidade||0),0)),0)
      result[m.id]=m.tipo==='faturamento'?fat:m.tipo==='lucro'?lucro:m.tipo==='margem'?(fat?lucro/fat*100:0):m.tipo==='itens'?itens:produtos.filter(p=>p.ativo!==false&&p.estoque_atual<=p.estoque_minimo).length
    })
    return result
  },[metas,vendas,produtos])

  async function save(e){
    e.preventDefault();setActionError('')
    const t=Number(form.target)
    if(!form.label.trim()||!Number.isFinite(t)||t<0)return setActionError('Preencha nome e meta corretamente.')
    if(form.data_fim<form.data_inicio)return setActionError('A data final não pode ser anterior à inicial.')
    const r=await supabase.from('metas').insert({label:form.label.trim(),target:t,unit:form.unit,tipo:form.tipo,data_inicio:form.data_inicio,data_fim:form.data_fim})
    if(r.error)return setActionError(friendlyError(r.error))
    setActionError('');setForm({...empty,data_inicio:today,data_fim:today});reload()
  }
  async function del(id){if(!confirm('Excluir esta meta?'))return;const r=await supabase.from('metas').delete().eq('id',id);if(r.error)setActionError(friendlyError(r.error));else reload()}
  function setType(tipo){setForm(f=>({...f,tipo,unit:typeMeta[tipo].unit}))}

  return <div>
    <PageHeader title="Metas" subtitle="Cada meta possui seu próprio período e é calculada com dados reais."/>
    {(pe||ve||me||actionError)&&<div className="alert error"><AlertCircle size={16}/>{pe||ve||me||actionError}</div>}
    <div className="card form-card"><h3>Adicionar meta</h3><form onSubmit={save} className="inline-form">
      <div className="form-group"><label>Nome *</label><input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Ex.: Faturamento de setembro" required/></div>
      <div className="form-group"><label>Tipo *</label><select value={form.tipo} onChange={e=>setType(e.target.value)}>{Object.entries(typeMeta).map(([v,m])=><option key={v} value={v}>{m.label}</option>)}</select></div>
      <div className="form-group"><label>Meta *</label><input type="number" min="0" step="0.01" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} required/></div>
      <div className="form-group"><label>Unidade</label><input value={form.unit} readOnly/></div>
      <div className="form-group"><label>Data inicial *</label><input type="date" value={form.data_inicio} onChange={e=>setForm({...form,data_inicio:e.target.value})} required/></div>
      <div className="form-group"><label>Data final *</label><input type="date" min={form.data_inicio} value={form.data_fim} onChange={e=>setForm({...form,data_fim:e.target.value})} required/></div>
      <div className="form-actions"><button className="btn primary"><Plus size={16}/>Salvar meta</button></div>
    </form></div>
    <div className="goal-grid">{metas.map(m=>{const a=atual[m.id]||0,pct=m.target?Math.min(100,Math.round(a/Number(m.target)*100)):0,Icon=typeMeta[m.tipo]?.icon||Target;return <div className="goal-card" key={m.id}><div className="goal-head"><div className="stat-icon indigo"><Icon size={20}/></div><div><span>{m.label}</span><strong>{m.unit==='R$'?brl(a):m.unit==='%'?`${a.toFixed(1)}%`:`${a} ${m.unit}`}</strong></div></div><small className="muted">{new Date(`${m.data_inicio}T00:00:00`).toLocaleDateString('pt-BR')} → {new Date(`${m.data_fim}T00:00:00`).toLocaleDateString('pt-BR')}</small><div className="progress-bar"><span style={{width:`${pct}%`}}/></div><div className="goal-meta"><span>{pct}% da meta</span><span>{m.unit==='R$'?brl(m.target):`${m.target}${m.unit==='%'?'%':' '+m.unit}`}</span></div><button className="inline-delete" onClick={()=>del(m.id)}><Trash2 size={14}/>Excluir</button></div>})}</div>
    {!metas.length&&<div className="card pad"><div className="empty-state"><Target size={30}/><h3>Nenhuma meta cadastrada</h3></div></div>}
  </div>
}
