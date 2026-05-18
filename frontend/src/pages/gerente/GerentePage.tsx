import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/useAuth'
import { useSignalR } from '../../hooks/useSignalR'
import { formatCurrencyBRL } from '../../utils/currency'
import type { ResumoVendasResponse, PedidoResumo, ComandaResumo } from '../../api/types'

type Aba = 'relatorios' | 'comandas'

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0]
}

function formatUpdatedAt(timestamp: number | null, now = Date.now()) {
  if (!timestamp) return 'Ainda nao atualizado'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 5) return 'Atualizado agora'
  if (seconds < 60) return `Atualizado ha ${seconds}s`
  return `Atualizado ha ${Math.floor(seconds / 60)}min`
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function KpiCard({ label, value, sub, subColor, icon }: {
  label: string
  value: string
  sub?: string
  subColor?: string
  icon: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative p-8 rounded-xl flex flex-col gap-2 overflow-hidden transition-colors duration-300 cursor-default"
      style={{
        background: hovered ? '#b90014' : '#ffffff',
        boxShadow: '0 24px 32px rgba(185,0,20,0.04)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: hovered ? 'rgba(255,255,255,0.7)' : '#926e6b' }}>
        {label}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-black tracking-tighter"
          style={{ color: hovered ? '#ffffff' : '#191c20' }}>
          {value}
        </span>
        {sub && (
          <span className="font-bold text-sm"
            style={{ color: hovered ? 'rgba(255,255,255,0.8)' : (subColor ?? '#428057') }}>
            {sub}
          </span>
        )}
      </div>
      <span className="material-symbols-outlined absolute top-4 right-4 transition-opacity"
        style={{
          fontSize: '2.5rem',
          color: hovered ? 'rgba(255,255,255,0.4)' : '#b90014',
          opacity: hovered ? 0.4 : 0.1,
        }}>
        {icon}
      </span>
    </div>
  )
}

export function GerentePage() {
  const { logout } = useAuth()
  const [aba, setAba] = useState<Aba>('relatorios')
  const [resumo, setResumo] = useState<ResumoVendasResponse | null>(null)
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([])
  const [comandas, setComandas] = useState<ComandaResumo[]>([])
  const [de, setDe] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  const [ate, setAte] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(Date.now())
  const [buscaComanda, setBuscaComanda] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [r, p, c] = await Promise.all([
        api.get<ResumoVendasResponse>(`/relatorios/resumo?de=${de}&ate=${ate}`),
        api.get<PedidoResumo[]>(`/relatorios/pedidos?status=Fechado&de=${de}&ate=${ate}`),
        api.get<ComandaResumo[]>(`/relatorios/comandas?de=${de}&ate=${ate}`),
      ])
      setResumo(r.data)
      setPedidos(p.data)
      setComandas(c.data)
      const timestamp = Date.now()
      setAtualizadoEm(timestamp)
      setAgora(timestamp)
    } finally {
      setLoading(false)
    }
  }, [ate, de])

  useEffect(() => { void Promise.resolve().then(carregar) }, [carregar])
  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 10000)
    return () => window.clearInterval(timer)
  }, [])
  useSignalR({ onPedidoFechado: () => carregar() })

  const inputStyle: React.CSSProperties = {
    background: '#ffffff',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0 1rem',
    height: '3rem',
    fontSize: '0.875rem',
    color: '#191c20',
    outline: 'none',
    width: '100%',
    fontWeight: 500,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const ticketMedio = resumo && resumo.totalPedidos > 0
    ? resumo.totalFaturado / resumo.totalPedidos
    : 0
  const itemLider = resumo?.itensMaisVendidos[0]
  const periodoLabel = `${new Date(`${de}T00:00:00`).toLocaleDateString('pt-BR')} - ${new Date(`${ate}T00:00:00`).toLocaleDateString('pt-BR')}`
  const termoComanda = normalizeSearch(buscaComanda)
  const comandasFiltradas = comandas.filter(c => {
    if (!termoComanda) return true
    const mesa = String(c.mesaNumero)
    const mesaComZero = mesa.padStart(2, '0')
    const termoMesa = termoComanda.replace(/^0+(?=\d)/, '')
    return normalizeSearch(c.nome).includes(termoComanda)
      || mesa.includes(termoMesa)
      || mesaComZero.includes(termoComanda)
      || String(c.id).includes(termoComanda)
  })

  const setPeriodoRapido = (dias: number) => {
    const fim = new Date()
    const inicio = new Date()
    inicio.setDate(fim.getDate() - (dias - 1))
    setDe(formatDateInput(inicio))
    setAte(formatDateInput(fim))
  }

  const exportarCsv = (tipo: 'pedidos' | 'comandas') => {
    const rows = tipo === 'pedidos'
      ? [
          ['Pedido', 'Mesa', 'Criado em', 'Itens', 'Total'],
          ...pedidos.map(p => [
            p.id,
            p.mesaNumero,
            new Date(p.criadoEm).toLocaleString('pt-BR'),
            p.numeroItens,
            (p.totalFinal ?? 0).toFixed(2).replace('.', ','),
          ]),
        ]
      : [
          ['Comanda', 'Mesa', 'Nome', 'Criada em', 'Total'],
          ...comandasFiltradas.map(c => [
            c.id,
            c.mesaNumero,
            c.nome,
            new Date(c.criadaEm).toLocaleString('pt-BR'),
            (c.totalFinal ?? 0).toFixed(2).replace('.', ','),
          ]),
        ]
    const csv = rows.map(row => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gerente-${tipo}-${de}-${ate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const navItem = (id: Aba, icon: string, label: string) => {
    const active = aba === id
    return (
      <button
        onClick={() => setAba(id)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors"
        style={{
          background: active ? '#ffffff' : 'transparent',
          color: active ? '#b90014' : '#5d3f3c',
          boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
          {icon}
        </span>
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className="h-screen flex" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col p-4 gap-2 h-screen sticky top-0 w-64 flex-shrink-0" style={{ background: '#f2f3f9' }}>
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: '#b90014' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>restaurant</span>
          </div>
          <div>
            <h1 className="text-base font-black leading-tight" style={{ color: '#191c20' }}>Restaurante Digital</h1>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#926e6b' }}>Gerente</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItem('relatorios', 'analytics', 'Relatórios')}
          {navItem('comandas', 'receipt_long', 'Comandas')}
        </nav>

        <div className="pt-4 space-y-1" style={{ borderTop: '1px solid #e6e8ee' }}>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ color: '#5d3f3c' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 md:px-10 py-8 md:py-10">
        <div className={`max-w-5xl mx-auto w-full ${aba === 'comandas' ? 'flex-1 flex flex-col min-h-0' : ''}`}>

          {/* Page header */}
          <header className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: '#191c20' }}>
                {aba === 'relatorios' ? 'Analytics & Reports' : 'Histórico de Comandas'}
              </h2>
              <p className="font-medium mt-1" style={{ color: '#926e6b' }}>
                {aba === 'relatorios' ? 'Desempenho operacional da unidade.' : 'Comandas fechadas no período selecionado.'}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: loading ? '#b90014' : '#926e6b' }}>
                {loading ? 'Atualizando dados...' : formatUpdatedAt(atualizadoEm, agora)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={carregar} disabled={loading}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '1rem' }}>refresh</span>
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            <button onClick={logout} className="md:hidden flex items-center gap-1 text-sm font-medium"
              style={{ color: '#5d3f3c' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            </button>
            </div>
          </header>

          {/* Mobile tab bar */}
          <div className="flex md:hidden gap-2 mb-6 p-1 rounded-xl" style={{ background: '#f2f3f9' }}>
            {(['relatorios', 'comandas'] as Aba[]).map((id) => {
              const active = aba === id
              const labels: Record<Aba, string> = { relatorios: 'Relatórios', comandas: 'Comandas' }
              return (
                <button key={id} onClick={() => setAba(id)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
                  style={{
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#b90014' : '#926e6b',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {labels[id]}
                </button>
              )
            })}
          </div>

          {/* Date filter */}
          <section className="mb-10 p-6 rounded-xl flex flex-col md:flex-row items-end gap-4"
            style={{ background: '#f2f3f9' }}>
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Hoje', dias: 1 },
                  { label: '7 dias', dias: 7 },
                  { label: '30 dias', dias: 30 },
                ].map(shortcut => (
                  <button key={shortcut.label} type="button" onClick={() => setPeriodoRapido(shortcut.dias)}
                    className="filter-pill rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest"
                    style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                    {shortcut.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#926e6b' }}>De:</label>
                <input type="date" value={de} onChange={e => setDe(e.target.value)} style={inputStyle} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#926e6b' }}>Até:</label>
                <input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inputStyle} />
              </div>
              </div>
            </div>
            <button onClick={carregar} disabled={loading}
              className="font-bold text-white px-8 rounded-lg transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #b90014, #e31b23)', height: '3rem', minWidth: '7rem' }}>
              {loading ? 'Filtrando...' : 'Filtrar'}
            </button>
          </section>

          {/* ── Aba: Relatórios ── */}
          {aba === 'relatorios' && resumo && (
            <div key="relatorios" className="tab-panel">
              <section className="mb-6 grid grid-cols-1 gap-3 rounded-2xl p-5 md:grid-cols-4"
                style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Periodo</p>
                  <p className="mt-1 text-sm font-black" style={{ color: '#191c20' }}>{periodoLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Pedidos fechados</p>
                  <p className="mt-1 text-sm font-black" style={{ color: '#191c20' }}>{resumo.totalPedidos} pedidos</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Faturamento</p>
                  <p className="mt-1 text-sm font-black" style={{ color: '#b90014' }}>{formatCurrencyBRL(resumo.totalFaturado)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Ticket medio</p>
                  <p className="mt-1 text-sm font-black" style={{ color: '#428057' }}>{formatCurrencyBRL(ticketMedio)}</p>
                </div>
              </section>

              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <KpiCard label="Total Pedidos" value={String(resumo.totalPedidos)} icon="shopping_cart" />
                <KpiCard label="Faturamento" value={formatCurrencyBRL(resumo.totalFaturado)} icon="payments" />
                <KpiCard label="Tempo Médio" value={resumo.tempoMedioMinutos > 0 ? `${resumo.tempoMedioMinutos}min` : '—'} icon="timer" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 motion-list">
                <div className="rounded-xl p-5" style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Ticket médio</p>
                  <p className="mt-2 text-2xl font-black" style={{ color: '#191c20' }}>
                    {formatCurrencyBRL(ticketMedio)}
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: '#428057' }}>Receita média por pedido fechado</p>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Produto líder</p>
                  <p className="mt-2 truncate text-2xl font-black" style={{ color: '#191c20' }}>
                    {itemLider ? `Líder: ${itemLider.itemNome}` : 'Sem vendas'}
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: '#b90014' }}>
                    {itemLider ? `${itemLider.quantidadeTotal} unidades no período` : 'Aguardando movimentação'}
                  </p>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>Ritmo</p>
                  <p className="mt-2 text-2xl font-black" style={{ color: '#191c20' }}>
                    {resumo.totalPedidos > 0 ? 'Ativo' : 'Sem movimento'}
                  </p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: resumo.totalPedidos > 0 ? '#428057' : '#926e6b' }}>
                    {resumo.totalPedidos > 0 ? 'Período com pedidos fechados' : 'Ajuste o filtro ou aguarde pedidos'}
                  </p>
                </div>
              </div>

              {/* Secondary grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Itens mais vendidos */}
                <section className="rounded-2xl p-8 flex flex-col" style={{ background: '#f2f3f9' }}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold tracking-tight">Itens mais vendidos</h3>
                  </div>
                  {resumo.itensMaisVendidos.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: '#926e6b' }}>Sem dados no período.</p>
                  ) : (
                    <div className="overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '22rem' }}>
                      {resumo.itensMaisVendidos.map((item, i) => (
                        <div key={item.itemId}
                          className="flex items-center justify-between p-4 rounded-xl"
                          style={{ background: '#ffffff' }}>
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                              style={{ background: '#f7f9ff', color: '#b90014' }}>
                              {String(i + 1).padStart(2, '0')}
                            </div>
                            <p className="font-bold" style={{ color: '#191c20' }}>{item.itemNome}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="font-bold" style={{ color: '#191c20' }}>{item.quantidadeTotal} un.</p>
                            <p className="text-xs font-bold" style={{ color: '#428057' }}>
                              {formatCurrencyBRL(item.totalGerado)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Pedidos fechados */}
                <section className="rounded-2xl p-8 flex flex-col" style={{ background: '#f2f3f9' }}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold tracking-tight">Pedidos fechados</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                        {pedidos.length} no periodo
                      </span>
                      {pedidos.length > 0 && (
                        <button onClick={() => exportarCsv('pedidos')}
                          className="rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest"
                          style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                          CSV
                        </button>
                      )}
                    </div>
                  </div>

                  {pedidos.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm" style={{ color: '#926e6b' }}>Nenhum pedido no periodo.</p>
                      <button onClick={() => setPeriodoRapido(7)}
                        className="mt-3 rounded-xl px-4 py-2 text-sm font-bold text-white"
                        style={{ background: '#b90014' }}>
                        Ver ultimos 7 dias
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex-shrink-0"
                        style={{ color: '#926e6b' }}>
                        <span>Mesa</span><span>Pedido</span><span>Horário</span><span className="text-right">Total</span>
                      </div>
                      <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '18rem' }}>
                        {pedidos.map(p => (
                          <div key={p.id}
                            className="grid grid-cols-4 px-4 py-4 rounded-xl items-center"
                            style={{ background: '#ffffff' }}>
                            <span className="font-bold" style={{ color: '#b90014' }}>Mesa {p.mesaNumero}</span>
                            <span className="text-sm font-medium" style={{ color: '#191c20' }}>#{p.id}</span>
                            <span className="text-xs" style={{ color: '#926e6b' }}>
                              {new Date(p.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-right font-bold" style={{ color: '#191c20' }}>
                              {formatCurrencyBRL(p.totalFinal ?? 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* CTA banner */}
                  <div className="mt-6 h-32 w-full rounded-xl overflow-hidden relative flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #b90014 0%, #7f0010 100%)' }}>
                    <span className="material-symbols-outlined absolute right-4 bottom-[-12px] opacity-20"
                      style={{ fontSize: '8rem', color: '#ffffff', transform: 'rotate(-12deg)' }}>
                      description
                    </span>
                    <div className="absolute inset-0 flex flex-col justify-center p-6">
                      <span className="text-white text-xs font-bold uppercase tracking-widest opacity-80">Relatório Completo</span>
                      <span className="text-white text-lg font-black mt-1">
                        {resumo.totalPedidos} pedidos - {formatCurrencyBRL(resumo.totalFaturado)}
                      </span>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* ── Aba: Comandas ── */}
          {aba === 'comandas' && (
            <section key="comandas" className="tab-panel flex-1 flex flex-col rounded-2xl p-8 min-h-0" style={{ background: '#f2f3f9' }}>
              <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Comandas fechadas</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                    {buscaComanda.trim() ? `${comandasFiltradas.length} de ${comandas.length}` : `${comandas.length} no período`}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-3 rounded-xl px-4 py-2"
                    style={{ background: '#ffffff', border: '1px solid #e6e8ee' }}>
                    <span className="material-symbols-outlined" style={{ color: '#926e6b', fontSize: '1.1rem' }}>search</span>
                    <input
                      value={buscaComanda}
                      onChange={e => setBuscaComanda(e.target.value)}
                      placeholder="Buscar mesa ou nome"
                      className="w-48 bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#191c20' }}
                    />
                    {buscaComanda && (
                      <button type="button" onClick={() => setBuscaComanda('')}
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
                      </button>
                    )}
                  </label>
                  {comandasFiltradas.length > 0 && (
                    <button onClick={() => exportarCsv('comandas')}
                      className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest"
                      style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                      Exportar CSV
                    </button>
                  )}
                </div>
              </div>

              {comandas.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: '#926e6b' }}>
                    Nenhuma comanda fechada no período.
                  </p>
                  <button onClick={() => setPeriodoRapido(7)}
                    className="mt-3 rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ background: '#b90014' }}>
                    Ver ultimos 7 dias
                  </button>
                </div>
              ) : comandasFiltradas.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: '#926e6b' }}>
                    Nenhuma comanda encontrada para a busca.
                  </p>
                  <button onClick={() => setBuscaComanda('')}
                    className="mt-3 rounded-xl px-4 py-2 text-sm font-bold"
                    style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                    Limpar busca
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0 grid grid-cols-5 px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                    style={{ color: '#926e6b' }}>
                    <span>Mesa</span>
                    <span className="col-span-2">Comanda</span>
                    <span>Data/Hora</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-1">
                    {comandasFiltradas.map(c => (
                      <div key={c.id}
                        className="grid grid-cols-5 px-4 py-4 rounded-xl items-center"
                        style={{ background: '#ffffff' }}>
                        <span className="font-bold" style={{ color: '#b90014' }}>Mesa {c.mesaNumero}</span>
                        <span className="col-span-2 text-sm font-medium truncate pr-2" style={{ color: '#191c20' }}>
                          {c.nome}
                        </span>
                        <span className="text-xs" style={{ color: '#926e6b' }}>
                          {new Date(c.criadaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {' '}
                          {new Date(c.criadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-right font-bold" style={{ color: '#191c20' }}>
                          {formatCurrencyBRL(c.totalFinal ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {loading && !resumo && (
            <div className="flex items-center justify-center py-24" style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Carregando...
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

