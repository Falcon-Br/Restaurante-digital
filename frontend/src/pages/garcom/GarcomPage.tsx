import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSignalR } from '../../hooks/useSignalR'
import type { Mesa, Item, Categoria, Comanda, Pedido, PedidoItemStatus } from '../../api/types'

type CartItem = { itemId: number; nome: string; preco: number; quantidade: number; observacao: string }
type AbaTopLevel = 'mesas' | 'pedidos' | 'perfil'

type PedidoItemFlat = {
  id: number
  itemId: number
  itemNome: string
  itemPreco: number
  quantidade: number
  observacao: string | null
  status: PedidoItemStatus
  mesaNumero: number
  pedidoId: number
  cozinhar: boolean
}

const CAT_GRADIENTS = [
  'linear-gradient(135deg, #fef2f2, #fecaca)',
  'linear-gradient(135deg, #eff6ff, #bfdbfe)',
  'linear-gradient(135deg, #fffbeb, #fde68a)',
  'linear-gradient(135deg, #f0fdf4, #bbf7d0)',
  'linear-gradient(135deg, #fdf4ff, #e9d5ff)',
  'linear-gradient(135deg, #fff7ed, #fed7aa)',
]
const CAT_ICONS = ['lunch_dining', 'local_bar', 'cookie', 'fastfood', 'cake', 'local_pizza']
const CAT_ICON_COLORS = ['#b90014', '#2563eb', '#d97706', '#16a34a', '#9333ea', '#ea580c']

const STATUS_LABEL: Record<PedidoItemStatus, string> = {
  Pendente: 'Aguardando',
  EmPreparo: 'Preparando',
  Pronto: 'Pronto',
  Entregue: 'Entregue',
}
const STATUS_COLOR: Record<PedidoItemStatus, string> = {
  Pendente: '#d97706',
  EmPreparo: '#2563eb',
  Pronto: '#428057',
  Entregue: '#6b7280',
}
const STATUS_BG: Record<PedidoItemStatus, string> = {
  Pendente: '#fffbeb',
  EmPreparo: '#eff6ff',
  Pronto: '#f0fdf4',
  Entregue: '#f3f4f6',
}

