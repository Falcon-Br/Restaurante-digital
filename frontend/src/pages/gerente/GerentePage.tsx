import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { ResumoVendasResponse, PedidoResumo } from '../../api/types'

export function GerentePage() {
  const { logout } = useAuth()
  const [resumo, setResumo] = useState<ResumoVendasResponse | null>(null)
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([])
  const [de, setDe] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  const [ate, setAte] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const carregar = async () => {
    setLoading(true)
    const [r, p] = await Promise.all([
      api.get<ResumoVendasResponse>(`/relatorios/resumo?de=${de}&ate=${ate}`),
      api.get<PedidoResumo[]>(`/relatorios/pedidos?status=Fechado&de=${de}&ate=${ate}`),
    ])
    setResumo(r.data)
    setPedidos(p.data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📊 Relatórios</h1>
        <button onClick={logout} className="text-sm opacity-80">Sair</button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Filtro de datas */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">De</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)}
              className="border rounded-lg p-2 w-full text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)}
              className="border rounded-lg p-2 w-full text-sm" />
          </div>
          <button onClick={carregar} disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {loading ? '...' : 'Filtrar'}
          </button>
        </div>

        {resumo && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-2xl font-black text-red-600">{resumo.totalPedidos}</div>
                <div className="text-xs text-gray-500 mt-1">Pedidos</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-xl font-black text-green-600">
                  R$ {resumo.totalFaturado.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-gray-500 mt-1">Faturado</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-2xl font-black text-blue-600">
                  {resumo.tempoMedioMinutos > 0 ? `${resumo.tempoMedioMinutos}min` : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Tempo médio</div>
              </div>
            </div>

            {/* Itens mais vendidos */}
            {resumo.itensMaisVendidos.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <h2 className="font-bold mb-3">🏆 Itens mais vendidos</h2>
                {resumo.itensMaisVendidos.map((item, i) => (
                  <div key={item.itemId} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-5">{i + 1}.</span>
                      <span className="font-medium">{item.itemNome}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{item.quantidadeTotal}x</div>
                      <div className="text-xs text-gray-500">
                        R$ {item.totalGerado.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico de pedidos */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-bold mb-3">📋 Pedidos fechados ({pedidos.length})</h2>
              {pedidos.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum pedido no período</p>
              )}
              {pedidos.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">Mesa {p.mesaNumero} — Pedido #{p.id}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(p.criadoEm).toLocaleString('pt-BR')} · {p.numeroItens} itens
                    </div>
                  </div>
                  <div className="font-bold text-green-700">
                    R$ {(p.totalFinal ?? 0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
