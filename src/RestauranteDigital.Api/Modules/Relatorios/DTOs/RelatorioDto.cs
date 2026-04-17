namespace RestauranteDigital.Api.Modules.Relatorios.DTOs;

public record ResumoVendasResponse(
    DateTime De,
    DateTime Ate,
    int TotalPedidos,
    decimal TotalFaturado,
    double TempoMedioMinutos,
    List<ItemMaisVendido> ItensMaisVendidos);

public record ItemMaisVendido(
    int ItemId,
    string ItemNome,
    int QuantidadeTotal,
    decimal TotalGerado);

public record PedidoResumo(
    int Id,
    int MesaNumero,
    DateTime CriadoEm,
    decimal? TotalFinal,
    string Status,
    int NumeroItens);

public record ComandaResumo(
    int Id,
    int MesaId,
    int MesaNumero,
    string Nome,
    DateTime CriadaEm,
    decimal? TotalFinal);