export function GarcomPage() {
  const { user, logout } = useAuth()

  // ── Top-level tab ───────────────────────────────────────────────
  const [abaTopLevel, setAbaTopLevel] = useState<AbaTopLevel>('mesas')

  // ── Mesas ───────────────────────────────────────────────────────
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [catFiltro, setCatFiltro] = useState<number | null>(null)
  const [filtroMesa, setFiltroMesa] = useState<'todas' | 'livres' | 'ocupadas'>('todas')
  const [cart, setCart] = useState<CartItem[]>([])
  const [mostrarCart, setMostrarCart] = useState(false)

  const [modalConfirmarComanda, setModalConfirmarComanda] = useState(false)
  const [modalNomeComanda, setModalNomeComanda] = useState(false)
  const [nomeComanda, setNomeComanda] = useState('')
  const [modalSelecionarComanda, setModalSelecionarComanda] = useState(false)

  // ── Pedidos ─────────────────────────────────────────────────────
  const [todosPedidos, setTodosPedidos] = useState<Pedido[]>([])
  const [carregandoPedidos, setCarregandoPedidos] = useState(false)
  const [entregandoItem, setEntregandoItem] = useState<number | null>(null)

  // ── Drag-to-scroll (category pills) ────────────────────────────
  const catScrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })

  // ── Data loaders ────────────────────────────────────────────────
  const carregarMesas = useCallback(async () => {
    const { data } = await api.get<Mesa[]>('/mesas')
    setMesas(data)
  }, [])

  const carregarComandas = useCallback(async (mesaId: number) => {
    const { data } = await api.get<Comanda[]>(`/mesas/${mesaId}/comandas?status=Aberta`)
    setComandas(data)
  }, [])

  const carregarPedidos = useCallback(async () => {
    setCarregandoPedidos(true)
    try {
      const { data } = await api.get<Pedido[]>('/pedidos?status=Aberto')
      setTodosPedidos(data)
    } catch {
      toast.error('Erro ao carregar pedidos.')
    } finally {
      setCarregandoPedidos(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      api.get<Mesa[]>('/mesas'),
      api.get<Item[]>('/itens'),
      api.get<Categoria[]>('/categorias'),
    ]).then(([m, i, c]) => {
      setMesas(m.data)
      setItens(i.data)
      setCategorias(c.data)
      if (c.data.length > 0) setCatFiltro(c.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (abaTopLevel === 'pedidos') carregarPedidos()
  }, [abaTopLevel, carregarPedidos])

  // ── SignalR ─────────────────────────────────────────────────────
  useSignalR({
    onItemEsgotado: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i)),
    onItemDisponivel: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: true } : i)),
    onMesasAtualizadas: () => carregarMesas(),
    onPedidoCancelado: () => {
      if (mesaSelecionada) carregarComandas(mesaSelecionada.id)
      carregarPedidos()
    },
    onPedidoFechado: () => {
      if (mesaSelecionada) carregarComandas(mesaSelecionada.id)
      carregarPedidos()
    },
    onNovoPedido: () => {
      carregarPedidos()
      carregarMesas()
    },
    onStatusAtualizado: (pedidoItemId, novoStatus) => {
      setTodosPedidos(prev => {
        let toastMsg = ''
        const updated = prev.map(p => ({
          ...p,
          itens: p.itens.map(i => {
            if (i.id === pedidoItemId) {
              if (novoStatus === 'Pronto') {
                toastMsg = `Mesa ${p.mesaNumero} — ${i.itemNome} pronto para entregar!`
              }
              return { ...i, status: novoStatus as PedidoItemStatus }
            }
            return i
          }),
        }))
        if (toastMsg) {
          setTimeout(() => toast.success(toastMsg, { duration: 10000 }), 0)
        }
        return updated
      })
    },
  })

  // ── Drag helpers ────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    const el = catScrollRef.current
    if (!el) return
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }
  const onDragMove = (e: React.MouseEvent) => {
    if (!drag.current.active) return
    e.preventDefault()
    const el = catScrollRef.current
    if (!el) return
    const x = e.pageX - el.offsetLeft
    const walk = x - drag.current.startX
    if (Math.abs(walk) > 4) drag.current.moved = true
    el.scrollLeft = drag.current.scrollLeft - walk
  }
  const onDragEnd = () => {
    drag.current.active = false
    if (catScrollRef.current) catScrollRef.current.style.cursor = 'grab'
    setTimeout(() => { drag.current.moved = false }, 50)
  }

  // ── Marcar entregue ─────────────────────────────────────────────
  const marcarEntregue = async (pedidoItemId: number) => {
    setEntregandoItem(pedidoItemId)
    try {
      await api.patch(`/pedidos/itens/${pedidoItemId}/entregue`, {})
      setTodosPedidos(prev => prev.map(p => ({
        ...p,
        itens: p.itens.map(i => i.id === pedidoItemId ? { ...i, status: 'Entregue' as const } : i),
      })))
      toast.success('Item marcado como entregue!')
    } catch {
      toast.error('Erro ao marcar como entregue.')
    } finally {
      setEntregandoItem(null)
    }
  }

  // ── Cart helpers ────────────────────────────────────────────────
  const adicionarItem = (item: Item) => {
    setCart(prev => {
      const ex = prev.find(c => c.itemId === item.id)
      if (ex) return prev.map(c => c.itemId === item.id ? { ...c, quantidade: c.quantidade + 1 } : c)
      return [...prev, { itemId: item.id, nome: item.nome, preco: item.preco, quantidade: 1, observacao: '' }]
    })
  }

  const removerItem = (itemId: number) => {
    setCart(prev => {
      const ex = prev.find(c => c.itemId === itemId)
      if (!ex) return prev
      if (ex.quantidade === 1) return prev.filter(c => c.itemId !== itemId)
      return prev.map(c => c.itemId === itemId ? { ...c, quantidade: c.quantidade - 1 } : c)
    })
  }

  const totalCart = cart.reduce((a, c) => a + c.preco * c.quantidade, 0)
  const totalQtd = cart.reduce((a, c) => a + c.quantidade, 0)

  // ── Order actions ───────────────────────────────────────────────
  const enviarPedido = async (comandaId: number) => {
    if (!mesaSelecionada || cart.length === 0) return
    setModalSelecionarComanda(false)
    try {
      await api.post('/pedidos', {
        mesaToken: mesaSelecionada.qrCodeToken,
        comandaId,
        itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null })),
      })
      setCart([])
      setMostrarCart(false)
      toast.success('Pedido enviado para a cozinha!')
      await carregarComandas(mesaSelecionada.id)
      await carregarMesas()
    } catch {
      toast.error('Erro ao enviar pedido.')
    }
  }

  const enviarSemComanda = async () => {
    if (!mesaSelecionada || cart.length === 0) return
    try {
      await api.post('/pedidos', {
        mesaToken: mesaSelecionada.qrCodeToken,
        itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null })),
      })
      setCart([])
      setMostrarCart(false)
      toast.success('Pedido enviado para a cozinha!')
      await carregarComandas(mesaSelecionada.id)
      await carregarMesas()
    } catch {
      toast.error('Erro ao enviar pedido.')
    }
  }

  const handleEnviarClick = () => {
    if (comandas.length === 0) enviarSemComanda()
    else if (comandas.length === 1) enviarPedido(comandas[0].id)
    else setModalSelecionarComanda(true)
  }

  const confirmarCriarComanda = () => {
    setModalConfirmarComanda(false)
    setNomeComanda('')
    setModalNomeComanda(true)
  }

  const criarComanda = async () => {
    if (!mesaSelecionada || !nomeComanda.trim()) return
    setModalNomeComanda(false)
    try {
      await api.post(`/mesas/${mesaSelecionada.id}/comandas`, { nome: nomeComanda.trim() })
      setNomeComanda('')
      toast.success('Comanda criada!')
      await carregarComandas(mesaSelecionada.id)
    } catch {
      toast.error('Erro ao criar comanda.')
    }
  }

  const fecharComanda = async (comandaId: number) => {
    try {
      await api.post(`/comandas/${comandaId}/fechar`)
      toast.success('Comanda fechada!')
      if (mesaSelecionada) await carregarComandas(mesaSelecionada.id)
      await carregarMesas()
    } catch {
      toast.error('Erro ao fechar comanda.')
    }
  }

  const selecionarMesa = async (mesa: Mesa) => {
    setMesaSelecionada(mesa)
    await carregarComandas(mesa.id)
  }

  const voltarParaMesas = async () => {
    setMesaSelecionada(null)
    setCart([])
    setMostrarCart(false)
    await carregarMesas()
  }

  const itensFiltrados = catFiltro !== null ? itens.filter(i => i.categoriaId === catFiltro) : itens
  const catIdx = (catId: number) => categorias.findIndex(c => c.id === catId)

  // ── Pedidos helpers ─────────────────────────────────────────────
  // Use frontend category state as source of truth for cozinhar
  // (API also returns cozinhar but may be stale if backend not rebuilt)
  const getCozinhar = (itemId: number): boolean => {
    const item = itens.find(i => i.id === itemId)
    if (!item) return true
    return categorias.find(c => c.id === item.categoriaId)?.cozinhar ?? true
  }

  // Normalize status: API may return integers (0,1,2,3) or strings
  const isStatus = (val: unknown, name: PedidoItemStatus, index: number) =>
    val === name || val === index

  const itensFlat: PedidoItemFlat[] = todosPedidos.flatMap(p =>
    p.itens
      .filter(i => !isStatus(i.status, 'Entregue', 3))
      .map(i => ({ ...i, mesaNumero: p.mesaNumero, pedidoId: p.id, cozinhar: getCozinhar(i.itemId) }))
  )

  // Items ready to deliver: kitchen-ready (Pronto) OR no-prep items (Pendente + !cozinhar)
  const itensProntos = itensFlat.filter(i =>
    isStatus(i.status, 'Pronto', 2) || (isStatus(i.status, 'Pendente', 0) && !i.cozinhar)
  )
  // Items still being processed by kitchen
  const itensAndamento = itensFlat.filter(i =>
    i.cozinhar && !isStatus(i.status, 'Pronto', 2)
  )

  const agruparPorMesa = (items: PedidoItemFlat[]) => {
    const map: Record<number, PedidoItemFlat[]> = {}
    items.forEach(i => {
      if (!map[i.mesaNumero]) map[i.mesaNumero] = []
      map[i.mesaNumero].push(i)
    })
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([mesa, items]) => ({ mesaNumero: Number(mesa), items }))
  }

  // ── Bottom nav (shared) ─────────────────────────────────────────
  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 z-50"
      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderTop: '1px solid #e6e8ee', boxShadow: '0 -4px 12px rgba(185,0,20,0.04)' }}>
      <button
        onClick={() => setAbaTopLevel('pedidos')}
        className="flex flex-col items-center justify-center px-5 py-1.5 rounded-xl relative"
        style={abaTopLevel === 'pedidos' ? { background: '#fef2f2', color: '#b90014' } : { color: '#94a3b8' }}>
        {itensProntos.length > 0 && (
          <span className="absolute top-0 right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: '#b90014' }}>
            {itensProntos.length}
          </span>
        )}
        <span className="material-symbols-outlined mb-0.5"
          style={{ fontSize: '1.5rem', fontVariationSettings: abaTopLevel === 'pedidos' ? "'FILL' 1" : "'FILL' 0" }}>
          receipt_long
        </span>
        <span className="text-[11px] font-medium tracking-wide">Pedidos</span>
      </button>

      <button
        onClick={() => setAbaTopLevel('mesas')}
        className="flex flex-col items-center justify-center px-5 py-1.5 rounded-xl"
        style={abaTopLevel === 'mesas' ? { background: '#fef2f2', color: '#b90014' } : { color: '#94a3b8' }}>
        <span className="material-symbols-outlined mb-0.5"
          style={{ fontSize: '1.5rem', fontVariationSettings: abaTopLevel === 'mesas' ? "'FILL' 1" : "'FILL' 0" }}>
          grid_view
        </span>
        <span className="text-[11px] font-medium tracking-wide">Mesas</span>
      </button>

      <button
        onClick={() => setAbaTopLevel('perfil')}
        className="flex flex-col items-center justify-center px-5 py-1.5 rounded-xl"
        style={abaTopLevel === 'perfil' ? { background: '#fef2f2', color: '#b90014' } : { color: '#94a3b8' }}>
        <span className="material-symbols-outlined mb-0.5"
          style={{ fontSize: '1.5rem', fontVariationSettings: abaTopLevel === 'perfil' ? "'FILL' 1" : "'FILL' 0" }}>
          person
        </span>
        <span className="text-[11px] font-medium tracking-wide">Perfil</span>
      </button>
    </nav>
  )

  // ── Mesa detail view ────────────────────────────────────────────
  if (mesaSelecionada) {
    return (
      <div className="min-h-screen" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-3">
            <button onClick={voltarParaMesas}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors active:scale-95"
              style={{ background: '#f2f3f9' }}>
              <span className="material-symbols-outlined" style={{ color: '#5d3f3c', fontSize: '1.25rem' }}>arrow_back</span>
            </button>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#191c20' }}>
              Mesa {mesaSelecionada.numero}
            </h1>
          </div>
          <button onClick={() => setModalConfirmarComanda(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-all"
            style={{ background: '#b90014', color: '#ffffff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
            Criar comanda
          </button>
        </header>

        <main className="pt-20 pb-40 px-4 space-y-8 max-w-lg mx-auto">

          {/* Comandas abertas */}
          {comandas.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                  Comandas abertas
                </h2>
                <span className="text-xs font-bold" style={{ color: '#b90014' }}>
                  {comandas.length} {comandas.length === 1 ? 'Ativa' : 'Ativas'}
                </span>
              </div>
              {comandas.map((comanda, idx) => {
                const totalComanda = comanda.pedidos
                  .flatMap(p => p.itens)
                  .reduce((a, i) => a + i.itemPreco * i.quantidade, 0)
                const isGeral = comanda.nome === 'Geral'
                return (
                  <div key={comanda.id}
                    className="flex justify-between items-center p-4 rounded-xl transition-colors"
                    style={{
                      background: '#ffffff',
                      borderLeft: `4px solid ${idx === 0 || isGeral ? '#428057' : '#b90014'}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#926e6b' }}>
                        {isGeral ? 'Comanda' : 'Cliente'}
                      </p>
                      <h3 className="text-lg font-extrabold" style={{ color: '#191c20' }}>{comanda.nome}</h3>
                    </div>
                    <button onClick={() => fecharComanda(comanda.id)}
                      className="px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center gap-2 active:scale-95 transition-all"
                      style={{ background: '#428057' }}>
                      Fechar — R$ {totalComanda.toFixed(2).replace('.', ',')}
                    </button>
                  </div>
                )
              })}
            </section>
          )}

          {/* Adicionar itens */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: '#926e6b' }}>
              Adicionar itens
            </h2>

            <div className="flex items-center gap-1">
              <button
                onClick={() => catScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
                className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: '#eceef4' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#5d3f3c' }}>chevron_left</span>
              </button>
              <div
                ref={catScrollRef}
                className="flex flex-1 gap-2 overflow-x-auto pb-2 px-1"
                style={{ scrollbarWidth: 'none', cursor: 'grab', userSelect: 'none' }}
                onMouseDown={onDragStart}
                onMouseMove={onDragMove}
                onMouseUp={onDragEnd}
                onMouseLeave={onDragEnd}>
                {categorias.map(cat => (
                  <button key={cat.id}
                    onClick={() => { if (!drag.current.moved) setCatFiltro(cat.id) }}
                    className="whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold flex-shrink-0 transition-all active:scale-95"
                    style={catFiltro === cat.id
                      ? { background: '#b90014', color: '#ffffff', boxShadow: '0 2px 8px rgba(185,0,20,0.25)' }
                      : { background: '#eceef4', color: '#5d3f3c' }}>
                    {cat.nome}
                  </button>
                ))}
              </div>
              <button
                onClick={() => catScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
                className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: '#eceef4' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#5d3f3c' }}>chevron_right</span>
              </button>
            </div>

            {itensFiltrados.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#926e6b' }}>
                Nenhum item nesta categoria.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {itensFiltrados.map(item => {
                  const idx = catIdx(item.categoriaId)
                  const gradient = CAT_GRADIENTS[idx % CAT_GRADIENTS.length]
                  const icon = CAT_ICONS[idx % CAT_ICONS.length]
                  const iconColor = CAT_ICON_COLORS[idx % CAT_ICON_COLORS.length]
                  const inCart = cart.find(c => c.itemId === item.id)
                  return (
                    <div key={item.id}
                      className="rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
                      style={{
                        background: '#ffffff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        opacity: item.disponivel ? 1 : 0.45,
                      }}>
                      <div className="h-28 w-full flex items-center justify-center relative overflow-hidden"
                        style={{ background: gradient }}>
                        {item.imagemUrl
                          ? <img src={item.imagemUrl} alt={item.nome} className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: iconColor, opacity: 0.6 }}>{icon}</span>
                        }
                        {!item.disponivel && (
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.35)' }}>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Esgotado</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-sm leading-tight" style={{ color: '#191c20' }}>{item.nome}</h4>
                          <span className="font-bold text-xs flex-shrink-0" style={{ color: '#b90014' }}>
                            R$ {item.preco.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        {inCart ? (
                          <div className="flex items-center justify-between rounded-lg overflow-hidden"
                            style={{ background: '#f2f3f9' }}>
                            <button onClick={() => removerItem(item.id)}
                              className="w-10 h-9 flex items-center justify-center font-bold text-lg"
                              style={{ color: '#5d3f3c' }}>−</button>
                            <span className="font-black text-sm" style={{ color: '#191c20' }}>{inCart.quantidade}</span>
                            <button onClick={() => adicionarItem(item)}
                              className="w-10 h-9 flex items-center justify-center font-bold text-lg"
                              style={{ color: '#5d3f3c' }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => adicionarItem(item)} disabled={!item.disponivel}
                            className="w-full py-2 rounded-lg flex justify-center items-center transition-colors disabled:opacity-40 active:scale-95"
                            style={{ background: '#f2f3f9' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#5d3f3c' }}>add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>

        {/* Cart bottom bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full p-3 z-50">
            {mostrarCart && (
              <div className="mb-2 rounded-3xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', boxShadow: '0 -4px 24px rgba(185,0,20,0.08)' }}>
                <div className="px-4 pt-4 pb-2 max-h-52 overflow-y-auto">
                  {cart.map(c => (
                    <div key={c.itemId} className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px solid #f2f3f9' }}>
                      <span className="text-sm font-medium flex-1" style={{ color: '#191c20' }}>{c.nome}</span>
                      <div className="flex items-center gap-2 ml-3">
                        <button onClick={() => removerItem(c.itemId)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{ background: '#f2f3f9', color: '#5d3f3c' }}>−</button>
                        <span className="w-5 text-center font-black text-sm" style={{ color: '#191c20' }}>{c.quantidade}</span>
                        <button onClick={() => adicionarItem(itens.find(i => i.id === c.itemId)!)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{ background: '#f2f3f9', color: '#5d3f3c' }}>+</button>
                        <span className="text-xs w-16 text-right font-semibold" style={{ color: '#926e6b' }}>
                          R$ {(c.preco * c.quantidade).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', boxShadow: '0 -8px 32px rgba(185,0,20,0.12)' }}>
              <button onClick={() => setMostrarCart(v => !v)}
                className="flex flex-col items-center justify-center rounded-2xl px-5 py-2 flex-shrink-0 active:scale-95 transition-all"
                style={{ background: '#f2f3f9' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>Carrinho</span>
                <span className="text-sm font-bold" style={{ color: '#191c20' }}>
                  {mostrarCart ? 'Fechar' : `Ver ${totalQtd} ${totalQtd === 1 ? 'item' : 'itens'}`}
                </span>
              </button>
              <button onClick={handleEnviarClick}
                className="flex-1 h-14 rounded-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-all"
                style={{ background: '#b90014', boxShadow: '0 4px 16px rgba(185,0,20,0.3)' }}>
                <span className="font-bold text-lg text-white">Enviar</span>
                <div className="flex items-center gap-3">
                  <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <span className="font-black text-lg text-white">
                    R$ {totalCart.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Modal — confirmar criar comanda */}
        {modalConfirmarComanda && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
              <h3 className="text-lg font-bold mb-2 text-center">Criar nova comanda?</h3>
              <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>
                Uma comanda separada será criada para um cliente específico.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmarCriarComanda}
                  className="w-full py-3 rounded-xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                  Continuar
                </button>
                <button onClick={() => setModalConfirmarComanda(false)}
                  className="w-full py-3 rounded-xl font-semibold"
                  style={{ border: '2px solid #e6e8ee', color: '#5d3f3c' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal — nome da comanda */}
        {modalNomeComanda && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
              <h3 className="text-lg font-bold mb-1 text-center">Nome da comanda</h3>
              <p className="text-sm text-center mb-4" style={{ color: '#926e6b' }}>Informe o nome do cliente.</p>
              <input autoFocus placeholder="Ex: João, Mesa VIP..."
                value={nomeComanda} onChange={e => setNomeComanda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criarComanda()}
                className="w-full rounded-xl px-4 py-3 mb-4 focus:outline-none text-sm"
                style={{ background: '#f2f3f9', border: 'none', color: '#191c20' }} />
              <div className="flex flex-col gap-3">
                <button onClick={criarComanda} disabled={!nomeComanda.trim()}
                  className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                  Criar
                </button>
                <button onClick={() => setModalNomeComanda(false)}
                  className="w-full py-3 rounded-xl font-semibold"
                  style={{ border: '2px solid #e6e8ee', color: '#5d3f3c' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal — selecionar comanda */}
        {modalSelecionarComanda && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
              style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
              <h3 className="text-lg font-bold mb-1 text-center">Para qual comanda?</h3>
              <p className="text-sm text-center mb-4" style={{ color: '#926e6b' }}>
                Selecione a comanda que vai receber esse pedido.
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {comandas.map(c => (
                  <button key={c.id} onClick={() => enviarPedido(c.id)}
                    className="w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                    style={{ border: '2px solid #f2f3f9', color: '#191c20', background: '#f9fafb', minHeight: '44px' }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#b90014'
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#fff5f5'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#f2f3f9'
                      ;(e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'
                    }}>
                    {c.nome}
                  </button>
                ))}
              </div>
              <button onClick={() => setModalSelecionarComanda(false)}
                className="w-full py-2 text-sm font-medium" style={{ color: '#926e6b' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Top-level: Pedidos tab ──────────────────────────────────────
  if (abaTopLevel === 'pedidos') {
    const prontosPorMesa = agruparPorMesa(itensProntos)
    const andamentoPorMesa = agruparPorMesa(itensAndamento)

    return (
      <div className="min-h-screen pb-24" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full"
          style={{ background: '#f2f3f9', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#b90014', fontSize: '1.5rem' }}>restaurant</span>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: '#b90014' }}>
              Restaurante Digital
            </h1>
          </div>
          <button onClick={carregarPedidos}
            className="p-2 rounded-full transition-colors active:scale-95"
            style={{ color: '#926e6b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>refresh</span>
          </button>
        </header>

        <main className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
          <div className="mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">Pedidos</h2>
            <p className="text-sm font-medium" style={{ color: '#926e6b' }}>
              {user?.nome} • {itensFlat.length} {itensFlat.length === 1 ? 'item' : 'itens'} ativos
            </p>
          </div>

          {carregandoPedidos ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined mb-3 animate-spin" style={{ fontSize: '2rem' }}>progress_activity</span>
              <p className="text-sm font-medium">Carregando pedidos...</p>
            </div>
          ) : itensFlat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined mb-3" style={{ fontSize: '3rem' }}>receipt_long</span>
              <p className="text-sm font-medium">Nenhum pedido em aberto.</p>
            </div>
          ) : (
            <>
              {/* Prontos para entregar */}
              {itensProntos.length > 0 && (
                <section className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#428057' }} />
                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#428057' }}>
                      Prontos para entregar
                    </h3>
                    <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-black text-white"
                      style={{ background: '#428057' }}>
                      {itensProntos.length}
                    </span>
                  </div>

                  {prontosPorMesa.map(({ mesaNumero, items }) => (
                    <div key={mesaNumero} className="rounded-2xl overflow-hidden"
                      style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: '4px solid #428057' }}>
                      {/* Mesa header */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#428057' }}>table_restaurant</span>
                          <span className="font-black text-sm" style={{ color: '#166534' }}>
                            Mesa {String(mesaNumero).padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#dcfce7', color: '#166534' }}>
                          {items.length} {items.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y" style={{ borderColor: '#f2f3f9' }}>
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-xs"
                                style={{ background: '#dcfce7', color: '#166534' }}>
                                {item.quantidade}x
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: '#191c20' }}>{item.itemNome}</p>
                                {item.observacao && (
                                  <p className="text-xs truncate" style={{ color: '#926e6b' }}>{item.observacao}</p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => marcarEntregue(item.id)}
                              disabled={entregandoItem === item.id}
                              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black active:scale-95 transition-all disabled:opacity-50"
                              style={{ background: '#428057', color: '#ffffff' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                                {entregandoItem === item.id ? 'progress_activity' : 'check_circle'}
                              </span>
                              Entregue
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Em andamento */}
              {itensAndamento.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#d97706' }} />
                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: '#926e6b' }}>
                      Em andamento
                    </h3>
                    <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-black"
                      style={{ background: '#f2f3f9', color: '#926e6b' }}>
                      {itensAndamento.length}
                    </span>
                  </div>

                  {andamentoPorMesa.map(({ mesaNumero, items }) => (
                    <div key={mesaNumero} className="rounded-2xl overflow-hidden"
                      style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: '4px solid #e6e8ee' }}>
                      {/* Mesa header */}
                      <div className="flex items-center justify-between px-4 py-3"
                        style={{ background: '#f7f9ff', borderBottom: '1px solid #e6e8ee' }}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#926e6b' }}>table_restaurant</span>
                          <span className="font-black text-sm" style={{ color: '#191c20' }}>
                            Mesa {String(mesaNumero).padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#e6e8ee', color: '#5d3f3c' }}>
                          {items.length} {items.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y" style={{ borderColor: '#f2f3f9' }}>
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-xs"
                                style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                                {item.quantidade}x
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: '#191c20' }}>{item.itemNome}</p>
                                {item.observacao && (
                                  <p className="text-xs truncate" style={{ color: '#926e6b' }}>{item.observacao}</p>
                                )}
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-xs font-black px-2.5 py-1 rounded-full"
                              style={{ background: STATUS_BG[item.status], color: STATUS_COLOR[item.status] }}>
                              {STATUS_LABEL[item.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </main>

        <BottomNav />
      </div>
    )
  }

  // ── Top-level: Perfil tab ──────────────────────────────────────
  if (abaTopLevel === 'perfil') {
    return (
      <div className="min-h-screen pb-24" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full"
          style={{ background: '#f2f3f9', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#b90014', fontSize: '1.5rem' }}>restaurant</span>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: '#b90014' }}>
              Restaurante Digital
            </h1>
          </div>
        </header>

        <main className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
          <div className="mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">Perfil</h2>
            <p className="text-sm font-medium" style={{ color: '#926e6b' }}>{user?.nome}</p>
          </div>

          {/* User card */}
          <div className="rounded-2xl p-5" style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#fef2f2' }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: '2rem', color: '#b90014', fontVariationSettings: "'FILL' 1" }}>
                  person
                </span>
              </div>
              <div>
                <p className="font-black text-lg leading-tight" style={{ color: '#191c20' }}>{user?.nome}</p>
                <p className="text-sm" style={{ color: '#926e6b' }}>{user?.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: '#fef2f2', color: '#b90014' }}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Not implemented */}
          <div className="rounded-2xl p-8 flex flex-col items-center"
            style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <span className="material-symbols-outlined mb-3" style={{ fontSize: '3rem', color: '#d1d5db' }}>
              construction
            </span>
            <p className="font-bold text-base" style={{ color: '#191c20' }}>Em breve</p>
            <p className="text-sm text-center mt-1" style={{ color: '#926e6b' }}>
              Esta funcionalidade ainda não está disponível.
            </p>
          </div>

          {/* Logout */}
          <button onClick={logout}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ border: '2px solid #fecaca', color: '#b90014', background: '#fff5f5' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>logout</span>
            Sair da conta
          </button>
        </main>

        <BottomNav />
      </div>
    )
  }

  // ── Top-level: Mesas tab ────────────────────────────────────────
  const livres = mesas.filter(m => m.status === 0)
  const ocupadas = mesas.filter(m => m.status === 1)
  const mesasFiltradas = filtroMesa === 'livres' ? livres : filtroMesa === 'ocupadas' ? ocupadas : mesas

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full"
        style={{ background: '#f2f3f9', boxShadow: '0 1px 0 #e6e8ee' }}>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined" style={{ color: '#b90014', fontSize: '1.5rem' }}>restaurant</span>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: '#b90014' }}>
            Restaurante Digital
          </h1>
        </div>
        <div className="w-10" />
      </header>

      <main className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">Visão de Mesas</h2>
          <p className="text-sm font-medium" style={{ color: '#926e6b' }}>
            {user?.nome} • {mesas.length} {mesas.length === 1 ? 'Mesa' : 'Mesas'}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'todas', label: 'Todas as Mesas' },
            { key: 'livres', label: `Livre (${livres.length})` },
            { key: 'ocupadas', label: `Ocupada (${ocupadas.length})` },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFiltroMesa(f.key)}
              className="whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
              style={filtroMesa === f.key
                ? { background: '#b90014', color: '#ffffff', boxShadow: '0 2px 8px rgba(185,0,20,0.25)' }
                : { background: '#e6e8ee', color: '#191c20' }}>
              {f.label}
            </button>
          ))}
        </div>

        {mesas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: '#926e6b' }}>
            <span className="material-symbols-outlined mb-3" style={{ fontSize: '3rem' }}>table_restaurant</span>
            <p className="text-sm font-medium">Nenhuma mesa cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtroMesa === 'todas' && mesas.length > 0 && (
              <div className="col-span-2 p-5 rounded-xl overflow-hidden relative"
                style={{ background: '#b90014', minHeight: '6rem' }}>
                <span className="material-symbols-outlined absolute right-3 bottom-[-8px] opacity-20"
                  style={{ fontSize: '6rem', color: '#fff', transform: 'rotate(-12deg)' }}>
                  table_restaurant
                </span>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Salão Principal</p>
                    <p className="text-white text-2xl font-black leading-tight">
                      {ocupadas.length} ocupada{ocupadas.length !== 1 ? 's' : ''} · {livres.length} livre{livres.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-4xl font-black text-white">{mesas.length}</span>
                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">mesas</span>
                  </div>
                </div>
              </div>
            )}

            {mesasFiltradas.sort((a, b) => a.numero - b.numero).map(m => {
              const ocupada = m.status === 1
              return (
                <button key={m.id} onClick={() => selecionarMesa(m)}
                  className="relative text-left p-5 rounded-xl overflow-hidden transition-transform active:scale-95"
                  style={{
                    background: '#ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    borderLeft: `6px solid ${ocupada ? '#b90014' : '#428057'}`,
                  }}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: ocupada ? '#b90014' : '#428057' }}>
                      {ocupada ? 'Ocupada' : 'Livre'}
                    </span>
                    <span className="material-symbols-outlined"
                      style={{
                        fontSize: '1.125rem',
                        color: ocupada ? '#b90014' : '#428057',
                        fontVariationSettings: "'FILL' 1",
                      }}>
                      {ocupada ? 'receipt_long' : 'add_circle'}
                    </span>
                  </div>
                  <div className="mb-5">
                    <h3 className="text-5xl font-black leading-none mb-1" style={{ color: '#191c20' }}>
                      {String(m.numero).padStart(2, '0')}
                    </h3>
                    <p className="text-xs font-medium" style={{ color: '#926e6b' }}>
                      {ocupada ? 'Comanda Ativa' : 'Abrir Comanda'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color: '#926e6b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                      {ocupada ? 'schedule' : 'person'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {ocupada ? 'Em atendimento' : 'Disponível'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
