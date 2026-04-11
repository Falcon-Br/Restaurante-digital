import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import { useSignalR } from '../../hooks/useSignalR'
import { useAuth } from '../../context/AuthContext'
import type { KdsPedidoItem, KdsFilaResponse } from '../../api/types'

function urgenciaBg(minutos: number) {
  if (minutos >= 15) return 'bg-red-500 text-white'
  if (minutos >= 5) return 'bg-yellow-400 text-black'
  return 'bg-white text-black border border-gray-200'
}

export function CozinhaPage() {
  const { logout } = useAuth()
  const [itens, setItens] = useState<KdsPedidoItem[]>([])
  const [tempoMedio, setTempoMedio] = useState(0)
  const [erro, setErro] = useState('')
  const [modalEsgotado, setModalEsgotado] = useState<{ itemId: number; itemNome: string } | null>(null)
  const [modalCancelarPedido, setModalCancelarPedido] = useState<number | null>(null)

  const carregarFila = useCallback(async () => {
    try {
      const { data } = await api.get<KdsFilaResponse>('/kds/fila')
      setItens(data.itens)
      setTempoMedio(data.tempoMedioMinutos)
    } catch {
      setErro('Erro ao carregar fila.')
    }
  }, [])

  useEffect(() => {
    carregarFila()
    const interval = setInterval(() => {
      setItens(prev => prev.map(i => ({
        ...i,
        minutosEspera: Math.floor((Date.now() - new Date(i.criadoEm).getTime()) / 60000)
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
    } catch {
      setErro('Erro ao marcar como pronto.')
    }
  }

  const confirmarEsgotado = async () => {
    if (!modalEsgotado) return
    const { itemId } = modalEsgotado
    setModalEsgotado(null)
    try {
      await api.patch(`/kds/${itemId}/esgotado`, {})
      setItens(prev => prev.filter(i => i.itemId !== itemId))
    } catch {
      setErro('Erro ao marcar como esgotado.')
    }
  }


  const cancelarPedido = async (pedidoId: number) => {
    try {
      await api.delete(`/pedidos/${pedidoId}`)
      setItens(prev => prev.filter(i => i.pedidoId !== pedidoId))
    } catch {
      setErro('Erro ao cancelar pedido.')
    }
  }

  // Group items by pedidoId
  const grupos = itens.reduce<Record<number, KdsPedidoItem[]>>((acc, item) => {
    if (!acc[item.pedidoId]) acc[item.pedidoId] = []
    acc[item.pedidoId].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <div>
          <h1 className="text-2xl font-bold">🍳 Cozinha — KDS</h1>
          {tempoMedio > 0 && (
            <p className="text-sm text-gray-400">Tempo médio: ~{Math.round(tempoMedio)} min</p>
          )}
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Sair</button>
      </div>

      {erro && (
        <div className="bg-red-800 text-white px-4 py-2 text-sm flex justify-between">
          <span>⚠️ {erro}</span>
          <button onClick={() => setErro('')}>✕</button>
        </div>
      )}

      {itens.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-xl">Nenhum pedido na fila ✅</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-6">
          {Object.entries(grupos).map(([pedidoIdStr, pedidoItens]) => {
            const pedidoId = Number(pedidoIdStr)
            const mesa = pedidoItens[0].mesaNumero
            return (
              <div key={pedidoId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-gray-300 text-sm font-semibold uppercase tracking-wide">
                    Mesa {mesa} — Pedido #{pedidoId}
                  </span>
                  <button
                    onClick={() => setModalCancelarPedido(pedidoId)}
                    className="bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-800 font-semibold"
                  >
                    ✕ Cancelar pedido
                  </button>
                </div>
                {pedidoItens.map(item => (
                  <div key={item.pedidoItemId}
                    className={`rounded-xl p-4 flex items-center gap-4 shadow-md ${urgenciaBg(item.minutosEspera)}`}
                  >
                    <div className="text-4xl font-black w-12 text-center">{item.mesaNumero}</div>
                    <div className="flex-1">
                      <div className="font-bold text-lg">{item.quantidade}× {item.itemNome}</div>
                      {item.observacao && (
                        <div className="text-sm opacity-75 mt-0.5">📝 {item.observacao}</div>
                      )}
                      <div className="text-sm opacity-60 mt-1">⏱ {item.minutosEspera} min</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => marcarPronto(item.pedidoItemId)}
                        className="bg-green-500 text-white font-bold px-5 py-3 rounded-lg text-lg hover:bg-green-600 active:scale-95 transition-transform">
                        ✓ PRONTO
                      </button>
                      <button onClick={() => setModalEsgotado({ itemId: item.itemId, itemNome: item.itemNome })}
                        className="bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700">
                        Esgotado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmação cancelar pedido */}
      {modalCancelarPedido !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30 p-4">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-center">Cancelar pedido completo?</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Todos os itens deste pedido serão removidos.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { cancelarPedido(modalCancelarPedido); setModalCancelarPedido(null) }}
                className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-900">
                Confirmar
              </button>
              <button onClick={() => setModalCancelarPedido(null)}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação esgotado */}
      {modalEsgotado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30 p-4">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2 text-center">Marcar como esgotado?</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Tem certeza que deseja marcar <strong>{modalEsgotado.itemNome}</strong> como esgotado?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarEsgotado}
                className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold hover:bg-gray-900">
                Confirmar
              </button>
              <button onClick={() => setModalEsgotado(null)}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
