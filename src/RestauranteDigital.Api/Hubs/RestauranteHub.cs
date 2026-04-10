using Microsoft.AspNetCore.SignalR;

namespace RestauranteDigital.Api.Hubs;

public class RestauranteHub : Hub
{
    // Eventos emitidos pelo servidor para clientes:
    // NovoPedido(int pedidoId, int mesaNumero, string[] itens)
    // StatusAtualizado(int pedidoItemId, string novoStatus)
    // ItemEsgotado(int itemId, string itemNome)
    // ItemDisponivel(int itemId, string itemNome)
    // PedidoFechado(int pedidoId)
    // PedidoCancelado(int pedidoId)
}
