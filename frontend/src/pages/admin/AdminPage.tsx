import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { Item, Categoria, Mesa } from '../../api/types'

type Tab = 'cardapio' | 'mesas'

export function AdminPage() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('cardapio')

  // Cardápio
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoriaId: '' })
  const [salvando, setSalvando] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null)
  const [salvandoCat, setSalvandoCat] = useState(false)

  // Mesas
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [novoNumeroMesa, setNovoNumeroMesa] = useState('')
  const [salvandoMesa, setSalvandoMesa] = useState(false)

  const carregarCardapio = async () => {
    const [i, c] = await Promise.all([api.get<Item[]>('/itens'), api.get<Categoria[]>('/categorias')])
    setItens(i.data)
    setCategorias(c.data)
    if (c.data.length > 0) setForm(f => ({ ...f, categoriaId: f.categoriaId || String(c.data[0].id) }))
  }

  const carregarMesas = async () => {
    const { data } = await api.get<Mesa[]>('/mesas')
    setMesas(data)
  }

  useEffect(() => {
    carregarCardapio()
    carregarMesas()
  }, [])

  // --- Categorias ---
  const salvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoCat(true)
    if (editandoCat) {
      await api.put(`/categorias/${editandoCat.id}`, { nome: novaCategoria, ordem: editandoCat.ordem })
      setEditandoCat(null)
    } else {
      await api.post('/categorias', { nome: novaCategoria, ordem: categorias.length + 1 })
    }
    setNovaCategoria('')
    await carregarCardapio()
    setSalvandoCat(false)
  }

  const iniciarEdicaoCategoria = (cat: Categoria) => {
    setEditandoCat(cat)
    setNovaCategoria(cat.nome)
  }

  const excluirCategoria = async (id: number) => {
    if (!confirm('Excluir categoria? Os itens vinculados serão removidos.')) return
    await api.delete(`/categorias/${id}`)
    await carregarCardapio()
  }

  // --- Itens ---
  const criarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    await api.post('/itens', {
      categoriaId: Number(form.categoriaId),
      nome: form.nome,
      descricao: form.descricao,
      preco: parseFloat(form.preco.replace(',', '.')),
      imagemUrl: null,
    })
    setForm(f => ({ ...f, nome: '', descricao: '', preco: '' }))
    await carregarCardapio()
    setSalvando(false)
  }

  const toggleDisponivel = async (id: number) => {
    await api.patch(`/itens/${id}/disponibilidade`)
    setItens(prev => prev.map(i => i.id === id ? { ...i, disponivel: !i.disponivel } : i))
  }

  const deletarItem = async (id: number) => {
    if (!confirm('Remover este item?')) return
    await api.delete(`/itens/${id}`)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  // --- Mesas ---
  const criarMesa = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoMesa(true)
    await api.post('/mesas', { numero: Number(novoNumeroMesa) })
    setNovoNumeroMesa('')
    await carregarMesas()
    setSalvandoMesa(false)
  }

  const excluirMesa = async (id: number) => {
    if (!confirm('Excluir esta mesa?')) return
    await api.delete(`/mesas/${id}`)
    setMesas(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">⚙️ Admin</h1>
        <button onClick={logout} className="text-sm opacity-80">Sair</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setTab('cardapio')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'cardapio' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
        >
          Cardápio
        </button>
        <button
          onClick={() => setTab('mesas')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'mesas' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}
        >
          Mesas ({mesas.length})
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* ---- ABA CARDÁPIO ---- */}
        {tab === 'cardapio' && (
          <>
            {/* Categorias */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <h2 className="font-bold mb-3">{editandoCat ? 'Editar categoria' : 'Nova categoria'}</h2>
              <form onSubmit={salvarCategoria} className="flex gap-2 mb-3">
                <input
                  placeholder="Ex: Lanches, Bebidas..."
                  value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value)}
                  className="border rounded-lg p-3 flex-1"
                  required
                />
                <button type="submit" disabled={salvandoCat}
                  className="bg-red-600 text-white px-4 rounded-lg font-semibold disabled:opacity-50">
                  {salvandoCat ? '...' : editandoCat ? 'Salvar' : 'Criar'}
                </button>
                {editandoCat && (
                  <button type="button" onClick={() => { setEditandoCat(null); setNovaCategoria('') }}
                    className="px-3 rounded-lg border text-gray-500">
                    ✕
                  </button>
                )}
              </form>
              {categorias.length > 0 && (
                <div className="flex flex-col gap-2">
                  {categorias.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium">{c.nome}</span>
                      <div className="flex gap-2">
                        <button onClick={() => iniciarEdicaoCategoria(c)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                          Editar
                        </button>
                        <button onClick={() => excluirCategoria(c.id)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar item */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
              <h2 className="font-bold mb-3">Adicionar item</h2>
              {categorias.length === 0 ? (
                <p className="text-gray-400 text-sm">Crie uma categoria primeiro.</p>
              ) : (
                <form onSubmit={criarItem} className="flex flex-col gap-3">
                  <select
                    value={form.categoriaId}
                    onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                    className="border rounded-lg p-3"
                    required
                  >
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <input placeholder="Nome" value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="border rounded-lg p-3" required />
                  <input placeholder="Descrição" value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    className="border rounded-lg p-3" required />
                  <input placeholder="Preço (ex: 28,00)" value={form.preco}
                    onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                    className="border rounded-lg p-3" required />
                  <button type="submit" disabled={salvando}
                    className="bg-red-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50">
                    {salvando ? 'Salvando...' : 'Adicionar'}
                  </button>
                </form>
              )}
            </div>

            {/* Lista de itens */}
            {categorias.map(cat => {
              const catItens = itens.filter(i => i.categoriaId === cat.id)
              if (catItens.length === 0) return null
              return (
                <div key={cat.id} className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{cat.nome}</h3>
                  {catItens.map(item => (
                    <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm mb-2 flex justify-between items-center">
                      <div>
                        <div className={`font-semibold ${!item.disponivel ? 'line-through text-gray-400' : ''}`}>
                          {item.nome}
                        </div>
                        <div className="text-sm text-gray-500">R$ {item.preco.toFixed(2).replace('.', ',')}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleDisponivel(item.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                            item.disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {item.disponivel ? 'Disponível' : 'Esgotado'}
                        </button>
                        <button onClick={() => deletarItem(item.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-medium">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}

        {/* ---- ABA MESAS ---- */}
        {tab === 'mesas' && (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <h2 className="font-bold mb-3">Nova mesa</h2>
              <form onSubmit={criarMesa} className="flex gap-2">
                <input
                  type="number"
                  placeholder="Número da mesa"
                  value={novoNumeroMesa}
                  onChange={e => setNovoNumeroMesa(e.target.value)}
                  min={1}
                  className="border rounded-lg p-3 flex-1"
                  required
                />
                <button type="submit" disabled={salvandoMesa}
                  className="bg-red-600 text-white px-4 rounded-lg font-semibold disabled:opacity-50">
                  {salvandoMesa ? '...' : 'Criar'}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {mesas.sort((a, b) => a.numero - b.numero).map(m => (
                <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm text-center">
                  <div className="text-2xl font-black mb-1">{m.numero}</div>
                  <div className={`text-xs font-medium mb-3 ${m.status === 'Ocupada' ? 'text-orange-500' : 'text-green-600'}`}>
                    {m.status}
                  </div>
                  <button onClick={() => excluirMesa(m.id)}
                    className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium w-full">
                    Excluir
                  </button>
                </div>
              ))}
              {mesas.length === 0 && (
                <p className="col-span-3 text-gray-400 text-sm text-center py-8">Nenhuma mesa cadastrada.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
