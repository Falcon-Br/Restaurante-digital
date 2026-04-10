import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

type EventHandlers = {
  onNovoPedido?: (pedidoId: number, mesaNumero: number, itens: string[]) => void
  onStatusAtualizado?: (pedidoItemId: number, novoStatus: string) => void
  onItemEsgotado?: (itemId: number, itemNome: string) => void
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

    connection.start().catch(console.error)
    connectionRef.current = connection

    return () => { connection.stop() }
  }, [])
}
