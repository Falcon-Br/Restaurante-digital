import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
import type { Item, Categoria, KdsFilaResponse } from '../../api/types'

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
    }
    load()
  }, [token])

  const itensFiltrados = categoriaAtiva
    ? itens.filter(i => i.categoriaId === categoriaAtiva)
    : itens

  const totalCart = cart.reduce((acc, c) => acc + c.item.preco * c.quantidade, 0)

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
    setObservacao('')
    setQuantidade(1)
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
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700">Pedido enviado!</h2>
          {tempoMedio > 0 && (
            <p className="text-gray-600 mt-2">Tempo estimado: ~{Math.round(tempoMedio)} min</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-red-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">Cardápio</h1>
        {tempoMedio > 0 && (
          <p className="text-center text-sm opacity-80">⏱ Tempo estimado: ~{Math.round(tempoMedio)} min</p>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto p-3 bg-white border-b sticky top-14 z-10">
        {categorias.map(c => (
          <button
            key={c.id}
            onClick={() => setCategoriaAtiva(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              categoriaAtiva === c.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {itensFiltrados.map(item => (
          <div
            key={item.id}
            onClick={() => item.disponivel && setModalItem(item)}
            className={`bg-white rounded-xl p-4 flex gap-3 shadow-sm ${
              !item.disponivel ? 'opacity-50' : 'cursor-pointer active:scale-95 transition-transform'
            }`}
          >
            {item.imagemUrl
              ? <img src={item.imagemUrl} alt={item.nome} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />
            }
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{item.nome}</h3>
                {!item.disponivel && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Indisponível</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{item.descricao}</p>
              <p className="text-red-600 font-semibold mt-1">R$ {item.preco.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        ))}
      </div>

      {modalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-20">
          <div className="bg-white rounded-t-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-1">{modalItem.nome}</h3>
            <p className="text-gray-500 text-sm mb-4">{modalItem.descricao}</p>
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
                <button onClick={() => setQuantidade(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold">−</button>
                <span className="text-xl font-semibold w-8 text-center">{quantidade}</span>
                <button onClick={() => setQuantidade(q => q + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold">+</button>
              </div>
              <span className="text-lg font-bold text-red-600">R$ {(modalItem.preco * quantidade).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalItem(null)} className="flex-1 py-3 rounded-xl border border-gray-300 font-semibold">Cancelar</button>
              <button onClick={adicionarAoCart} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <button
            onClick={enviarPedido}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-between px-6"
          >
            <span className="bg-red-800 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
              {cart.reduce((a, c) => a + c.quantidade, 0)}
            </span>
            <span>Confirmar Pedido</span>
            <span>R$ {totalCart.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
