import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { Item, Categoria } from '../../api/types'

export function AdminPage() {
  const { logout } = useAuth()
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoriaId: '' })
  const [novaCategoria, setNovaCategoria] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvandoCat, setSalvandoCat] = useState(false)

  const carregar = async () => {
    const [i, c] = await Promise.all([api.get<Item[]>('/itens'), api.get<Categoria[]>('/categorias')])
    setItens(i.data)
    setCategorias(c.data)
    if (c.data.length > 0) setForm(f => ({ ...f, categoriaId: f.categoriaId || String(c.data[0].id) }))
  }

  useEffect(() => { carregar() }, [])

  const criarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoCat(true)
    await api.post('/categorias', { nome: novaCategoria, ordem: categorias.length + 1 })
    setNovaCategoria('')
    await carregar()
    setSalvandoCat(false)
  }

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
    await carregar()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">⚙️ Admin — Cardápio</h1>
        <button onClick={logout} className="text-sm opacity-80">Sair</button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">

        {/* Criar categoria */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="font-bold mb-3">Nova categoria</h2>
          <form onSubmit={criarCategoria} className="flex gap-2">
            <input
              placeholder="Ex: Lanches, Bebidas..."
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              className="border rounded-lg p-3 flex-1"
              required
            />
            <button type="submit" disabled={salvandoCat}
              className="bg-red-600 text-white px-4 rounded-lg font-semibold disabled:opacity-50">
              {salvandoCat ? '...' : 'Criar'}
            </button>
          </form>
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {categorias.map(c => (
                <span key={c.id} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{c.nome}</span>
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
                    <button
                      onClick={() => toggleDisponivel(item.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        item.disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.disponivel ? 'Disponível' : 'Esgotado'}
                    </button>
                    <button
                      onClick={() => deletarItem(item.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-medium"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
