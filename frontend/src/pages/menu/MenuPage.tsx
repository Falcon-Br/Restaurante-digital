import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
import { formatCurrencyBRL } from '../../utils/currency'
import { afterModalExit } from '../../utils/modalTransition'
import type { Item, Categoria, KdsFilaResponse, Mesa } from '../../api/types'

interface CartItem {
  item: Item
  quantidade: number
  observacao: string
}

export function MenuPage() {
  const { token } = useParams<{ token: string }>()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [modalItem, setModalItem] = useState<Item | null>(null)
  const [observacao, setObservacao] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [tempoMedio, setTempoMedio] = useState(0)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarPedido, setConfirmarPedido] = useState(false)
  const [modalItemClosing, setModalItemClosing] = useState(false)
  const [confirmarPedidoClosing, setConfirmarPedidoClosing] = useState(false)
  const catScrollRef = useRef<HTMLDivElement>(null)
  const catDrag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false })

  useSignalR({
    onItemEsgotado: (itemId) => {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i))
    },
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErro('')
      try {
        const [catResp, itensResp, kdsFila, mesaResp] = await Promise.all([
          api.get<Categoria[]>('/categorias'),
          api.get<Item[]>('/itens'),
          api.get<KdsFilaResponse>('/kds/fila').catch(() => ({ data: { tempoMedioMinutos: 0, itens: [] } })),
          token ? api.get<Mesa>(`/mesas/token/${token}`) : Promise.resolve({ data: null }),
        ])
        setCategorias(catResp.data)
        setItens(itensResp.data)
        setCategoriaAtiva(catResp.data[0]?.id ?? null)
        setTempoMedio(kdsFila.data.tempoMedioMinutos)
        setMesa(mesaResp.data)
        if (!mesaResp.data) setErro('Link de mesa invalido ou indisponivel.')
      } catch {
        setErro('Nao foi possivel carregar o cardapio. Tente novamente em instantes.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const itensFiltrados = categoriaAtiva
    ? itens.filter(i => i.categoriaId === categoriaAtiva)
    : itens

  const onCatDragStart = (e: React.MouseEvent) => {
    const el = catScrollRef.current
    if (!el) return
    catDrag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }

  const onCatDragMove = (e: React.MouseEvent) => {
    if (!catDrag.current.active) return
    e.preventDefault()
    const el = catScrollRef.current
    if (!el) return
    const x = e.pageX - el.offsetLeft
    const walk = x - catDrag.current.startX
    if (Math.abs(walk) > 4) catDrag.current.moved = true
    el.scrollLeft = catDrag.current.scrollLeft - walk
  }

  const onCatDragEnd = () => {
    catDrag.current.active = false
    if (catScrollRef.current) catScrollRef.current.style.cursor = 'grab'
    setTimeout(() => { catDrag.current.moved = false }, 50)
  }

  const totalCart = cart.reduce((acc, c) => acc + c.item.preco * c.quantidade, 0)
  const totalItensCart = cart.reduce((a, c) => a + c.quantidade, 0)

  const abrirModal = (item: Item) => {
    if (!item.disponivel) return
    setModalItemClosing(false)
    setModalItem(item)
    setObservacao('')
    setQuantidade(1)
  }

  const adicionarAoCart = () => {
    if (!modalItem) return
    setCart(prev => {
      const existing = prev.find(c => c.item.id === modalItem.id && c.observacao === observacao)
      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, quantidade: c.quantidade + quantidade } : c)
      }
      return [...prev, { item: modalItem, quantidade, observacao }]
    })
    fecharModalItem()
  }

  const fecharModalItem = () => {
    setModalItemClosing(true)
    afterModalExit(() => {
      setModalItem(null)
      setModalItemClosing(false)
    })
  }

  const abrirConfirmarPedido = () => {
    setConfirmarPedidoClosing(false)
    setConfirmarPedido(true)
  }

  const fecharConfirmarPedido = () => {
    setConfirmarPedidoClosing(true)
    afterModalExit(() => {
      setConfirmarPedido(false)
      setConfirmarPedidoClosing(false)
    })
  }

  const removerDoCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const alterarQuantidadeCart = (index: number, delta: number) => {
    setCart(prev => prev.map((c, i) =>
      i === index ? { ...c, quantidade: Math.max(1, c.quantidade + delta) } : c
    ))
  }

  const enviarPedido = async () => {
    if (cart.length === 0) return
    setEnviando(true)
    try {
      await api.post('/pedidos', {
        mesaToken: token,
        itens: cart.map(c => ({
          itemId: c.item.id,
          quantidade: c.quantidade,
          observacao: c.observacao || null,
        })),
      })
      setCart([])
      setConfirmarPedido(false)
      setPedidoEnviado(true)
      setTimeout(() => setPedidoEnviado(false), 4500)
    } catch {
      setErro('Nao foi possivel enviar o pedido. Chame a equipe ou tente novamente.')
      setConfirmarPedido(false)
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="motion-panel text-center">
          <span className="material-symbols-outlined mb-3 animate-spin text-red-700" style={{ fontSize: 40 }}>progress_activity</span>
          <p className="font-bold text-gray-900">Carregando cardapio...</p>
          <p className="mt-1 text-sm text-gray-500">Estamos buscando os itens da mesa.</p>
        </div>
      </div>
    )
  }

  if (erro && (!mesa || categorias.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="motion-panel max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <span className="material-symbols-outlined mb-4 text-red-700" style={{ fontSize: 48 }}>link_off</span>
          <h1 className="text-2xl font-black text-gray-900">Cardapio indisponivel</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{erro}</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-red-700 px-5 py-3 font-bold text-white">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (pedidoEnviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 40 }}>check</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Pedido enviado!</h2>
          <p className="text-gray-500 mt-2">Seu pedido foi recebido pela cozinha.</p>
          {tempoMedio > 0 && (
            <p className="text-gray-500 mt-1">Tempo estimado: ~{Math.round(tempoMedio)} min</p>
          )}
        </div>
      </div>
    )
  }

  const [itemDestaque, ...itensSecundarios] = itensFiltrados

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-700">restaurant</span>
          <span className="text-red-700 font-black italic tracking-tight text-lg">Restaurante Digital</span>
        </div>
        {mesa && (
          <div className="bg-gray-100 px-4 py-1.5 rounded-full">
            <span className="font-bold text-lg text-red-700">Mesa {mesa.numero}</span>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto pt-4 px-4">
        {/* Banner */}
        <section className="mb-8">
          <div className="bg-red-700 rounded-xl p-6 relative overflow-hidden shadow-lg shadow-red-700/20">
            <div className="relative z-10">
              <h2 className="text-white font-bold text-2xl leading-tight mb-1">
                {tempoMedio > 0 ? 'Tempo de Espera' : 'Bem-vindo!'}
              </h2>
              <p className="text-white/80 text-sm">
                {tempoMedio > 0
                  ? `Tempo médio de preparo: ~${Math.round(tempoMedio)} min`
                  : 'Escolha seus itens e faça seu pedido.'}
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 rotate-12 pointer-events-none">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 120 }}>celebration</span>
            </div>
          </div>
        </section>

        {/* Categorias */}
        <div className="sticky top-16 z-40 -mx-4 mb-4 bg-gray-50/95 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => catScrollRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 active:scale-95"
              aria-label="Categoria anterior"
            >
              <span className="material-symbols-outlined text-lg text-gray-700">chevron_left</span>
            </button>
            <nav
              ref={catScrollRef}
              className="no-scrollbar flex flex-1 gap-3 overflow-x-auto px-1"
              style={{ cursor: 'grab', userSelect: 'none' }}
              onMouseDown={onCatDragStart}
              onMouseMove={onCatDragMove}
              onMouseUp={onCatDragEnd}
              onMouseLeave={onCatDragEnd}
            >
              {categorias.map(c => (
                <button
                  key={c.id}
                  onClick={() => { if (!catDrag.current.moved) setCategoriaAtiva(c.id) }}
                  className={`flex-none px-6 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 whitespace-nowrap ${
                    categoriaAtiva === c.id
                      ? 'bg-red-700 text-white font-bold'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => catScrollRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 active:scale-95"
              aria-label="Proxima categoria"
            >
              <span className="material-symbols-outlined text-lg text-gray-700">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Itens */}
        {erro && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {erro}
          </div>
        )}

        <div className="space-y-4 motion-list">
          {/* Item destaque */}
          {itemDestaque && (
            <div
              onClick={() => abrirModal(itemDestaque)}
              className={`group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                !itemDestaque.disponivel ? 'opacity-50' : 'cursor-pointer'
              }`}
            >
              <div className="image-frame aspect-video w-full overflow-hidden">
                {itemDestaque.imagemUrl
                  ? <img
                      src={itemDestaque.imagemUrl}
                      alt={itemDestaque.nome}
                      loading="eager"
                      decoding="async"
                      className="smooth-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 64 }}>restaurant</span>
                    </div>
                }
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-gray-900 font-bold text-xl">{itemDestaque.nome}</h3>
                  <span className="text-red-700 font-bold text-lg ml-3 whitespace-nowrap">
                    {formatCurrencyBRL(itemDestaque.preco)}
                  </span>
                </div>
                {itemDestaque.descricao && (
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{itemDestaque.descricao}</p>
                )}
                {!itemDestaque.disponivel
                  ? <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full">Indisponível</span>
                  : <div className="w-full py-3 bg-red-50 text-red-800 rounded-lg font-bold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-xl">add</span>
                      Adicionar ao pedido
                    </div>
                }
              </div>
            </div>
          )}

          {/* Demais itens */}
          {itensSecundarios.map(item => (
            <div
              key={item.id}
              onClick={() => abrirModal(item)}
              className={`flex bg-white rounded-xl overflow-hidden shadow-sm h-32 ${
                !item.disponivel ? 'opacity-50' : 'cursor-pointer'
              }`}
            >
              <div className="image-frame w-32 flex-none">
                {item.imagemUrl
                  ? <img src={item.imagemUrl} alt={item.nome} loading="lazy" decoding="async" className="smooth-image w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-300 text-3xl">restaurant</span>
                    </div>
                }
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-gray-900 font-bold text-base leading-tight">{item.nome}</h3>
                  {item.descricao && (
                    <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{item.descricao}</p>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-red-700 font-bold">{formatCurrencyBRL(item.preco)}</span>
                  {item.disponivel
                    ? <button
                        onClick={(e) => { e.stopPropagation(); abrirModal(item) }}
                        className="bg-red-700 text-white w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Esgotado</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal adicionar item */}
      {modalItem && (
        <div className={`modal-backdrop fixed inset-0 z-[60] flex items-end bg-black/50 ${modalItemClosing ? 'modal-exit' : ''}`} onClick={fecharModalItem}>
          <div
            className="modal-surface bg-white rounded-t-2xl w-full p-6 max-w-md mx-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-1">{modalItem.nome}</h3>
            {modalItem.descricao && (
              <p className="text-gray-500 text-sm mb-4">{modalItem.descricao}</p>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
            <input
              type="text"
              placeholder="ex: sem cebola"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold"
                >
                  −
                </button>
                <span className="text-xl font-semibold w-8 text-center">{quantidade}</span>
                <button
                  onClick={() => setQuantidade(q => q + 1)}
                  className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold"
                >
                  +
                </button>
              </div>
              <span className="text-lg font-bold text-red-700">
                {formatCurrencyBRL(modalItem.preco * quantidade)}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fecharModalItem}
                className="modal-cancel flex-1 py-3 rounded-xl border border-gray-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarAoCart}
                className="flex-1 py-3 rounded-xl bg-red-700 text-white font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer carrinho */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full z-50 p-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl">
                  <span className="material-symbols-outlined text-red-700">shopping_cart</span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Carrinho ({totalItensCart} {totalItensCart === 1 ? 'item' : 'itens'})
                  </p>
                  <p className="font-bold text-lg text-gray-900">
                    {formatCurrencyBRL(totalCart)}
                  </p>
                </div>
              </div>
              <button
                onClick={abrirConfirmarPedido}
                className="bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-red-700/20 flex items-center gap-2"
              >
                Revisar
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarPedido && (
        <div className={`modal-backdrop fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4 ${confirmarPedidoClosing ? 'modal-exit' : ''}`} onClick={fecharConfirmarPedido}>
          <div className="modal-surface mx-auto w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Revisar pedido</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {mesa ? `Mesa ${mesa.numero}` : 'Mesa'} · {totalItensCart} {totalItensCart === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <button onClick={fecharConfirmarPedido} className="rounded-lg bg-gray-100 p-2">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {cart.map((c, index) => (
                <div key={`${c.item.id}-${c.observacao}-${index}`} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">{c.item.nome}</p>
                      {c.observacao && <p className="mt-1 text-xs text-gray-500">{c.observacao}</p>}
                    </div>
                    <button onClick={() => removerDoCart(index)} className="rounded-lg bg-red-50 p-2 text-red-700">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => alterarQuantidadeCart(index, -1)} className="h-9 w-9 rounded-full bg-gray-100 font-bold">-</button>
                      <span className="w-8 text-center font-black">{c.quantidade}</span>
                      <button onClick={() => alterarQuantidadeCart(index, 1)} className="h-9 w-9 rounded-full bg-gray-100 font-bold">+</button>
                    </div>
                    <span className="font-black text-red-700">
                      {formatCurrencyBRL(c.item.preco * c.quantidade)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Total</span>
              <span className="text-2xl font-black text-gray-900">{formatCurrencyBRL(totalCart)}</span>
            </div>
            <button
              onClick={enviarPedido}
              disabled={enviando || cart.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-4 font-black text-white disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Confirmar pedido'}
              {!enviando && <span className="material-symbols-outlined text-lg">check_circle</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
