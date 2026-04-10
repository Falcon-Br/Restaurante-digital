import { useEffect, useState, useCallback, useRef } from 'react'
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
  const itensRef = useRef<KdsPedidoItem[]>([])

  const carregarFila = useCallback(async () => {
    try {
      const { data } = await api.get<KdsFilaResponse>('/kds/fila')
      setItens(data.itens)
      itensRef.current = data.itens
      setTempoMedio(data.tempoMedioMinutos)
    } catch {
      setErro('Erro ao carregar fila.')
    }
  }, [])

  useEffect(() => {
    carregarFila()
    // Atualiza minutosEspera a cada 30s sem precisar recarregar a página
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
      await api.patch(`/kds/${pedidoItemId}/status`, { novoStatus: 2 }) // 2 = Pronto
      setItens(prev => prev.filter(i => i.pedidoItemId !== pedidoItemId))
    } catch {
      setErro('Erro ao marcar como pronto.')
    }
  }

  const marcarEsgotado = async (itemId: number, itemNome: string) => {
    if (!confirm(`Marcar "${itemNome}" como esgotado?`)) return
    try {
      await api.patch(`/kds/${itemId}/esgotado`, {})
      setItens(prev => prev.filter(i => i.itemId !== itemId))
    } catch {
      setErro('Erro ao marcar como esgotado.')
    }
  }

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
        <div className="p-4 flex flex-col gap-3">
          {itens.map(item => (
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
                <button onClick={() => marcarEsgotado(item.itemId, item.itemNome)}
                  className="bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700">
                  Esgotado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
