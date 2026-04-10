using Microsoft.AspNetCore.SignalR;

namespace RestauranteDigital.Api.Hubs;

public class RestauranteHub : Hub
{
    // Eventos emitidos pelo servidor para clientes:
    // NovoPedido(int pedidoId, int mesaNumero, string[] itens)
    // StatusAtualizado(int pedidoItemId, string novoStatus)
    // ItemEsgotado(int itemId, string itemNome)
}
