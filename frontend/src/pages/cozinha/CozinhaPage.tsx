import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
import { useAuth } from '../../context/useAuth'
import { afterModalExit } from '../../utils/modalTransition'
import type { KdsPedidoItem, KdsFilaResponse } from '../../api/types'

type FiltroFila = 'todos' | 'urgentes' | 'recentes'

function urgencyAccent(minutos: number) {
  if (minutos >= 15) return '#b90014'
  if (minutos >= 5) return '#eab308'
  return '#d1d5db'
}

function timeBadgeStyle(minutos: number): React.CSSProperties {
  if (minutos >= 15)
    return { background: '#b90014', color: '#ffffff' }
  if (minutos >= 5)
    return { background: '#fef9c3', color: '#a16207' }
  return { background: '#f1f5f9', color: '#475569' }
}

function formatMinutos(minutos: number) {
  const m = Math.max(0, Math.floor(minutos))
  const mins = Math.floor(m)
  return `${String(mins).padStart(2, '0')}:00`
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

export function CozinhaPage() {
  const { logout } = useAuth()
  const [itens, setItens] = useState<KdsPedidoItem[]>([])
  const [tempoMedio, setTempoMedio] = useState(0)
  const [modalEsgotado, setModalEsgotado] = useState<{ itemId: number; itemNome: string } | null>(null)
  const [modalEsgotadoClosing, setModalEsgotadoClosing] = useState(false)
  const [filtroFila, setFiltroFila] = useState<FiltroFila>('todos')
  const [busca, setBusca] = useState('')
  const [carregandoFila, setCarregandoFila] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(Date.now())
  const [pedidosRecentes, setPedidosRecentes] = useState<number[]>([])
  const [pedidosRecolhidos, setPedidosRecolhidos] = useState<Record<number, boolean>>({})
  const itemIdsRef = useRef<Set<number>>(new Set())

  const carregarFila = useCallback(async (options?: { highlightNew?: boolean }) => {
    setCarregandoFila(true)
    try {
      const { data } = await api.get<KdsFilaResponse>('/kds/fila')
      if (options?.highlightNew) {
        const novosPedidoIds = data.itens
          .filter(item => !itemIdsRef.current.has(item.pedidoItemId))
          .map(item => item.pedidoId)
        const uniquePedidos = [...new Set(novosPedidoIds)]
        if (uniquePedidos.length > 0) {
          setPedidosRecentes(prev => [...new Set([...prev, ...uniquePedidos])])
          setTimeout(() => {
            setPedidosRecentes(prev => prev.filter(id => !uniquePedidos.includes(id)))
          }, 2800)
        }
      }
      setItens(data.itens)
      itemIdsRef.current = new Set(data.itens.map(item => item.pedidoItemId))
      setTempoMedio(data.tempoMedioMinutos)
      const timestamp = Date.now()
      setAtualizadoEm(timestamp)
      setAgora(timestamp)
    } catch {
      toast.error('Erro ao carregar fila.')
    } finally {
      setCarregandoFila(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => carregarFila())
    const interval = setInterval(() => {
      setAgora(Date.now())
      setItens(prev => prev.map(i => ({
        ...i,
        minutosEspera: Math.floor((Date.now() - new Date(i.criadoEm).getTime()) / 60000),
      })))
    }, 30000)
    return () => clearInterval(interval)
  }, [carregarFila])

  useSignalR({
    onNovoPedido: () => carregarFila({ highlightNew: true }),
    onStatusAtualizado: () => carregarFila(),
    onItemEsgotado: () => carregarFila(),
  })

  const marcarPronto = async (pedidoItemId: number) => {
    try {
      await api.patch(`/kds/${pedidoItemId}/status`, { novoStatus: 2 })
      setItens(prev => prev.filter(i => i.pedidoItemId !== pedidoItemId))
      toast.success('Item marcado como pronto!')
    } catch {
      toast.error('Erro ao marcar como pronto.')
    }
  }

  const marcarItensProntos = async (pedidoItemIds: number[]) => {
    try {
      await Promise.all(pedidoItemIds.map(id => api.patch(`/kds/${id}/status`, { novoStatus: 2 })))
      setItens(prev => prev.filter(i => !pedidoItemIds.includes(i.pedidoItemId)))
      toast.success(`${pedidoItemIds.length} ${pedidoItemIds.length === 1 ? 'item marcado' : 'itens marcados'} como pronto.`)
    } catch {
      toast.error('Erro ao marcar itens como prontos.')
    }
  }

  const confirmarEsgotado = async () => {
    if (!modalEsgotado) return
    const { itemId, itemNome } = modalEsgotado
    fecharModalEsgotado()
    try {
      await api.patch(`/kds/${itemId}/esgotado`, {})
      setItens(prev => prev.filter(i => i.itemId !== itemId))
      toast.success(`${itemNome} marcado como esgotado.`)
    } catch {
      toast.error('Erro ao marcar como esgotado.')
    }
  }

  const abrirModalEsgotado = (item: { itemId: number; itemNome: string }) => {
    setModalEsgotadoClosing(false)
    setModalEsgotado(item)
  }

  const fecharModalEsgotado = () => {
    setModalEsgotadoClosing(true)
    afterModalExit(() => {
      setModalEsgotado(null)
      setModalEsgotadoClosing(false)
    })
  }

  const termoBusca = normalizeSearch(busca)
  const itensBuscados = itens.filter(item => {
    if (!termoBusca) return true
    const mesa = String(item.mesaNumero)
    const mesaComZero = mesa.padStart(2, '0')
    const termoMesa = termoBusca.replace(/^0+(?=\d)/, '')
    return normalizeSearch(item.itemNome).includes(termoBusca)
      || mesa.includes(termoMesa)
      || mesaComZero.includes(termoBusca)
      || String(item.pedidoId).includes(termoBusca)
  })

  const itensFiltrados = itensBuscados.filter(item => {
    if (filtroFila === 'urgentes') return item.minutosEspera >= 15
    if (filtroFila === 'recentes') return item.minutosEspera < 5
    return true
  })

  const grupos = itensFiltrados.reduce<Record<number, KdsPedidoItem[]>>((acc, item) => {
    if (!acc[item.pedidoId]) acc[item.pedidoId] = []
    acc[item.pedidoId].push(item)
    return acc
  }, {})

  const pedidosUrgentes = Object.values(itens.reduce<Record<number, KdsPedidoItem[]>>((acc, item) => {
    if (!acc[item.pedidoId]) acc[item.pedidoId] = []
    acc[item.pedidoId].push(item)
    return acc
  }, {})).filter(g =>
    g.some(i => i.minutosEspera >= 15)
  ).length

  const itensRepetidos = Object.values(itens.reduce<Record<number, KdsPedidoItem[]>>((acc, item) => {
    if (!acc[item.itemId]) acc[item.itemId] = []
    acc[item.itemId].push(item)
    return acc
  }, {}))
    .filter(grupo => grupo.length > 1)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)

  const impactoEsgotado = modalEsgotado
    ? itens.filter(item => item.itemId === modalEsgotado.itemId)
    : []

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col p-4 gap-2 h-screen sticky top-0 w-64 flex-shrink-0" style={{ background: '#f2f3f9' }}>
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: '#b90014' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>restaurant</span>
          </div>
          <div>
            <h1 className="text-base font-black leading-tight" style={{ color: '#191c20' }}>Restaurante Digital</h1>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#926e6b' }}>Cozinha</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold"
            style={{ background: '#ffffff', color: '#b90014', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>
              receipt_long
            </span>
            <span>Fila KDS</span>
            {itens.length > 0 && (
              <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: '#b90014', color: '#fff' }}>
                {itens.length}
              </span>
            )}
          </div>
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
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Fixed header */}
        <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-8 h-16 flex-shrink-0"
          style={{ background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: '#b90014' }}>
              Cozinha — KDS
            </h2>
            {tempoMedio > 0 && (
              <>
                <div className="hidden md:block w-px h-4" style={{ background: '#e6e8ee' }} />
                <div className="hidden md:flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#926e6b' }}>timer</span>
                  <span className="text-sm font-medium" style={{ color: '#5d3f3c' }}>
                    Tempo médio:{' '}
                    <span className="font-bold" style={{ color: '#b90014' }}>~{Math.round(tempoMedio)} min</span>
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => carregarFila()}
              disabled={carregandoFila}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
              <span className={`material-symbols-outlined ${carregandoFila ? 'animate-spin' : ''}`} style={{ fontSize: '1rem' }}>
                refresh
              </span>
              <span className="hidden sm:inline">{carregandoFila ? 'Atualizando' : 'Atualizar'}</span>
            </button>
            <span className="hidden md:block text-xs font-semibold" style={{ color: '#926e6b' }}>
              {carregandoFila ? 'Buscando fila...' : formatUpdatedAt(atualizadoEm, agora)}
            </span>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: '#f2f3f9', border: '1px solid #e6e8ee' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#16a34a' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                Estação Principal
              </span>
            </div>
            <button onClick={logout} className="md:hidden flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{ color: '#5d3f3c' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 pt-8 pb-24">
          {itens.length === 0 && carregandoFila ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3"
              style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem' }}>progress_activity</span>
              <p className="text-xl font-semibold">Carregando fila...</p>
            </div>
          ) : itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3"
              style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3.5rem' }}>check_circle</span>
              <p className="text-xl font-semibold">Nenhum pedido na fila</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="flex min-w-0 items-center gap-3 rounded-full px-4 py-2"
                    style={{ background: '#ffffff', border: '1px solid #e6e8ee' }}>
                    <span className="material-symbols-outlined" style={{ color: '#926e6b', fontSize: '1.1rem' }}>search</span>
                    <input
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Buscar mesa, pedido ou item"
                      className="w-56 bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#191c20' }}
                    />
                    {busca && (
                      <button type="button" onClick={() => setBusca('')}
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
                      </button>
                    )}
                  </label>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {([
                    { key: 'todos', label: `Todos (${itensBuscados.length})` },
                    { key: 'urgentes', label: `Urgentes (${itensBuscados.filter(i => i.minutosEspera >= 15).length})` },
                    { key: 'recentes', label: `Recentes (${itensBuscados.filter(i => i.minutosEspera < 5).length})` },
                  ] as const).map(filtro => (
                    <button key={filtro.key} onClick={() => setFiltroFila(filtro.key)}
                      className="filter-pill whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold"
                      style={filtroFila === filtro.key
                        ? { background: '#b90014', color: '#ffffff', boxShadow: '0 2px 8px rgba(185,0,20,0.22)' }
                        : { background: '#ffffff', color: '#5d3f3c', border: '1px solid #e6e8ee' }}>
                      {filtro.label}
                    </button>
                  ))}
                </div>

                {itensRepetidos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {itensRepetidos.map(grupo => (
                      <button key={grupo[0].itemId}
                        onClick={() => marcarItensProntos(grupo.map(i => i.pedidoItemId))}
                        className="ready-card whitespace-nowrap rounded-full bg-[#e9f7ee] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#2f6f45]">
                        Pronto: {grupo.length}x {grupo[0].itemNome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {Object.keys(grupos).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-2xl bg-white"
                  style={{ color: '#926e6b' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>filter_alt_off</span>
                  <p className="text-lg font-semibold">Nenhum item nesse filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 motion-list">
              {/* Alert bento when urgent orders exist */}
              {pedidosUrgentes > 0 && (
                <div className="sm:col-span-2 flex items-center justify-between p-6 rounded-2xl relative overflow-hidden"
                  style={{ background: '#b90014' }}>
                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Pico de Demanda
                    </p>
                    <p className="text-2xl font-black text-white tracking-tight">
                      {pedidosUrgentes} {pedidosUrgentes === 1 ? 'pedido atrasado' : 'pedidos atrasados'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Tempo de espera superior a 15 min.
                    </p>
                  </div>
                  <span className="material-symbols-outlined absolute right-[-10px] bottom-[-20px] opacity-20 -rotate-12"
                    style={{ fontSize: '6rem', color: '#ffffff' }}>
                    restaurant
                  </span>
                </div>
              )}

              {/* Order cards */}
              {Object.entries(grupos).map(([pedidoIdStr, pedidoItens]) => {
                const pedidoId = Number(pedidoIdStr)
                const mesa = pedidoItens[0].mesaNumero
                const maxMinutos = Math.max(...pedidoItens.map(i => i.minutosEspera))
                const isUrgent = maxMinutos >= 15
                const isMedium = maxMinutos >= 5 && maxMinutos < 15

                return (
                  <div key={pedidoId}
                    className={`relative flex flex-col rounded-xl overflow-hidden transition-all ${pedidosRecentes.includes(pedidoId) ? 'kds-new-order' : ''}`}
                    style={{
                      background: '#ffffff',
                      boxShadow: isUrgent
                        ? '0 8px 30px rgba(185,0,20,0.1), 0 0 0 1px rgba(185,0,20,0.08)'
                        : '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                    {/* Urgency bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ background: urgencyAccent(maxMinutos) }} />

                    <div className="p-5">
                      {/* Card header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest mb-1"
                            style={{ color: isUrgent ? '#b90014' : '#926e6b' }}>
                            Mesa {mesa}
                          </h3>
                          <p className="text-2xl font-black tracking-tight" style={{ color: '#191c20' }}>
                            Pedido #{pedidoId}
                          </p>
                          {pedidosRecentes.includes(pedidoId) && (
                            <span className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                              style={{ background: '#e9f7ee', color: '#2f6f45' }}>
                              Novo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPedidosRecolhidos(prev => ({ ...prev, [pedidoId]: !prev[pedidoId] }))}
                            className="rounded-lg p-1.5 transition-colors"
                            style={{ background: '#f2f3f9', color: '#5d3f3c' }}
                            aria-label={pedidosRecolhidos[pedidoId] ? 'Expandir pedido' : 'Recolher pedido'}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                              {pedidosRecolhidos[pedidoId] ? 'expand_more' : 'expand_less'}
                            </span>
                          </button>
                          <span className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              ...timeBadgeStyle(maxMinutos),
                              animation: isUrgent ? 'pulse 2s infinite' : undefined,
                            }}>
                            {formatMinutos(maxMinutos)}
                          </span>
                        </div>
                      </div>

                      {/* Items list */}
                      {!pedidosRecolhidos[pedidoId] ? (
                      <div className="space-y-2 mb-5">
                        {pedidoItens.map(item => (
                          <div key={item.pedidoItemId}
                            className="flex items-center justify-between p-2.5 rounded-lg"
                            style={{
                              background: isUrgent ? '#fff5f5' : '#f8fafc',
                              border: isUrgent ? '1px solid rgba(185,0,20,0.08)' : '1px solid rgba(0,0,0,0.04)',
                            }}>
                            <div className="flex-1 min-w-0 mr-2">
                              <span className="text-sm font-semibold block"
                                style={{ color: isUrgent ? '#7f1d1d' : '#1e293b' }}>
                                {item.quantidade}× {item.itemNome}
                              </span>
                              {item.observacao && (
                                <span className="text-xs" style={{ color: '#926e6b' }}>
                                  📝 {item.observacao}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => marcarPronto(item.pedidoItemId)}
                                className="ready-card text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider"
                                style={{ background: '#428057', color: '#ffffff' }}>
                                ✓
                              </button>
                              <button
                                onClick={() => abrirModalEsgotado({ itemId: item.itemId, itemNome: item.itemNome })}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg uppercase tracking-wider transition-all"
                                style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                                —
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      ) : (
                        <div className="mb-5 rounded-xl px-3 py-2 text-sm font-semibold"
                          style={{ background: '#f7f9ff', color: '#926e6b' }}>
                          {pedidoItens.length} {pedidoItens.length === 1 ? 'item recolhido' : 'itens recolhidos'}
                        </div>
                      )}

                      {/* Card footer with bulk actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => marcarItensProntos(pedidoItens.map(i => i.pedidoItemId))}
                          className="ready-card py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white"
                          style={{ background: '#428057' }}>
                          Tudo Pronto
                        </button>
                        <button
                          onClick={() => {
                            if (pedidoItens.length === 1) {
                              abrirModalEsgotado({ itemId: pedidoItens[0].itemId, itemNome: pedidoItens[0].itemNome })
                            }
                          }}
                          className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                          style={{
                            background: '#f1f5f9',
                            color: isMedium || isUrgent ? '#475569' : '#94a3b8',
                            cursor: pedidoItens.length === 1 ? 'pointer' : 'default',
                            opacity: pedidoItens.length === 1 ? 1 : 0.5,
                          }}>
                          Esgotado
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
                </div>
              )}
            </>
          )}
        </main>

        {/* Sticky footer stats */}
        <footer className="sticky bottom-0 z-40 px-6 md:px-8 py-3 flex items-center justify-between flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e6e8ee' }}>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>Pendentes</span>
              <span className="text-xl font-black leading-none" style={{ color: '#191c20' }}>
                {Object.keys(grupos).length} Pedidos
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>Itens</span>
              <span className="text-xl font-black leading-none" style={{ color: '#191c20' }}>{itens.length}</span>
            </div>
            {tempoMedio > 0 && (
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                  Tempo médio
                </span>
                <span className="text-xl font-black leading-none" style={{ color: '#b90014' }}>
                  ~{Math.round(tempoMedio)} min
                </span>
              </div>
            )}
          </div>
          <span className="hidden sm:block text-xs font-medium" style={{ color: '#d1d5db' }}>
            KDS · Restaurante Digital
          </span>
        </footer>
      </div>

      {/* Modal confirmação esgotado */}
      {modalEsgotado && (
        <div className={`modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 ${modalEsgotadoClosing ? 'modal-exit' : ''}`}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-surface bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.18)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Marcar como esgotado?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>
              Tem certeza que deseja marcar <strong style={{ color: '#191c20' }}>{modalEsgotado.itemNome}</strong> como esgotado?
              {impactoEsgotado.length > 0 && (
                <span className="mt-3 block rounded-xl px-3 py-2 text-xs font-bold"
                  style={{ background: '#fef2f2', color: '#b90014' }}>
                  Isso remove {impactoEsgotado.length} {impactoEsgotado.length === 1 ? 'item aberto' : 'itens abertos'} da fila atual.
                </span>
              )}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarEsgotado}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: '#191c20' }}>
                Confirmar
              </button>
              <button onClick={fecharModalEsgotado}
                className="modal-cancel w-full py-3 rounded-xl font-semibold"
                style={{ border: '2px solid #e6e8ee', color: '#5d3f3c' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
