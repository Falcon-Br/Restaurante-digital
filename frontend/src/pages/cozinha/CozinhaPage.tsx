import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
import { useAuth } from '../../context/AuthContext'
import type { KdsPedidoItem, KdsFilaResponse } from '../../api/types'

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

export function CozinhaPage() {
  const { logout } = useAuth()
  const [itens, setItens] = useState<KdsPedidoItem[]>([])
  const [tempoMedio, setTempoMedio] = useState(0)
  const [modalEsgotado, setModalEsgotado] = useState<{ itemId: number; itemNome: string } | null>(null)

  const carregarFila = useCallback(async () => {
    try {
      const { data } = await api.get<KdsFilaResponse>('/kds/fila')
      setItens(data.itens)
      setTempoMedio(data.tempoMedioMinutos)
    } catch {
      toast.error('Erro ao carregar fila.')
    }
  }, [])

  useEffect(() => {
    carregarFila()
    const interval = setInterval(() => {
      setItens(prev => prev.map(i => ({
        ...i,
        minutosEspera: Math.floor((Date.now() - new Date(i.criadoEm).getTime() / 1000) / 60),
      })))
    }, 30000)
    return () => clearInterval(interval)
  }, [carregarFila])

  useSignalR({
    onNovoPedido: () => carregarFila(),
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

  const confirmarEsgotado = async () => {
    if (!modalEsgotado) return
    const { itemId, itemNome } = modalEsgotado
    setModalEsgotado(null)
    try {
      await api.patch(`/kds/${itemId}/esgotado`, {})
      setItens(prev => prev.filter(i => i.itemId !== itemId))
      toast.success(`${itemNome} marcado como esgotado.`)
    } catch {
      toast.error('Erro ao marcar como esgotado.')
    }
  }

  const grupos = itens.reduce<Record<number, KdsPedidoItem[]>>((acc, item) => {
    if (!acc[item.pedidoId]) acc[item.pedidoId] = []
    acc[item.pedidoId].push(item)
    return acc
  }, {})

  const pedidosUrgentes = Object.values(grupos).filter(g =>
    g.some(i => i.minutosEspera >= 15)
  ).length

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
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3"
              style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3.5rem' }}>check_circle</span>
              <p className="text-xl font-semibold">Nenhum pedido na fila</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                    className="relative flex flex-col rounded-xl overflow-hidden transition-all"
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
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-bold"
                          style={{
                            ...timeBadgeStyle(maxMinutos),
                            animation: isUrgent ? 'pulse 2s infinite' : undefined,
                          }}>
                          {formatMinutos(maxMinutos)}
                        </span>
                      </div>

                      {/* Items list */}
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
                                className="text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all active:scale-95"
                                style={{ background: '#428057', color: '#ffffff' }}>
                                ✓
                              </button>
                              <button
                                onClick={() => setModalEsgotado({ itemId: item.itemId, itemNome: item.itemNome })}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg uppercase tracking-wider transition-all"
                                style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                                —
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Card footer with bulk actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => pedidoItens.forEach(i => marcarPronto(i.pedidoItemId))}
                          className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-all active:scale-95"
                          style={{ background: '#428057' }}>
                          Tudo Pronto
                        </button>
                        <button
                          onClick={() => {
                            if (pedidoItens.length === 1) {
                              setModalEsgotado({ itemId: pedidoItens[0].itemId, itemNome: pedidoItens[0].itemNome })
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.18)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Marcar como esgotado?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>
              Tem certeza que deseja marcar <strong style={{ color: '#191c20' }}>{modalEsgotado.itemNome}</strong> como esgotado?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarEsgotado}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: '#191c20' }}>
                Confirmar
              </button>
              <button onClick={() => setModalEsgotado(null)}
                className="w-full py-3 rounded-xl font-semibold"
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
