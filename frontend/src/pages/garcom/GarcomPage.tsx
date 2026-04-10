import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { Mesa, Pedido, Item, Categoria } from '../../api/types'

type CartItem = { itemId: number; nome: string; preco: number; quantidade: number; observacao: string }

export function GarcomPage() {
  const { user, logout } = useAuth()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [mostrarCart, setMostrarCart] = useState(false)
  const [modalComanda, setModalComanda] = useState(false)

  const carregarMesas = async () => {
    const { data } = await api.get<Mesa[]>('/mesas')
    setMesas(data)
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
    })
  }, [])

  const selecionarMesa = async (mesa: Mesa) => {
    setMesaSelecionada(mesa)
    const { data } = await api.get<Pedido[]>(`/pedidos?mesaId=${mesa.id}&status=Aberto`)
    setPedidos(data)
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

  const enviarPedido = async (separado: boolean) => {
    if (!mesaSelecionada || cart.length === 0) return
    setModalComanda(false)

    if (separado) {
      // Um pedido por item
      for (const c of cart) {
        await api.post('/pedidos', {
          mesaToken: mesaSelecionada.qrCodeToken,
          itens: [{ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null }],
        })
      }
    } else {
      await api.post('/pedidos', {
        mesaToken: mesaSelecionada.qrCodeToken,
        itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null })),
      })
    }

    setCart([])
    setMostrarCart(false)
    const { data } = await api.get<Pedido[]>(`/pedidos?mesaId=${mesaSelecionada.id}&status=Aberto`)
    setPedidos(data)
    await carregarMesas()
  }

  const fecharConta = async (pedidoId: number) => {
    await api.post(`/pedidos/${pedidoId}/fechar`)
    const { data } = await api.get<Pedido[]>(`/pedidos?mesaId=${mesaSelecionada!.id}&status=Aberto`)
    setPedidos(data)
    await carregarMesas()
  }

  if (!mesaSelecionada) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">👨‍🍳 {user?.nome}</h1>
          <button onClick={logout} className="text-sm text-gray-500">Sair</button>
        </div>
        <h2 className="text-lg font-semibold mb-4">Selecione uma mesa</h2>
        <div className="grid grid-cols-3 gap-3">
          {mesas.map(m => (
            <button key={m.id} onClick={() => selecionarMesa(m)}
              className={`p-6 rounded-xl text-center font-bold text-xl shadow ${
                m.status === 'Ocupada' ? 'bg-orange-100 border-2 border-orange-400' : 'bg-white border border-gray-200'
              }`}
            >
              <div>{m.numero}</div>
              <div className="text-xs font-normal mt-1 text-gray-500">{m.status}</div>
            </button>
          ))}
          {mesas.length === 0 && <p className="col-span-3 text-gray-400 text-sm text-center py-8">Nenhuma mesa cadastrada.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-red-600 text-white p-4 flex items-center gap-3">
        <button onClick={voltarParaMesas} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">Mesa {mesaSelecionada.numero}</h1>
      </div>

      <div className="p-4">
        {pedidos.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3">Pedidos em aberto</h2>
            {pedidos.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
                {p.itens.map(i => (
                  <div key={i.id} className="flex justify-between text-sm py-1">
                    <span>{i.quantidade}× {i.itemNome} {i.observacao ? `(${i.observacao})` : ''}</span>
                    <span className={`font-medium ${i.status === 'Pronto' ? 'text-green-600' : 'text-yellow-600'}`}>{i.status}</span>
                  </div>
                ))}
                <div className="border-t mt-3 pt-3 flex justify-between items-center">
                  <span className="font-bold">
                    Total: R$ {p.itens.reduce((a, i) => a + i.itemPreco * i.quantidade, 0).toFixed(2).replace('.', ',')}
                  </span>
                  <button onClick={() => fecharConta(p.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    Fechar conta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-semibold mb-3">Adicionar itens</h2>
        {categorias.map(cat => (
          <div key={cat.id} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{cat.nome}</h3>
            {itens.filter(i => i.categoriaId === cat.id && i.disponivel).map(item => (
              <div key={item.id} className="bg-white rounded-lg p-3 flex justify-between items-center mb-2 shadow-sm">
                <div>
                  <div className="font-medium">{item.nome}</div>
                  <div className="text-sm text-red-600">R$ {item.preco.toFixed(2).replace('.', ',')}</div>
                </div>
                <button onClick={() => adicionarItem(item)}
                  className="bg-red-600 text-white w-9 h-9 rounded-full text-xl font-bold">+</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Carrinho fixo */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl">
          {mostrarCart && (
            <div className="p-4 border-b max-h-60 overflow-y-auto">
              {cart.map(c => (
                <div key={c.itemId} className="flex items-center justify-between py-2">
                  <span className="text-sm">{c.nome}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removerItem(c.itemId)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-lg font-bold flex items-center justify-center">−</button>
                    <span className="w-5 text-center font-semibold">{c.quantidade}</span>
                    <button onClick={() => adicionarItem(itens.find(i => i.id === c.itemId)!)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-lg font-bold flex items-center justify-center">+</button>
                    <span className="text-sm text-gray-500 w-16 text-right">
                      R$ {(c.preco * c.quantidade).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 flex gap-2">
            <button onClick={() => setMostrarCart(v => !v)}
              className="border rounded-xl px-4 py-3 text-sm font-semibold text-gray-600">
              {mostrarCart ? 'Fechar' : `Ver ${cart.reduce((a, c) => a + c.quantidade, 0)} itens`}
            </button>
            <button onClick={() => setModalComanda(true)}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">
              Enviar — R$ {totalCart.toFixed(2).replace('.', ',')}
            </button>
          </div>
        </div>
      )}

      {/* Modal comanda */}
      {modalComanda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-center">Como enviar o pedido?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Será em comandas separadas ou na mesma comanda?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => enviarPedido(false)}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold">
                Mesma comanda
              </button>
              <button onClick={() => enviarPedido(true)}
                className="w-full border-2 border-red-600 text-red-600 py-3 rounded-xl font-semibold">
                Comandas separadas
              </button>
              <button onClick={() => setModalComanda(false)}
                className="w-full text-gray-400 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
