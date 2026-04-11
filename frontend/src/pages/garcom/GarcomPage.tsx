import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSignalR } from '../../hooks/useSignalR'
import type { Mesa, Item, Categoria, Comanda } from '../../api/types'

type CartItem = { itemId: number; nome: string; preco: number; quantidade: number; observacao: string }

export function GarcomPage() {
  const { user, logout } = useAuth()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [mostrarCart, setMostrarCart] = useState(false)

  // Modais
  const [modalConfirmarComanda, setModalConfirmarComanda] = useState(false)
  const [modalNomeComanda, setModalNomeComanda] = useState(false)
  const [nomeComanda, setNomeComanda] = useState('')
  const [modalSelecionarComanda, setModalSelecionarComanda] = useState(false)

  useSignalR({
    onItemEsgotado: (itemId) => {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i))
    },
    onItemDisponivel: (itemId) => {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: true } : i))
    },
    onMesasAtualizadas: () => carregarMesas(),
    onPedidoCancelado: () => {
      if (mesaSelecionada) carregarComandas(mesaSelecionada.id)
    },
    onPedidoFechado: () => {
      if (mesaSelecionada) carregarComandas(mesaSelecionada.id)
    },
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

  const enviarPedido = async (comandaId: number) => {
    if (!mesaSelecionada || cart.length === 0) return
    setModalSelecionarComanda(false)
    await api.post('/pedidos', {
      mesaToken: mesaSelecionada.qrCodeToken,
      comandaId,
      itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null })),
    })
    setCart([])
    setMostrarCart(false)
    await carregarComandas(mesaSelecionada.id)
    await carregarMesas()
  }

  const handleEnviarClick = () => {
    if (comandas.length === 0) {
      // Sem comanda aberta — auto-cria "Geral" via backend (ComandaId null)
      enviarSemComanda()
    } else if (comandas.length === 1) {
      enviarPedido(comandas[0].id)
    } else {
      setModalSelecionarComanda(true)
    }
  }

  const enviarSemComanda = async () => {
    if (!mesaSelecionada || cart.length === 0) return
    await api.post('/pedidos', {
      mesaToken: mesaSelecionada.qrCodeToken,
      itens: cart.map(c => ({ itemId: c.itemId, quantidade: c.quantidade, observacao: c.observacao || null })),
    })
    setCart([])
    setMostrarCart(false)
    await carregarComandas(mesaSelecionada.id)
    await carregarMesas()
  }

  const confirmarCriarComanda = () => {
    setModalConfirmarComanda(false)
    setNomeComanda('')
    setModalNomeComanda(true)
  }

  const criarComanda = async () => {
    if (!mesaSelecionada || !nomeComanda.trim()) return
    setModalNomeComanda(false)
    await api.post(`/mesas/${mesaSelecionada.id}/comandas`, { nome: nomeComanda.trim() })
    await carregarComandas(mesaSelecionada.id)
    setNomeComanda('')
  }

  const fecharComanda = async (comandaId: number) => {
    await api.post(`/comandas/${comandaId}/fechar`)
    if (mesaSelecionada) await carregarComandas(mesaSelecionada.id)
    await carregarMesas()
  }

  // --- TELA DE SELEÇÃO DE MESA ---
  if (!mesaSelecionada) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">👨‍🍳 {user?.nome}</h1>
            <button onClick={logout} className="text-sm text-gray-500">Sair</button>
          </div>
          <h2 className="text-lg font-semibold mb-4">Selecione uma mesa</h2>
          <div className="grid grid-cols-3 gap-3">
            {mesas.map(m => (
              <button key={m.id} onClick={() => selecionarMesa(m)}
                className={`p-6 rounded-xl text-center font-bold text-xl shadow ${
                  m.status === 1 ? 'bg-orange-100 border-2 border-orange-400' : 'bg-white border border-gray-200'
                }`}
              >
                <div>{m.numero}</div>
                <div className="text-xs font-normal mt-1 text-gray-500">{m.status === 1 ? 'Ocupada' : 'Livre'}</div>
              </button>
            ))}
            {mesas.length === 0 && <p className="col-span-3 text-gray-400 text-sm text-center py-8">Nenhuma mesa cadastrada.</p>}
          </div>
        </div>
      </div>
    )
  }

  // --- TELA DA MESA ---
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-red-600 text-white p-4 flex items-center gap-3">
        <button onClick={voltarParaMesas} className="text-2xl">←</button>
        <h1 className="text-xl font-bold flex-1">Mesa {mesaSelecionada.numero}</h1>
        <button
          onClick={() => setModalConfirmarComanda(true)}
          className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold"
        >
          + Criar comanda
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Comandas abertas */}
        {comandas.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3">Comandas abertas</h2>
            {comandas.map(comanda => {
              const totalComanda = comanda.pedidos
                .flatMap(p => p.itens)
                .reduce((a, i) => a + i.itemPreco * i.quantidade, 0)
              return (
                <div key={comanda.id} className="bg-white rounded-xl shadow-sm mb-3 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="font-semibold text-gray-700">{comanda.nome}</span>
                    <button
                      onClick={() => fecharComanda(comanda.id)}
                      className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700"
                    >
                      Fechar — R$ {totalComanda.toFixed(2).replace('.', ',')}
                    </button>
                  </div>
                  <div className="px-4 py-2">
                    {comanda.pedidos.length === 0 && (
                      <p className="text-sm text-gray-400 py-2">Nenhum pedido ainda.</p>
                    )}
                    {comanda.pedidos.flatMap(p => p.itens).map(item => (
                      <div key={item.id} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                        <span>{item.quantidade}× {item.itemNome}{item.observacao ? ` (${item.observacao})` : ''}</span>
                        <span className={`font-medium ${item.status === 'Pronto' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Cardápio */}
        <h2 className="font-semibold mb-3">Adicionar itens</h2>
        {categorias.map(cat => (
          <div key={cat.id} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{cat.nome}</h3>
            {itens.filter(i => i.categoriaId === cat.id).map(item => (
              <div key={item.id} className={`bg-white rounded-lg p-3 flex justify-between items-center mb-2 shadow-sm ${!item.disponivel ? 'opacity-50' : ''}`}>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {item.nome}
                    {!item.disponivel && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Esgotado</span>
                    )}
                  </div>
                  <div className="text-sm text-red-600">R$ {item.preco.toFixed(2).replace('.', ',')}</div>
                </div>
                <button onClick={() => adicionarItem(item)} disabled={!item.disponivel}
                  className="bg-red-600 text-white w-9 h-9 rounded-full text-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed">+</button>
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
            <button onClick={handleEnviarClick}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">
              Enviar — R$ {totalCart.toFixed(2).replace('.', ',')}
            </button>
          </div>
        </div>
      )}

      {/* Modal — confirmar criar comanda */}
      {modalConfirmarComanda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-center">Criar nova comanda?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Uma comanda separada será criada para um cliente específico. Os próximos pedidos poderão ser direcionados a ela.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarCriarComanda}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold">
                Continuar
              </button>
              <button onClick={() => setModalConfirmarComanda(false)}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — nome da comanda */}
      {modalNomeComanda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-center">Nome da comanda</h3>
            <p className="text-sm text-gray-500 text-center mb-4">Informe o nome do cliente.</p>
            <input
              autoFocus
              placeholder="Ex: João, Mesa VIP..."
              value={nomeComanda}
              onChange={e => setNomeComanda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criarComanda()}
              className="w-full border rounded-xl p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex flex-col gap-3">
              <button onClick={criarComanda} disabled={!nomeComanda.trim()}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                Criar
              </button>
              <button onClick={() => setModalNomeComanda(false)}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — selecionar comanda ao enviar */}
      {modalSelecionarComanda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2 text-center">Para qual comanda?</h3>
            <p className="text-sm text-gray-500 text-center mb-4">Selecione a comanda que vai receber esse pedido.</p>
            <div className="flex flex-col gap-2 mb-4">
              {comandas.map(c => (
                <button key={c.id} onClick={() => enviarPedido(c.id)}
                  className="w-full border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 text-left px-4 py-3 rounded-xl font-semibold transition-colors">
                  {c.nome}
                </button>
              ))}
            </div>
            <button onClick={() => setModalSelecionarComanda(false)}
              className="w-full text-gray-400 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
