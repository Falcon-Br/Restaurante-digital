import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
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

  useSignalR({
    onItemEsgotado: (itemId) => {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i))
    },
  })

  useEffect(() => {
    const load = async () => {
      const [catResp, itensResp, kdsFila] = await Promise.all([
        api.get<Categoria[]>('/categorias'),
        api.get<Item[]>('/itens'),
        api.get<KdsFilaResponse>('/kds/fila').catch(() => ({ data: { tempoMedioMinutos: 0, itens: [] } })),
      ])
      setCategorias(catResp.data)
      setItens(itensResp.data)
      setCategoriaAtiva(catResp.data[0]?.id ?? null)
      setTempoMedio(kdsFila.data.tempoMedioMinutos)

      if (token) {
        api.get<Mesa>(`/mesas/token/${token}`)
          .then(r => setMesa(r.data))
          .catch(() => {})
      }
    }
    load()
  }, [token])

  const itensFiltrados = categoriaAtiva
    ? itens.filter(i => i.categoriaId === categoriaAtiva)
    : itens

  const totalCart = cart.reduce((acc, c) => acc + c.item.preco * c.quantidade, 0)
  const totalItensCart = cart.reduce((a, c) => a + c.quantidade, 0)

  const abrirModal = (item: Item) => {
    if (!item.disponivel) return
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
    setModalItem(null)
  }

  const enviarPedido = async () => {
    if (cart.length === 0) return
    await api.post('/pedidos', {
      mesaToken: token,
      itens: cart.map(c => ({
        itemId: c.item.id,
        quantidade: c.quantidade,
        observacao: c.observacao || null,
      })),
    })
    setCart([])
    setPedidoEnviado(true)
    setTimeout(() => setPedidoEnviado(false), 3000)
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
        <nav className="flex overflow-x-auto gap-3 no-scrollbar sticky top-16 bg-gray-50/95 backdrop-blur-sm z-40 py-2 -mx-4 px-4 mb-4">
          {categorias.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoriaAtiva(c.id)}
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

        {/* Itens */}
        <div className="space-y-4">
          {/* Item destaque */}
          {itemDestaque && (
            <div
              onClick={() => abrirModal(itemDestaque)}
              className={`group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                !itemDestaque.disponivel ? 'opacity-50' : 'cursor-pointer'
              }`}
            >
              <div className="aspect-video w-full bg-gray-100 overflow-hidden">
                {itemDestaque.imagemUrl
                  ? <img
                      src={itemDestaque.imagemUrl}
                      alt={itemDestaque.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                    R$ {itemDestaque.preco.toFixed(2).replace('.', ',')}
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
              className={`flex bg-white rounded-xl overflow-hidden shadow-sm h-32 ${
                !item.disponivel ? 'opacity-50' : 'cursor-pointer'
              }`}
            >
              <div className="w-32 flex-none bg-gray-100">
                {item.imagemUrl
                  ? <img src={item.imagemUrl} alt={item.nome} className="w-full h-full object-cover" />
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
                  <span className="text-red-700 font-bold">R$ {item.preco.toFixed(2).replace('.', ',')}</span>
                  {item.disponivel
                    ? <button
                        onClick={() => abrirModal(item)}
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
        <div className="fixed inset-0 bg-black/50 flex items-end z-20" onClick={() => setModalItem(null)}>
          <div
            className="bg-white rounded-t-2xl w-full p-6 max-w-md mx-auto"
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
                R$ {(modalItem.preco * quantidade).toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalItem(null)}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-semibold"
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
                    R$ {totalCart.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
              <button
                onClick={enviarPedido}
                className="bg-red-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-red-700/20 flex items-center gap-2"
              >
                Enviar Pedido
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
