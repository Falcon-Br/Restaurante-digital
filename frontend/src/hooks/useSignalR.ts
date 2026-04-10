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
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })

  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/restaurante', {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    connection.on('NovoPedido', (...args: [number, number, string[]]) => handlersRef.current.onNovoPedido?.(...args))
    connection.on('StatusAtualizado', (...args: [number, string]) => handlersRef.current.onStatusAtualizado?.(...args))
    connection.on('ItemEsgotado', (...args: [number, string]) => handlersRef.current.onItemEsgotado?.(...args))
    connection.on('ItemDisponivel', (...args: [number, string]) => handlersRef.current.onItemDisponivel?.(...args))
    connection.on('PedidoFechado', (...args: [number]) => handlersRef.current.onPedidoFechado?.(...args))
    connection.on('PedidoCancelado', (...args: [number]) => handlersRef.current.onPedidoCancelado?.(...args))

    connection.start().catch(console.error)
    connectionRef.current = connection

    return () => { connection.stop() }
  }, [])
}
