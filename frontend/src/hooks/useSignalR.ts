import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

type EventHandlers = {
  onNovoPedido?: (pedidoId: number, mesaNumero: number, itens: string[]) => void
  onStatusAtualizado?: (pedidoItemId: number, novoStatus: string) => void
  onItemEsgotado?: (itemId: number, itemNome: string) => void
  onItemDisponivel?: (itemId: number, itemNome: string) => void
  onPedidoFechado?: (pedidoId: number) => void
  onPedidoCancelado?: (pedidoId: number) => void
}

export function useSignalR(handlers: EventHandlers) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/restaurante', {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    if (handlers.onNovoPedido)
      connection.on('NovoPedido', handlers.onNovoPedido)
    if (handlers.onStatusAtualizado)
      connection.on('StatusAtualizado', handlers.onStatusAtualizado)
    if (handlers.onItemEsgotado)
      connection.on('ItemEsgotado', handlers.onItemEsgotado)
    if (handlers.onItemDisponivel)
      connection.on('ItemDisponivel', handlers.onItemDisponivel)
    if (handlers.onPedidoFechado)
      connection.on('PedidoFechado', handlers.onPedidoFechado)
    if (handlers.onPedidoCancelado)
      connection.on('PedidoCancelado', handlers.onPedidoCancelado)

    connection.start().catch(console.error)
    connectionRef.current = connection

    return () => { connection.stop() }
  }, [])
}
