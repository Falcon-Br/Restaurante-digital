using RestauranteDigital.Api.Modules.Mesas.Models;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;

namespace RestauranteDigital.Api.Modules.Mesas.DTOs;

public record CriarComandaRequest(string Nome);

public record ComandaResponse(
    int Id,
    int MesaId,
    string Nome,
    ComandaStatus Status,
    DateTime CriadaEm,
    decimal? TotalFinal,
    List<PedidoResponse> Pedidos);
