import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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

const inputStyle: React.CSSProperties = {
  background: '#f7f9ff',
  border: '1px solid #e6e8ee',
  borderRadius: '0.75rem',
  padding: '0.875rem 1rem',
  fontSize: '0.875rem',
  color: '#191c20',
  outline: 'none',
  width: '100%',
}

export function AdminPage() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('cardapio')

  // ── Cardápio state ──────────────────────────────────────────────
  const [itens, setItens] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // Modal categoria (add / edit)
  const [modalCat, setModalCat] = useState(false)
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null)
  const [formCat, setFormCat] = useState({ nome: '', cozinhar: true })
  const [salvandoCat, setSalvandoCat] = useState(false)

  // Modal item (add / edit)
  const [modalItem, setModalItem] = useState(false)
  const [editandoItemId, setEditandoItemId] = useState<number | null>(null)
  const [formItem, setFormItem] = useState({ nome: '', descricao: '', preco: '', categoriaId: '', imagemUrl: '' })
  const [salvandoItem, setSalvandoItem] = useState(false)
  const [uploadandoImagem, setUploadandoImagem] = useState(false)
  const [itemModalOrigemCat, setItemModalOrigemCat] = useState<Categoria | null>(null)

  // Modal excluir
  const [modalExcluirCat, setModalExcluirCat] = useState<number | null>(null)

  // Modal "Ver todas as categorias"
  const [modalTodasCats, setModalTodasCats] = useState(false)
  const [catSelecionadaModal, setCatSelecionadaModal] = useState<Categoria | null>(null)

  // ── Mesas state ─────────────────────────────────────────────────
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [modalMesa, setModalMesa] = useState(false)
  const [novoNumeroMesa, setNovoNumeroMesa] = useState('')
  const [salvandoMesa, setSalvandoMesa] = useState(false)
  const [modalExcluirMesa, setModalExcluirMesa] = useState<number | null>(null)

  // ── SignalR ─────────────────────────────────────────────────────
  useSignalR({
    onItemEsgotado: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: false } : i)),
    onItemDisponivel: (itemId) => setItens(prev => prev.map(i => i.id === itemId ? { ...i, disponivel: true } : i)),
    onNovoPedido: () => carregarMesas(),
    onPedidoFechado: () => carregarMesas(),
    onPedidoCancelado: () => carregarMesas(),
  })

  // ── Data loaders ────────────────────────────────────────────────
  const carregarCardapio = async () => {
    const [i, c] = await Promise.all([api.get<Item[]>('/itens'), api.get<Categoria[]>('/categorias')])
    setItens(i.data)
    setCategorias(c.data)
  }

  const carregarMesas = async () => {
    try {
      const { data } = await api.get<Mesa[]>('/mesas')
      setMesas(data)
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  useEffect(() => { carregarCardapio(); carregarMesas() }, [])

  // ── Categoria actions ───────────────────────────────────────────
  const abrirModalNovaCat = () => {
    setEditandoCat(null)
    setFormCat({ nome: '', cozinhar: true })
    setModalCat(true)
  }

  const abrirModalEditarCat = (cat: Categoria) => {
    setEditandoCat(cat)
    setFormCat({ nome: cat.nome, cozinhar: cat.cozinhar })
    setModalCat(true)
  }

  const fecharModalCat = () => {
    setModalCat(false)
    setEditandoCat(null)
    setFormCat({ nome: '', cozinhar: true })
  }

  const salvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoCat(true)
    try {
      if (editandoCat) {
        await api.put(`/categorias/${editandoCat.id}`, { nome: formCat.nome, ordem: editandoCat.ordem, cozinhar: formCat.cozinhar })
        toast.success('Categoria atualizada!')
      } else {
        await api.post('/categorias', { nome: formCat.nome, ordem: categorias.length + 1, cozinhar: formCat.cozinhar })
        toast.success('Categoria criada!')
      }
      fecharModalCat()
      await carregarCardapio()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSalvandoCat(false)
    }
  }

  const confirmarExcluirCategoria = async () => {
    if (modalExcluirCat === null) return
    const id = modalExcluirCat
    setModalExcluirCat(null)
    try {
      await api.delete(`/categorias/${id}`)
      toast.success('Categoria excluída.')
      await carregarCardapio()
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  // ── Item actions ────────────────────────────────────────────────
  const abrirModalNovoItem = (origem?: Categoria) => {
    setEditandoItemId(null)
    setItemModalOrigemCat(origem ?? null)
    const catId = origem ? String(origem.id) : (categorias.length > 0 ? String(categorias[0].id) : '')
    setFormItem({ nome: '', descricao: '', preco: '', categoriaId: catId, imagemUrl: '' })
    setModalItem(true)
  }

  const abrirModalEditarItem = (item: Item, origem?: Categoria) => {
    setEditandoItemId(item.id)
    setItemModalOrigemCat(origem ?? null)
    setFormItem({
      nome: item.nome,
      descricao: item.descricao,
      preco: item.preco.toFixed(2).replace('.', ','),
      categoriaId: String(item.categoriaId),
      imagemUrl: item.imagemUrl ?? '',
    })
    setModalItem(true)
  }

  const fecharModalItem = (voltarParaCategoria = true) => {
    setModalItem(false)
    setEditandoItemId(null)
    setFormItem({ nome: '', descricao: '', preco: '', categoriaId: '', imagemUrl: '' })
    if (voltarParaCategoria && itemModalOrigemCat) {
      setModalTodasCats(true)
      setCatSelecionadaModal(itemModalOrigemCat)
    }
    setItemModalOrigemCat(null)
  }

  const salvarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoItem(true)
    const payload = {
      categoriaId: Number(formItem.categoriaId),
      nome: formItem.nome,
      descricao: formItem.descricao,
      preco: parseFloat(formItem.preco.replace(',', '.')),
      imagemUrl: formItem.imagemUrl.trim() || null,
    }
    try {
      if (editandoItemId !== null) {
        await api.put(`/itens/${editandoItemId}`, payload)
        toast.success('Item atualizado!')
      } else {
        await api.post('/itens', payload)
        toast.success('Item adicionado ao cardápio!')
      }
      fecharModalItem()
      await carregarCardapio()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSalvandoItem(false)
    }
  }

  const toggleDisponivel = async (id: number) => {
    try {
      const { data } = await api.patch<Item>(`/itens/${id}/disponibilidade`)
      setItens(prev => prev.map(i => i.id === id ? { ...i, disponivel: data.disponivel } : i))
      toast.success(data.disponivel ? 'Item marcado como disponível.' : 'Item marcado como esgotado.')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  const deletarItem = async (id: number) => {
    if (!confirm('Remover este item?')) return
    try {
      await api.delete(`/itens/${id}`)
      setItens(prev => prev.filter(i => i.id !== id))
      toast.success('Item removido.')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  // ── Mesa actions ────────────────────────────────────────────────
  const criarMesa = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoMesa(true)
    try {
      await api.post('/mesas', { numero: Number(novoNumeroMesa) })
      setNovoNumeroMesa('')
      setModalMesa(false)
      toast.success('Mesa criada!')
      await carregarMesas()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setSalvandoMesa(false)
    }
  }

  const excluirMesa = (id: number) => {
    const mesa = mesas.find(m => m.id === id)
    if (mesa?.status === 1) {
      toast.error(`Mesa ${mesa.numero} está ocupada e não pode ser excluída.`)
      return
    }
    setModalExcluirMesa(id)
  }

  const confirmarExcluirMesa = async () => {
    if (modalExcluirMesa === null) return
    const id = modalExcluirMesa
    setModalExcluirMesa(null)
    try {
      await api.delete(`/mesas/${id}`)
      setMesas(prev => prev.filter(m => m.id !== id))
      toast.success('Mesa excluída.')
    } catch (err) {
      toast.error(extractError(err))
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#f7f9ff', fontFamily: 'Inter, sans-serif', color: '#191c20' }}>

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col p-4 gap-2 h-screen sticky top-0 w-64 flex-shrink-0" style={{ background: '#f2f3f9' }}>
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: '#b90014' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>restaurant</span>
          </div>
          <div>
            <h1 className="text-base font-black leading-tight" style={{ color: '#191c20' }}>Restaurante Digital</h1>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#926e6b' }}>Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {(['cardapio', 'mesas'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={tab === t
                ? { background: '#ffffff', color: '#b90014', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { color: '#5d3f3c' }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '1.25rem', fontVariationSettings: tab === t ? "'FILL' 1" : "'FILL' 0" }}>
                {t === 'cardapio' ? 'restaurant_menu' : 'table_restaurant'}
              </span>
              <span>{t === 'cardapio' ? 'Cardápio' : `Mesas (${mesas.length})`}</span>
            </button>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid #e6e8ee' }}>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ color: '#5d3f3c' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-6 md:px-8 h-16 flex-shrink-0"
          style={{ background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 #e6e8ee' }}>
          <div className="flex items-center gap-4">
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

          <div className="flex items-center gap-2">
            {/* Mobile tabs */}
            <div className="flex md:hidden gap-1">
              {(['cardapio', 'mesas'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={tab === t ? { background: '#b90014', color: '#fff' } : { background: '#f2f3f9', color: '#5d3f3c' }}>
                  {t === 'cardapio' ? 'Cardápio' : 'Mesas'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 py-8">
          <div className="max-w-5xl mx-auto space-y-10">

            {/* ══════════════ CARDÁPIO ══════════════ */}
            {tab === 'cardapio' && (
              <>
                {/* Section 1 — Categorias */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight">Categorias</h3>
                      <p className="text-xs font-medium mt-0.5" style={{ color: '#926e6b' }}>
                        {categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'} cadastradas
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirModalNovoItem()} disabled={categorias.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                        style={{ background: '#b90014' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                        Adicionar Item
                      </button>
                      <button onClick={abrirModalNovaCat}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: '#f2f3f9', color: '#5d3f3c', border: '1.5px dashed #d0d3df' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                        Nova Categoria
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(categorias.length >= 8 ? categorias.slice(0, 7) : categorias).map((cat, idx) => {
                      const palette = CAT_COLORS[idx % CAT_COLORS.length]
                      const icon = CAT_ICONS[idx % CAT_ICONS.length]
                      const count = itens.filter(i => i.categoriaId === cat.id).length
                      return (
                        <div key={cat.id}
                          onClick={() => { setModalTodasCats(true); setCatSelecionadaModal(cat) }}
                          className="p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition-all cursor-pointer"
                          style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                            style={{ background: palette.bg }}>
                            <span className="material-symbols-outlined" style={{ color: palette.color, fontSize: '1.5rem' }}>{icon}</span>
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
                            <button onClick={e => { e.stopPropagation(); abrirModalEditarCat(cat) }}
                              className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>edit</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); setModalExcluirCat(cat.id) }}
                              className="p-2 rounded-lg" style={{ background: '#fef2f2', color: '#b90014' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>delete</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {categorias.length >= 8 && (
                      <button onClick={() => { setModalTodasCats(true); setCatSelecionadaModal(null) }}
                        className="p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition-all"
                        style={{ background: '#f2f3f9', border: '2px dashed #d0d3df' }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{ background: '#e6e8ee' }}>
                          <span className="material-symbols-outlined" style={{ color: '#5d3f3c', fontSize: '1.5rem' }}>apps</span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: '#5d3f3c' }}>Ver todas</span>
                        <span className="text-[10px] uppercase tracking-tighter mt-1" style={{ color: '#926e6b' }}>
                          {categorias.length} categorias
                        </span>
                      </button>
                    )}
                    {categorias.length === 0 && (
                      <div className="col-span-4 flex flex-col items-center justify-center py-10 rounded-2xl"
                        style={{ background: '#ffffff', color: '#926e6b' }}>
                        <span className="material-symbols-outlined mb-2" style={{ fontSize: '2rem' }}>category</span>
                        <p className="text-sm">Nenhuma categoria criada ainda.</p>
                      </div>
                    )}
                  </div>
                </section>

              </>
            )}

            {/* ══════════════ MESAS ══════════════ */}
            {tab === 'mesas' && (
              <>
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight">Mesas do Salão</h3>
                      <p className="text-xs font-medium mt-0.5" style={{ color: '#926e6b' }}>
                        {mesas.filter(m => m.status === 1).length} ocupadas · {mesas.filter(m => m.status === 0).length} livres
                      </p>
                    </div>
                    <button onClick={() => setModalMesa(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                      style={{ background: '#b90014' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                      Nova Mesa
                    </button>
                  </div>

                  {mesas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                      style={{ background: '#ffffff', color: '#926e6b' }}>
                      <span className="material-symbols-outlined mb-3" style={{ fontSize: '3rem' }}>table_restaurant</span>
                      <p className="text-sm font-medium">Nenhuma mesa cadastrada.</p>
                      <button onClick={() => setModalMesa(true)}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: '#b90014' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                        Criar primeira mesa
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                      {mesas.sort((a, b) => a.numero - b.numero).map(m => (
                        <div key={m.id} className="rounded-2xl p-4 text-center"
                          style={{
                            background: '#ffffff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            borderTop: `3px solid ${m.status === 1 ? '#d97706' : '#16a34a'}`,
                          }}>
                          <div className="text-3xl font-black mb-1">{m.numero}</div>
                          <div className="text-xs font-semibold mb-3" style={{ color: m.status === 1 ? '#d97706' : '#16a34a' }}>
                            {m.status === 1 ? 'Ocupada' : 'Livre'}
                          </div>
                          <button onClick={() => excluirMesa(m.id)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-semibold"
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

      {/* ════════════════ MODAIS ════════════════ */}

      {/* Modal — Nova / Editar Categoria */}
      {modalCat && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) fecharModalCat() }}>
          <div className="bg-white rounded-2xl w-full max-w-md"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e6e8ee' }}>
              <div>
                <h3 className="text-base font-bold">{editandoCat ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#926e6b' }}>
                  {editandoCat ? `Editando: ${editandoCat.nome}` : 'Adicione um novo agrupamento'}
                </p>
              </div>
              <button onClick={fecharModalCat} className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
              </button>
            </div>

            <form onSubmit={salvarCategoria} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                  Nome da Categoria
                </label>
                <input autoFocus placeholder="Ex: Sobremesas, Vinhos..." value={formCat.nome}
                  onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))}
                  style={inputStyle} required />
              </div>
              <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer"
                style={{ background: '#f7f9ff', border: '1px solid #e6e8ee' }}>
                <input type="checkbox" checked={formCat.cozinhar}
                  onChange={e => setFormCat(f => ({ ...f, cozinhar: e.target.checked }))}
                  className="w-4 h-4 rounded" style={{ accentColor: '#b90014' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#191c20' }}>Preparado na cozinha</p>
                  <p className="text-xs" style={{ color: '#926e6b' }}>Itens desta categoria aparecem no KDS</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fecharModalCat}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ border: '1.5px solid #e6e8ee', color: '#5d3f3c' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoCat}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #b90014, #e31b23)', opacity: salvandoCat ? 0.6 : 1 }}>
                  {salvandoCat ? '...' : editandoCat ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Novo / Editar Item */}
      {modalItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) fecharModalItem() }}>
          <div className="bg-white rounded-2xl w-full max-w-lg"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e6e8ee' }}>
              <div className="flex items-center gap-3">
                {itemModalOrigemCat && (
                  <button onClick={() => fecharModalItem()} className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
                  </button>
                )}
                <div>
                  <h3 className="text-base font-bold">{editandoItemId !== null ? 'Editar Item' : 'Novo Item'}</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#926e6b' }}>
                    {itemModalOrigemCat ? itemModalOrigemCat.nome : (editandoItemId !== null ? 'Altere as informações do item' : 'Adicione um novo item ao cardápio')}
                  </p>
                </div>
              </div>
              <button onClick={() => fecharModalItem(false)} className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
              </button>
            </div>

            <form onSubmit={salvarItem} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                    Categoria
                  </label>
                  <select value={formItem.categoriaId}
                    onChange={e => setFormItem(f => ({ ...f, categoriaId: e.target.value }))}
                    style={inputStyle} required>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                    Preço (R$)
                  </label>
                  <input placeholder="0,00" value={formItem.preco}
                    onChange={e => setFormItem(f => ({ ...f, preco: e.target.value }))}
                    style={inputStyle} required />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                  Nome do Item
                </label>
                <input autoFocus={editandoItemId === null} placeholder="Ex: Burger Gourmet Classic" value={formItem.nome}
                  onChange={e => setFormItem(f => ({ ...f, nome: e.target.value }))}
                  style={inputStyle} required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                  Descrição
                </label>
                <textarea placeholder="Descreva os ingredientes e o preparo..." value={formItem.descricao}
                  onChange={e => setFormItem(f => ({ ...f, descricao: e.target.value }))}
                  rows={3} required style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                  Imagem
                </label>
                <div className="flex gap-3 items-center">
                  <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: '#f7f9ff', border: '1.5px dashed #d0d3df' }}>
                    <span className="material-symbols-outlined" style={{ color: '#926e6b', fontSize: '1.25rem' }}>
                      {uploadandoImagem ? 'hourglass_empty' : 'upload'}
                    </span>
                    <span className="text-sm" style={{ color: '#926e6b' }}>
                      {uploadandoImagem ? 'Enviando...' : formItem.imagemUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                    </span>
                    <input type="file" accept="image/*" className="hidden"
                      disabled={uploadandoImagem}
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadandoImagem(true)
                        try {
                          const fd = new FormData()
                          fd.append('file', file)
                          const { data } = await api.post<{ url: string }>('/upload', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          })
                          setFormItem(f => ({ ...f, imagemUrl: data.url }))
                        } catch (err) {
                          toast.error(extractError(err))
                        } finally {
                          setUploadandoImagem(false)
                          e.target.value = ''
                        }
                      }} />
                  </label>
                  {formItem.imagemUrl && (
                    <div className="relative flex-shrink-0">
                      <img src={formItem.imagemUrl} alt="preview"
                        className="w-16 h-16 rounded-xl object-cover"
                        style={{ border: '1px solid #e6e8ee' }} />
                      <button type="button"
                        onClick={() => setFormItem(f => ({ ...f, imagemUrl: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#b90014', color: '#fff' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => fecharModalItem()}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ border: '1.5px solid #e6e8ee', color: '#5d3f3c' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoItem}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #b90014, #e31b23)', opacity: salvandoItem ? 0.6 : 1 }}>
                  {salvandoItem ? '...' : editandoItemId !== null ? 'Salvar Alterações' : 'Adicionar ao Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Nova Mesa */}
      {modalMesa && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalMesa(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.15)' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e6e8ee' }}>
              <div>
                <h3 className="text-base font-bold">Nova Mesa</h3>
                <p className="text-xs mt-0.5" style={{ color: '#926e6b' }}>Adicione uma mesa ao salão</p>
              </div>
              <button onClick={() => setModalMesa(false)} className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
              </button>
            </div>
            <form onSubmit={criarMesa} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#926e6b' }}>
                  Número da Mesa
                </label>
                <input autoFocus type="number" placeholder="Ex: 12" value={novoNumeroMesa}
                  onChange={e => setNovoNumeroMesa(e.target.value)}
                  min={1} style={inputStyle} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalMesa(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ border: '1.5px solid #e6e8ee', color: '#5d3f3c' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoMesa}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #b90014, #e31b23)', opacity: salvandoMesa ? 0.6 : 1 }}>
                  {salvandoMesa ? '...' : 'Criar Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Excluir Mesa */}
      {modalExcluirMesa !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Excluir mesa?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalExcluirMesa(null)}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ border: '1.5px solid #e6e8ee', color: '#5d3f3c' }}>
                Cancelar
              </button>
              <button onClick={confirmarExcluirMesa}
                className="flex-1 py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Excluir Categoria */}
      {modalExcluirCat !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" style={{ boxShadow: '0 32px 64px rgba(185,0,20,0.12)' }}>
            <h3 className="text-lg font-bold mb-2 text-center">Excluir categoria?</h3>
            <p className="text-sm text-center mb-6" style={{ color: '#926e6b' }}>
              Os itens vinculados a esta categoria também serão removidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalExcluirCat(null)}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ border: '1.5px solid #e6e8ee', color: '#5d3f3c' }}>
                Cancelar
              </button>
              <button onClick={confirmarExcluirCategoria}
                className="flex-1 py-3 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #b90014, #d4001a)' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Todas as Categorias */}
      {modalTodasCats && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setModalTodasCats(false); setCatSelecionadaModal(null) } }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: '85vh', boxShadow: '0 32px 64px rgba(0,0,0,0.15)' }}>

            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #e6e8ee' }}>
              {catSelecionadaModal ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setCatSelecionadaModal(null)}
                    className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
                  </button>
                  <div>
                    <h3 className="text-base font-bold">{catSelecionadaModal.nome}</h3>
                    <p className="text-xs" style={{ color: '#926e6b' }}>
                      {itens.filter(i => i.categoriaId === catSelecionadaModal.id).length} itens
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base font-bold">Todas as Categorias</h3>
                  <p className="text-xs" style={{ color: '#926e6b' }}>{categorias.length} categorias cadastradas</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                {catSelecionadaModal && (
                  <button onClick={() => { setModalTodasCats(false); abrirModalNovoItem(catSelecionadaModal) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#b90014' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                    Adicionar Item
                  </button>
                )}
                <button onClick={() => { setModalTodasCats(false); setCatSelecionadaModal(null) }}
                  className="p-2 rounded-lg" style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {!catSelecionadaModal ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {categorias.map((cat, idx) => {
                    const palette = CAT_COLORS[idx % CAT_COLORS.length]
                    const icon = CAT_ICONS[idx % CAT_ICONS.length]
                    const count = itens.filter(i => i.categoriaId === cat.id).length
                    return (
                      <button key={cat.id}
                        onClick={() => setCatSelecionadaModal(cat)}
                        className="p-4 rounded-2xl flex flex-col items-center justify-center text-center group transition-all w-full"
                        style={{ background: '#f7f9ff', border: '1px solid #e6e8ee' }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{ background: palette.bg }}>
                          <span className="material-symbols-outlined" style={{ color: palette.color, fontSize: '1.5rem' }}>{icon}</span>
                        </div>
                        <span className="font-bold text-sm">{cat.nome}</span>
                        <span className="text-[10px] uppercase tracking-tighter mt-1" style={{ color: '#926e6b' }}>
                          {count} {count === 1 ? 'Item' : 'Itens'}
                        </span>
                        {cat.cozinhar && (
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full"
                            style={{ background: '#fef2f2', color: '#b90014' }}>KDS</span>
                        )}
                        <div className="flex items-center gap-1 mt-2" style={{ color: '#b90014' }}>
                          <span className="text-xs font-semibold">Ver itens</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>chevron_right</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (() => {
                const catIdx = categorias.findIndex(c => c.id === catSelecionadaModal.id)
                const palette = CAT_COLORS[catIdx % CAT_COLORS.length]
                const catItens = itens.filter(i => i.categoriaId === catSelecionadaModal.id)
                return (
                  <div className="space-y-3">
                    {catItens.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
                        style={{ background: '#f7f9ff', color: '#926e6b' }}>
                        <span className="material-symbols-outlined mb-2" style={{ fontSize: '2rem' }}>inventory_2</span>
                        <p className="text-sm">Nenhum item nesta categoria.</p>
                      </div>
                    ) : (
                      catItens.map(item => (
                        <div key={item.id}
                          className="flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-2xl group transition-all"
                          style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center gap-5 mb-4 lg:mb-0">
                            <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                              style={{ background: palette.bg }}>
                              {item.imagemUrl
                                ? <img src={item.imagemUrl} alt={item.nome} className="w-full h-full object-cover" />
                                : <span className="material-symbols-outlined" style={{ color: palette.color, fontSize: '1.75rem' }}>{CAT_ICONS[catIdx % CAT_ICONS.length]}</span>
                              }
                            </div>
                            <div>
                              <h5 className={`text-base font-bold ${!item.disponivel ? 'line-through' : ''}`}
                                style={{ color: item.disponivel ? '#191c20' : '#926e6b' }}>
                                {item.nome}
                              </h5>
                              {item.descricao && (
                                <p className="text-sm mt-0.5 max-w-md" style={{ color: '#926e6b' }}>{item.descricao}</p>
                              )}
                              <span className="text-base font-black mt-1 block" style={{ color: '#b90014' }}>
                                R$ {item.preco.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 justify-between lg:justify-end">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#926e6b' }}>
                                {item.disponivel ? 'Disponível' : 'Esgotado'}
                              </span>
                              <button onClick={() => toggleDisponivel(item.id)}
                                className="relative inline-flex items-center"
                                style={{ width: '2.75rem', height: '1.5rem' }}
                                aria-label="Toggle disponibilidade">
                                <span className="block w-full h-full rounded-full transition-colors"
                                  style={{ background: item.disponivel ? '#428057' : '#d8dae0' }} />
                                <span className="absolute top-0.5 transition-transform"
                                  style={{
                                    left: item.disponivel ? 'calc(100% - 1.25rem - 2px)' : '2px',
                                    width: '1.25rem', height: '1.25rem',
                                    background: '#ffffff', borderRadius: '9999px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setModalTodasCats(false)
                                  abrirModalEditarItem(item, catSelecionadaModal ?? undefined)
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                                style={{ background: '#f2f3f9', color: '#5d3f3c' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                              </button>
                              <button onClick={() => deletarItem(item.id)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                                style={{ background: '#fef2f2', color: '#b90014' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
