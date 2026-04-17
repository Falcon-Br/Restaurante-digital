import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GerentePage } from './GerentePage'
import { api } from '../../api/client'
import type { ResumoVendasResponse, PedidoResumo, ComandaResumo } from '../../api/types'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ logout: vi.fn() })),
}))

vi.mock('../../hooks/useSignalR', () => ({
  useSignalR: vi.fn(),
}))

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockResumo: ResumoVendasResponse = {
  de: '2026-04-10',
  ate: '2026-04-17',
  totalPedidos: 5,
  totalFaturado: 250.00,
  tempoMedioMinutos: 12,
  itensMaisVendidos: [
    { itemId: 1, itemNome: 'X-Burguer', quantidadeTotal: 10, totalGerado: 259.00 },
    { itemId: 2, itemNome: 'Suco de Laranja', quantidadeTotal: 6, totalGerado: 48.00 },
  ],
}

const mockPedidos: PedidoResumo[] = [
  { id: 1, mesaNumero: 3, criadoEm: '2026-04-17T12:00:00Z', totalFinal: 56.00, status: 'Fechado', numeroItens: 2 },
  { id: 2, mesaNumero: 5, criadoEm: '2026-04-17T14:00:00Z', totalFinal: 32.00, status: 'Fechado', numeroItens: 1 },
]

const mockComandas: ComandaResumo[] = [
  { id: 10, mesaId: 1, mesaNumero: 3, nome: 'Mesa 3 - João', criadaEm: '2026-04-17T12:00:00Z', totalFinal: 56.00 },
  { id: 11, mesaId: 2, mesaNumero: 5, nome: 'Mesa 5 - Maria', criadaEm: '2026-04-17T14:00:00Z', totalFinal: 32.00 },
]

function setupMocks() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/relatorios/resumo')) return Promise.resolve({ data: mockResumo })
    if (url.includes('/relatorios/pedidos')) return Promise.resolve({ data: mockPedidos })
    if (url.includes('/relatorios/comandas')) return Promise.resolve({ data: mockComandas })
    return Promise.reject(new Error(`Unmocked GET: ${url}`))
  })
}

async function renderPage() {
  render(<GerentePage />)
  await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GerentePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renderiza a aba Relatórios por padrão com KPI cards', async () => {
    await renderPage()
    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // totalPedidos
    expect(screen.getAllByText(/R\$ 250,00/).length).toBeGreaterThan(0) // faturamento
    expect(screen.getByText('12min')).toBeInTheDocument() // tempo médio
  })

  it('exibe itens mais vendidos na aba Relatórios', async () => {
    await renderPage()
    expect(screen.getByText('X-Burguer')).toBeInTheDocument()
    expect(screen.getByText('Suco de Laranja')).toBeInTheDocument()
  })

  it('exibe pedidos fechados na aba Relatórios', async () => {
    await renderPage()
    expect(screen.getByText('Mesa 3')).toBeInTheDocument()
    expect(screen.getByText('Mesa 5')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('não exibe a seção de comandas na aba Relatórios', async () => {
    await renderPage()
    expect(screen.queryByText('Comandas fechadas')).not.toBeInTheDocument()
  })

  it('troca para aba Comandas ao clicar no nav item da sidebar', async () => {
    await renderPage()
    const user = userEvent.setup()

    const navComandas = screen.getAllByRole('button', { name: /Comandas/i })[0]
    await user.click(navComandas)

    expect(screen.getByText('Histórico de Comandas')).toBeInTheDocument()
    expect(screen.getByText('Comandas fechadas')).toBeInTheDocument()
  })

  it('exibe comandas fechadas na aba Comandas', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /Comandas/i })[0])

    expect(screen.getByText('Mesa 3 - João')).toBeInTheDocument()
    expect(screen.getByText('Mesa 5 - Maria')).toBeInTheDocument()
  })

  it('exibe contador de comandas no período', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /Comandas/i })[0])

    expect(screen.getByText('2 no período')).toBeInTheDocument()
  })

  it('aba Comandas não exibe KPI cards', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /Comandas/i })[0])

    expect(screen.queryByText('Total Pedidos')).not.toBeInTheDocument()
  })

  it('botão Filtrar recarrega os dados', async () => {
    await renderPage()
    const user = userEvent.setup()

    const filtrar = screen.getByRole('button', { name: /Filtrar/i })
    await user.click(filtrar)

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledTimes(6) // 3 iniciais + 3 do refiltro
    })
  })

  it('exibe mensagem vazia quando não há comandas', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/relatorios/resumo')) return Promise.resolve({ data: mockResumo })
      if (url.includes('/relatorios/pedidos')) return Promise.resolve({ data: mockPedidos })
      if (url.includes('/relatorios/comandas')) return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unmocked GET: ${url}`))
    })

    render(<GerentePage />)
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /Comandas/i })[0])

    expect(screen.getByText('Nenhuma comanda fechada no período.')).toBeInTheDocument()
  })

  it('volta para aba Relatórios ao clicar no nav item', async () => {
    await renderPage()
    const user = userEvent.setup()

    await user.click(screen.getAllByRole('button', { name: /Comandas/i })[0])
    await user.click(screen.getAllByRole('button', { name: /Relatórios/i })[0])

    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
    expect(screen.queryByText('Histórico de Comandas')).not.toBeInTheDocument()
  })
})
