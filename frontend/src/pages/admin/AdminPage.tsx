import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSignalR } from '../../hooks/useSignalR'
import type { Item, Categoria, Mesa } from '../../api/types'

type Tab = 'cardapio' | 'mesas'

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string }; status?: number } }).response
    if (res?.data?.message) return res.data.message
    if (res?.status === 400) return 'Dados inválidos.'
    if (res?.status === 401) return 'Não autorizado.'
    if (res?.status === 500) return 'Erro interno no servidor.'
  }
  return 'Erro inesperado. Tente novamente.'
}

const CAT_ICONS = ['lunch_dining', 'local_bar', 'cookie', 'fastfood', 'cake', 'local_pizza', 'ramen_dining', 'icecream']
const CAT_COLORS = [
  { bg: '#fef2f2', color: '#b90014' },
  { bg: '#eff6ff', color: '#2563eb' },
  { bg: '#fffbeb', color: '#d97706' },
  { bg: '#f0fdf4', color: '#16a34a' },
  { bg: '#fdf4ff', color: '#9333ea' },
  { bg: '#fff7ed', color: '#ea580c' },
]

export function AdminPage() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('cardapio')
  const [erro, setErro] = useState('')

  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', categoriaId: '' })
  const [salvando, setSalvando] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novaCatCozinhar, setNovaCatCozinhar] = useState(true)
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null)
  const [salvandoCat, setSalvandoCat] = useState(false)

  const [mesas, setMesas] = useState<Mesa[]>([])
  const [novoNumeroMesa, setNovoNumeroMesa] = useState('')
  const [salvandoMesa, setSalvandoMesa] = useState(false)
  const [modalExcluirCat, setModalExcluirCat] = useState<number | null>(null)
  const [modalExcluirMesa, setModalExcluirMesa] = useState<number | null>(null)

  useSignalR({
    onItemEsgotado: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i)),
    onItemDisponivel: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: true } : i)),
    onNovoPedido: () => carregarMesas(),
    onPedidoFechado: () => carregarMesas(),
    onPedidoCancelado: () => carregarMesas(),
  })

  const carregarCardapio = async () => {
    const [i, c] = await Promise.all([api.get<Item[]>('/itens'), api.get<Categoria[]>('/categorias')])
    setItens(i.data)
    setCategorias(c.data)
    if (c.data.length > 0) setForm(f => ({ ...f, categoriaId: f.categoriaId || String(c.data[0].id) }))
  }

  const carregarMesas = async () => {
    try {
      const { data } = await api.get<Mesa[]>('/mesas')
      setMesas(data)
    } catch (err) {
      setErro(extractError(err))
    }
  }

  useEffect(() => { carregarCardapio(); carregarMesas() }, [])

  const salvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoCat(true)
    setErro('')
    try {
      if (editandoCat) {
        await api.put(`/categorias/${editandoCat.id}`, { nome: novaCategoria, ordem: editandoCat.ordem, cozinhar: novaCatCozinhar })
        setEditandoCat(null)
      } else {
        await api.post('/categorias', { nome: novaCategoria, ordem: categorias.length + 1, cozinhar: novaCatCozinhar })
      }
      setNovaCategoria('')
      setNovaCatCozinhar(true)
      await carregarCardapio()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvandoCat(false)
    }
  }

  const iniciarEdicaoCategoria = (cat: Categoria) => {
    setEditandoCat(cat)
    setNovaCategoria(cat.nome)
    setNovaCatCozinhar(cat.cozinhar)
    setErro('')
  }

  const excluirCategoria = (id: number) => setModalExcluirCat(id)

  const confirmarExcluirCategoria = async () => {
    if (modalExcluirCat === null) return
    const id = modalExcluirCat
    setModalExcluirCat(null)
    setErro('')
    try {
      await api.delete(`/categorias/${id}`)
      await carregarCardapio()
    } catch (err) {
      setErro(extractError(err))
    }
  }

  const criarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await api.post('/itens', {
        categoriaId: Number(form.categoriaId),
        nome: form.nome,
        descricao: form.descricao,
        preco: parseFloat(form.preco.replace(',', '.')),
        imagemUrl: null,
      })
      setForm(f => ({ ...f, nome: '', descricao: '', preco: '' }))
      await carregarCardapio()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvando(false)
    }
  }

  const toggleDisponivel = async (id: number) => {
    try {
      const { data } = await api.patch<Item>(`/itens/${id}/disponibilidade`)
      setItens(prev => prev.map(i => i.id === id ? { ...i, disponivel: data.disponivel } : i))
    } catch (err) {
      setErro(extractError(err))
    }
  }

  const deletarItem = async (id: number) => {
    if (!confirm('Remover este item?')) return
    setErro('')
    try {
      await api.delete(`/itens/${id}`)
      setItens(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setErro(extractError(err))
    }
  }

  const criarMesa = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoMesa(true)
    setErro('')
    try {
      await api.post('/mesas', { numero: Number(novoNumeroMesa) })
      setNovoNumeroMesa('')
      await carregarMesas()
    } catch (err) {
      setErro(extractError(err))
    } finally {
      setSalvandoMesa(false)
    }
  }

  const excluirMesa = (id: number) => {
    const mesa = mesas.find(m => m.id === id)
    if (mesa?.status === 1) {
      setErro(`Mesa ${mesa.numero} está ocupada e não pode ser excluída.`)
      return
    }
    setModalExcluirMesa(id)
  }

  const confirmarExcluirMesa = async () => {
    if (modalExcluirMesa === null) return
    const id = modalExcluirMesa
    setModalExcluirMesa(null)
    setErro('')
    try {
      await api.delete(`/mesas/${id}`)
      setMesas(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setErro(extractError(err))
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#ffffff',
    border: 'none',
    borderRadius: '0.75rem',
    padding: '1rem',
    fontSize: '0.875rem',
    color: '#191c20',
    outline: 'none',
    width: '100%',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col p-4 gap-2 h-screen sticky top-0 w-64 flex-shrink-0" style={{ background: '#f2f3f9' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: '#b90014' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>restaurant</span>
          </div>
          <div>
            <h1 className="text-base font-black leading-tight" style={{ color: '#191c20' }}>Restaurante Digital</h1>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#926e6b' }}>Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => { setTab('cardapio'); setErro('') }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={tab === 'cardapio'
              ? { background: '#ffffff', color: '#b90014', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#5d3f3c' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: tab === 'cardapio' ? "'FILL' 1" : "'FILL' 0" }}>
              restaurant_menu
            </span>
            <span>Cardápio</span>
          </button>

          <button
            onClick={() => { setTab('mesas'); setErro('') }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={tab === 'mesas'
              ? { background: '#ffffff', color: '#b90014', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: '#5d3f3c' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: tab === 'mesas' ? "'FILL' 1" : "'FILL' 0" }}>
              table_restaurant
            </span>
            <span>Mesas ({mesas.length})</span>
          </button>
        </nav>

        {/* Bottom */}
        <div className="pt-4 space-y-1" style={{ borderTop: '1px solid #e6e8ee' }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#5d3f3c' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Fixed header */}
        <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-8 h-16 flex-shrink-0"
          style={{ background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-4">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2 mr-2">
              <span className="material-symbols-outlined" style={{ color: '#b90014', fontSize: '1.5rem' }}>restaurant</span>
            </div>
            <h2 className="text-lg font-extrabold tracking-tight" style={{ color: '#b90014' }}>
              {tab === 'cardapio' ? 'Gestão de Cardápio' : 'Gestão de Mesas'}
            </h2>
            <div className="hidden md:block w-px h-4" style={{ background: '#e6e8ee' }} />
            <span className="hidden md:block text-sm font-medium" style={{ color: '#926e6b' }}>
              {tab === 'cardapio' ? 'Editor do Cardápio' : 'Controle de Mesas'}
            </span>
          </div>

          {/* Mobile tab switcher */}
          <div className="flex md:hidden gap-1">
            {(['cardapio', 'mesas'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setErro('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={tab === t
                  ? { background: '#b90014', color: '#fff' }
                  : { background: '#f2f3f9', color: '#5d3f3c' }}>
                {t === 'cardapio' ? 'Cardápio' : 'Mesas'}
              </button>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ color: '#5d3f3c' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>logout</span>
              Sair
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 py-8">
          <div className="max-w-5xl mx-auto space-y-10">

            {/* Error banner */}
            {erro && (
              <div className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ background: '#fef2f2', color: '#b90014', border: '1px solid #fecaca' }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>error</span>
                  {erro}
                </div>
                <button onClick={() => setErro('')} className="font-bold text-lg leading-none ml-4">✕</button>
              </div>
            )}

            {/* ══════════════ ABA CARDÁPIO ══════════════ */}
            {tab === 'cardapio' && (
              <>
                {/* Section 1 — Categorias */}
                <section>
                  <div className="flex items-baseline justify-between mb-6">
                    <h3 className="text-2xl font-extrabold tracking-tight">Categorias</h3>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                      Organização do Fluxo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Nova categoria form */}
                    <div className="lg:col-span-4 p-6 rounded-2xl flex flex-col justify-between"
                      style={{ background: '#f2f3f9', border: '2px solid transparent' }}>
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#b90014' }}>
                          {editandoCat ? 'Editar Categoria' : 'Nova Categoria'}
                        </p>
                        <h4 className="text-lg font-bold mb-4">
                          {editandoCat ? `Editando: ${editandoCat.nome}` : 'Adicione um novo agrupamento'}
                        </h4>
                        <form onSubmit={salvarCategoria} className="space-y-3">
                          <input
                            placeholder="Ex: Sobremesas, Vinhos..."
                            value={novaCategoria}
                            onChange={e => setNovaCategoria(e.target.value)}
                            style={inputStyle}
                            required
                          />
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer px-1"
                            style={{ color: '#5d3f3c' }}>
                            <input
                              type="checkbox"
                              checked={novaCatCozinhar}
                              onChange={e => setNovaCatCozinhar(e.target.checked)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: '#b90014' }}
                            />
                            Preparado na cozinha (KDS)
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={salvandoCat}
                              className="flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-white transition-all"
                              style={{ background: 'linear-gradient(135deg, #b90014, #e31b23)', opacity: salvandoCat ? 0.6 : 1 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span>
                              {salvandoCat ? '...' : editandoCat ? 'Salvar' : 'Criar'}
                            </button>
                            {editandoCat && (
                              <button type="button"
                                onClick={() => { setEditandoCat(null); setNovaCategoria(''); setNovaCatCozinhar(true) }}
                                className="px-4 py-3 rounded-xl text-sm font-semibold"
                                style={{ background: '#e6e8ee', color: '#5d3f3c' }}>
                                ✕
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Category cards grid */}
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {categorias.map((cat, idx) => {
                        const palette = CAT_COLORS[idx % CAT_COLORS.length]
                        const icon = CAT_ICONS[idx % CAT_ICONS.length]
                        const count = itens.filter(i => i.categoriaId === cat.id).length
                        return (
                          <div key={cat.id}
                            className="p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition-all"
                            style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                              style={{ background: palette.bg }}>
                              <span className="material-symbols-outlined" style={{ color: palette.color, fontSize: '1.5rem' }}>
                                {icon}
                              </span>
                            </div>
                            <span className="font-bold text-sm">{cat.nome}</span>
                            <span className="text-[10px] uppercase tracking-tighter mt-1" style={{ color: '#926e6b' }}>
                              {count} {count === 1 ? 'Item' : 'Itens'}
                            </span>
                            {cat.cozinhar && (
                              <span className="text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full"
                                style={{ background: '#fef2f2', color: '#b90014' }}>
                                KDS
                              </span>
                            )}
                            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => iniciarEdicaoCategoria(cat)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>edit</span>
                              </button>
                              <button onClick={() => excluirCategoria(cat.id)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ background: '#fef2f2', color: '#b90014' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>delete</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {categorias.length === 0 && (
                        <div className="col-span-3 flex flex-col items-center justify-center py-10 rounded-2xl"
                          style={{ background: '#ffffff', color: '#926e6b' }}>
                          <span className="material-symbols-outlined mb-2" style={{ fontSize: '2rem' }}>category</span>
                          <p className="text-sm">Nenhuma categoria criada ainda.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section 2 — Adicionar item */}
                <section className="rounded-[2rem] p-8 lg:p-12 relative overflow-hidden"
                  style={{ background: '#f2f3f9' }}>
                  <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-10 -right-10"
                      style={{ fontSize: '15rem', color: '#b90014' }}>
                      receipt_long
                    </span>
                  </div>

                  <div className="relative max-w-2xl">
                    <h3 className="text-3xl font-black tracking-tight mb-2">Adicionar item</h3>
                    <p className="mb-8 font-medium" style={{ color: '#926e6b' }}>
                      Expanda seu cardápio com novas criações gastronômicas.
                    </p>

                    {categorias.length === 0 ? (
                      <p className="text-sm" style={{ color: '#926e6b' }}>Crie uma categoria primeiro.</p>
                    ) : (
                      <form onSubmit={criarItem} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
                            style={{ color: '#926e6b' }}>Categoria</label>
                          <select value={form.categoriaId}
                            onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                            style={inputStyle} required>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
                            style={{ color: '#926e6b' }}>Preço (R$)</label>
                          <input placeholder="00,00" value={form.preco}
                            onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                            style={inputStyle} required />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
                            style={{ color: '#926e6b' }}>Nome do Item</label>
                          <input placeholder="Ex: Burger Gourmet Classic" value={form.nome}
                            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                            style={inputStyle} required />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 ml-1"
                            style={{ color: '#926e6b' }}>Descrição</label>
                          <textarea placeholder="Descreva os ingredientes e o preparo..."
                            value={form.descricao}
                            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                            rows={3} required
                            style={{ ...inputStyle, resize: 'none' }} />
                        </div>
                        <div className="sm:col-span-2 pt-2">
                          <button type="submit" disabled={salvando}
                            className="flex items-center gap-3 font-bold px-10 py-4 rounded-xl text-white transition-all"
                            style={{
                              background: '#b90014',
                              boxShadow: '0 4px 16px rgba(185,0,20,0.2)',
                              opacity: salvando ? 0.6 : 1,
                            }}>
                            <span>{salvando ? 'Salvando...' : 'Adicionar ao Menu'}</span>
                            {!salvando && <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>arrow_forward</span>}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </section>

                {/* Section 3 — Item list grouped by category */}
                <section className="space-y-10">
                  {categorias.map((cat, idx) => {
                    const catItens = itens.filter(i => i.categoriaId === cat.id)
                    if (catItens.length === 0) return null
                    const palette = CAT_COLORS[idx % CAT_COLORS.length]
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center gap-4 mb-6">
                          <h4 className="text-xl font-black tracking-tight">{cat.nome}</h4>
                          <div className="flex-1 h-0.5" style={{ background: '#f2f3f9' }} />
                          <span className="text-xs font-bold px-3 py-1 rounded-full"
                            style={{ color: '#b90014', background: '#fef2f2' }}>
                            {catItens.length} {catItens.length === 1 ? 'Item' : 'Itens'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {catItens.map(item => (
                            <div key={item.id}
                              className="flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-2xl group transition-all"
                              style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                              <div className="flex items-center gap-5 mb-4 lg:mb-0">
                                {/* Icon placeholder (no images in DB) */}
                                <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center"
                                  style={{ background: palette.bg }}>
                                  <span className="material-symbols-outlined" style={{ color: palette.color, fontSize: '1.75rem' }}>
                                    {CAT_ICONS[idx % CAT_ICONS.length]}
                                  </span>
                                </div>
                                <div>
                                  <h5 className={`text-base font-bold ${!item.disponivel ? 'line-through' : ''}`}
                                    style={{ color: item.disponivel ? '#191c20' : '#926e6b' }}>
                                    {item.nome}
                                  </h5>
                                  {item.descricao && (
                                    <p className="text-sm mt-0.5 max-w-md" style={{ color: '#926e6b' }}>
                                      {item.descricao}
                                    </p>
                                  )}
                                  <span className="text-base font-black mt-1 block" style={{ color: '#b90014' }}>
                                    R$ {item.preco.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-6 justify-between lg:justify-end">
                                {/* Availability toggle */}
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#926e6b' }}>
                                    {item.disponivel ? 'Disponível' : 'Esgotado'}
                                  </span>
                                  <button
                                    onClick={() => toggleDisponivel(item.id)}
                                    className="relative inline-flex items-center cursor-pointer"
                                    style={{ width: '2.75rem', height: '1.5rem' }}
                                    aria-label="Toggle disponibilidade"
                                  >
                                    <span
                                      className="block w-full h-full rounded-full transition-colors"
                                      style={{ background: item.disponivel ? '#428057' : '#d8dae0' }}
                                    />
                                    <span
                                      className="absolute top-0.5 transition-transform"
                                      style={{
                                        left: item.disponivel ? 'calc(100% - 1.25rem - 2px)' : '2px',
                                        width: '1.25rem',
                                        height: '1.25rem',
                                        background: '#ffffff',
                                        borderRadius: '9999px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                      }}
                                    />
                                  </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <button onClick={() => deletarItem(item.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                                    style={{ background: '#f2f3f9', color: '#926e6b' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </section>
              </>
            )}

            {/* ══════════════ ABA MESAS ══════════════ */}
            {tab === 'mesas' && (
              <>
                {/* Nova mesa form */}
                <section className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#f2f3f9' }}>
                  <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none overflow-hidden">
                    <span className="material-symbols-outlined absolute -top-10 -right-10"
                      style={{ fontSize: '15rem', color: '#b90014' }}>
                      table_restaurant
                    </span>
                  </div>
                  <div className="relative max-w-sm">
                    <h3 className="text-3xl font-black tracking-tight mb-2">Nova mesa</h3>
                    <p className="mb-6 font-medium" style={{ color: '#926e6b' }}>
                      Adicione mesas ao salão do restaurante.
                    </p>
                    <form onSubmit={criarMesa} className="flex gap-3">
                      <input type="number" placeholder="Número da mesa"
                        value={novoNumeroMesa}
                        onChange={e => setNovoNumeroMesa(e.target.value)}
                        min={1}
                        style={{ ...inputStyle, flex: 1 }} required />
                      <button type="submit" disabled={salvandoMesa}
                        className="flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-white flex-shrink-0 transition-all"
                        style={{ background: '#b90014', opacity: salvandoMesa ? 0.6 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                        {salvandoMesa ? '...' : 'Criar'}
                      </button>
                    </form>
                  </div>
                </section>

                {/* Mesa grid */}
                <section>
                  <div className="flex items-baseline justify-between mb-6">
                    <h3 className="text-2xl font-extrabold tracking-tight">Mesas do Salão</h3>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#926e6b' }}>
                      {mesas.filter(m => m.status === 1).length} ocupadas · {mesas.filter(m => m.status === 0).length} livres
                    </span>
                  </div>

                  {mesas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                      style={{ background: '#ffffff', color: '#926e6b' }}>
                      <span className="material-symbols-outlined mb-3" style={{ fontSize: '3rem' }}>table_restaurant</span>
                      <p className="text-sm font-medium">Nenhuma mesa cadastrada.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {mesas.sort((a, b) => a.numero - b.numero).map(m => (
                        <div key={m.id}
                          className="rounded-2xl p-4 text-center group transition-all"
                          style={{
                            background: '#ffffff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            borderTop: `3px solid ${m.status === 1 ? '#d97706' : '#16a34a'}`,
                          }}>
                          <div className="text-3xl font-black mb-1">{m.numero}</div>
                          <div className="text-xs font-semibold mb-3"
                            style={{ color: m.status === 1 ? '#d97706' : '#16a34a' }}>
                            {m.status === 1 ? 'Ocupada' : 'Livre'}
                          </div>
                          <button onClick={() => excluirMesa(m.id)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: '#fef2f2', color: '#b90014' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>delete</span>
                            Excluir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

          </div>
        </main>
      </div>

      {/* ── Modal excluir mesa ── */}
      {modalExcluirMesa !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Excluir mesa?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarExcluirMesa}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                Excluir
              </button>
              <button onClick={() => setModalExcluirMesa(null)}
                className="w-full py-3 rounded-xl font-semibold"
                style={{ border: '2px solid #e6e8ee', color: '#5d3f3c' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal excluir categoria ── */}
      {modalExcluirCat !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Excluir categoria?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>
              Os itens vinculados a esta categoria também serão removidos.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmarExcluirCategoria}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                Excluir
              </button>
              <button onClick={() => setModalExcluirCat(null)}
                className="w-full py-3 rounded-xl font-semibold"
                style={{ border: '2px solid #e6e8ee', color: '#5d3f3c' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
