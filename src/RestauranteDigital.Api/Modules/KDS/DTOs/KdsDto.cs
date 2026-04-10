using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.KDS.DTOs;

public record KdsPedidoItemResponse(
    int PedidoItemId, int PedidoId, int MesaNumero,
    int ItemId, string ItemNome, int Quantidade, string? Observacao,
    PedidoItemStatus Status, DateTime CriadoEm, int MinutosEspera);

public record KdsFilaResponse(
    List<KdsPedidoItemResponse> Itens, double TempoMedioMinutos);

public record AtualizarStatusRequest(PedidoItemStatus NovoStatus);
