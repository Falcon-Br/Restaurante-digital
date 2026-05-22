import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import type { Categoria, Item, Mesa } from '../../api/types'
import { MenuPage } from './MenuPage'

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('../../hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}))

const categorias: Categoria[] = [
  { id: 1, nome: 'Entradas', ordem: 1, cozinhar: true },
  { id: 2, nome: 'Bebidas', ordem: 2, cozinhar: false },
]

const itens: Item[] = [
  {
    id: 10,
    categoriaId: 1,
    categoriaNome: 'Entradas',
    nome: 'Bruschetta',
    descricao: 'Tomate marinado',
    preco: 24.9,
    imagemUrl: '/demo-images/bruschetta-da-casa.jpg',
    disponivel: true,
  },
  {
    id: 20,
    categoriaId: 2,
    categoriaNome: 'Bebidas',
    nome: 'Suco natural',
    descricao: 'Laranja',
    preco: 12.9,
    imagemUrl: '/demo-images/suco-natural.jpg',
    disponivel: true,
  },
]

const mesa: Mesa = {
  id: 1,
  numero: 5,
  qrCodeToken: 'mesa-token',
  status: 0,
  qrCodeUrl: 'http://localhost:5173/menu/mesa-token',
}

function setupApiMocks(customItens: Item[] = itens) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/categorias') return Promise.resolve({ data: categorias })
    if (url === '/itens') return Promise.resolve({ data: customItens })
    if (url === '/kds/fila') return Promise.resolve({ data: { tempoMedioMinutos: 12, itens: [] } })
    if (url === '/mesas/token/mesa-token') return Promise.resolve({ data: mesa })
    return Promise.reject(new Error(`Unmocked GET: ${url}`))
  })
  vi.mocked(api.post).mockResolvedValue({ data: {} })
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/menu/mesa-token']}>
      <Routes>
        <Route path="/menu/:token" element={<MenuPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MenuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupApiMocks()
  })

  it('carrega a mesa e exibe os itens da primeira categoria', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Mesa 5')).toBeInTheDocument())
    expect(screen.getByText('Bruschetta')).toBeInTheDocument()
    expect(screen.queryByText('Suco natural')).not.toBeInTheDocument()
  })

  it('troca de categoria ao clicar no botão da categoria', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bruschetta')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }))

    expect(screen.getByText('Suco natural')).toBeInTheDocument()
    expect(screen.queryByText('Bruschetta')).not.toBeInTheDocument()
  })

  it('nao abre modal para item indisponivel', async () => {
    setupApiMocks([{ ...itens[0], disponivel: false }])
    renderPage()
    await waitFor(() => expect(screen.getByText('Bruschetta')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Bruschetta'))

    expect(screen.queryByText('Observação (opcional)')).not.toBeInTheDocument()
  })
  it('mantem o modal de adicionar acima da revisao quando ja existe item no carrinho', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Bruschetta')).toBeInTheDocument())

    await user.click(screen.getByText('Bruschetta'))
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(screen.getByRole('button', { name: /Revisar/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bebidas' }))
    await user.click(screen.getByText('Suco natural'))

    const modalInput = screen.getByPlaceholderText('ex: sem cebola')
    expect(modalInput.closest('.modal-backdrop')).toHaveClass('z-[60]')
  })
})
