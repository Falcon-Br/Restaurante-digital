using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.DTOs;

public record PedidoItemRequest(int ItemId, int Quantidade, string? Observacao);

public record CriarPedidoRequest(string MesaToken, int? ComandaId, List<PedidoItemRequest> Itens);

public record PedidoItemResponse(
    int Id, int ItemId, string ItemNome, decimal ItemPreco,
    int Quantidade, string? Observacao, PedidoItemStatus Status, DateTime CriadoEm);

public record PedidoResponse(
    int Id, int MesaId, int MesaNumero, PedidoStatus Status,
    DateTime CriadoEm, decimal? TotalFinal, List<PedidoItemResponse> Itens);
