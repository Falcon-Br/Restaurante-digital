export interface LoginResponse {
  token: string
  nome: string
  email: string
  role: string
}

export interface Categoria {
  id: number
  nome: string
  ordem: number
  cozinhar: boolean
}

export interface Item {
  id: number
  categoriaId: number
  categoriaNome: string
  nome: string
  descricao: string
  preco: number
  imagemUrl: string | null
  disponivel: boolean
}

export interface Mesa {
  id: number
  numero: number
  qrCodeToken: string
  status: 0 | 1
  qrCodeUrl: string
}

export type PedidoItemStatus = 'Pendente' | 'EmPreparo' | 'Pronto'
export type PedidoStatus = 'Aberto' | 'Fechado'

export interface PedidoItem {
  id: number
  itemId: number
  itemNome: string
  itemPreco: number
  quantidade: number
  observacao: string | null
  status: PedidoItemStatus
  criadoEm: string
}

export interface Pedido {
  id: number
  mesaId: number
  mesaNumero: number
  status: PedidoStatus
  criadoEm: string
  totalFinal: number | null
  itens: PedidoItem[]
}

export interface KdsPedidoItem {
  pedidoItemId: number
  pedidoId: number
  mesaNumero: number
  itemId: number
  itemNome: string
  quantidade: number
  observacao: string | null
  status: PedidoItemStatus
  criadoEm: string
  minutosEspera: number
}

export interface KdsFilaResponse {
  itens: KdsPedidoItem[]
  tempoMedioMinutos: number
}

export interface ItemMaisVendido {
  itemId: number
  itemNome: string
  quantidadeTotal: number
  totalGerado: number
}

export interface ResumoVendasResponse {
  de: string
  ate: string
  totalPedidos: number
  totalFaturado: number
  tempoMedioMinutos: number
  itensMaisVendidos: ItemMaisVendido[]
}

export interface PedidoResumo {
  id: number
  mesaNumero: number
  criadoEm: string
  totalFinal: number | null
  status: string
  numeroItens: number
}
