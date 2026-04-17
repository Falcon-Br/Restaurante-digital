import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSignalR } from '../../hooks/useSignalR'
import type { Mesa, Item, Categoria, Comanda } from '../../api/types'

type CartItem = { itemId: number; nome: string; preco: number; quantidade: number; observacao: string }

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

export function GarcomPage() {
  const { user, logout } = useAuth()
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

  useSignalR({
    onItemEsgotado: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i)),
    onItemDisponivel: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: true } : i)),
    onMesasAtualizadas: () => carregarMesas(),
    onPedidoCancelado: () => { if (mesaSelecionada) carregarComandas(mesaSelecionada.id) },
    onPedidoFechado: () => { if (mesaSelecionada) carregarComandas(mesaSelecionada.id) },
  })

  const carregarMesas = async () => {
    const { data } = await api.get<Mesa[]>('/mesas')
    setMesas(data)
  }

  const carregarComandas = async (mesaId: number) => {
    const { data } = await api.get<Comanda[]>(`/mesas/${mesaId}/comandas?status=Aberta`)
    setComandas(data)
  }

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

  const itensFiltrados = catFiltro !== null
    ? itens.filter(i => i.categoriaId === catFiltro)
    : itens

  const catIdx = (catId: number) => categorias.findIndex(c => c.id === catId)

  // ── Mesa selection ──────────────────────────────────────────────
  if (!mesaSelecionada) {
    const livres = mesas.filter(m => m.status === 0)
    const ocupadas = mesas.filter(m => m.status === 1)
    const mesasFiltradas = filtroMesa === 'livres' ? livres : filtroMesa === 'ocupadas' ? ocupadas : mesas

    return (
      <div className="min-h-screen pb-24" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full"
          style={{ background: '#f2f3f9', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#b90014', fontSize: '1.5rem' }}>restaurant</span>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: '#b90014' }}>
              Restaurante Digital
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={logout}
              className="p-2 rounded-full transition-colors"
              style={{ color: '#926e6b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            </button>
          </div>
        </header>

        <main className="px-4 pt-6 pb-4 max-w-lg mx-auto">
          {/* Page title */}
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
              {/* Stats bento card — always first if showing all */}
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

              {/* Mesa cards */}
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
                    {/* Top row */}
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

                    {/* Number */}
                    <div className="mb-5">
                      <h3 className="text-5xl font-black leading-none mb-1" style={{ color: '#191c20' }}>
                        {String(m.numero).padStart(2, '0')}
                      </h3>
                      <p className="text-xs font-medium" style={{ color: '#926e6b' }}>
                        {ocupada ? 'Comanda Ativa' : 'Abrir Comanda'}
                      </p>
                    </div>

                    {/* Bottom row */}
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

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 z-50"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderTop: '1px solid #e6e8ee', boxShadow: '0 -4px 12px rgba(185,0,20,0.04)' }}>
          <div className="flex flex-col items-center justify-center px-5 py-1.5" style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined mb-0.5" style={{ fontSize: '1.5rem' }}>receipt_long</span>
            <span className="text-[11px] font-medium tracking-wide">Pedidos</span>
          </div>
          <div className="flex flex-col items-center justify-center px-5 py-1.5 rounded-xl"
            style={{ background: '#fef2f2', color: '#b90014' }}>
            <span className="material-symbols-outlined mb-0.5"
              style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>
              grid_view
            </span>
            <span className="text-[11px] font-medium tracking-wide">Mesas</span>
          </div>
          <button onClick={logout}
            className="flex flex-col items-center justify-center px-5 py-1.5"
            style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined mb-0.5" style={{ fontSize: '1.5rem' }}>person</span>
            <span className="text-[11px] font-medium tracking-wide">Perfil</span>
          </button>
        </nav>
      </div>
    )
  }

  // ── Mesa detail ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      {/* Fixed header */}
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

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
            {categorias.map(cat => (
              <button key={cat.id}
                onClick={() => setCatFiltro(cat.id)}
                className="whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold flex-shrink-0 transition-all active:scale-95"
                style={catFiltro === cat.id
                  ? { background: '#b90014', color: '#ffffff', boxShadow: '0 2px 8px rgba(185,0,20,0.25)' }
                  : { background: '#eceef4', color: '#5d3f3c' }}>
                {cat.nome}
              </button>
            ))}
          </div>

          {/* Bento 2-col item grid */}
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
                    {/* Image / icon */}
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
