using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.Models;

public enum PedidoStatus { Aberto, Fechado }

public class Pedido
{
    public int Id { get; set; }
    public int MesaId { get; set; }
    public Mesa Mesa { get; set; } = null!;
    public string? GarcomId { get; set; }
    public PedidoStatus Status { get; set; } = PedidoStatus.Aberto;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public decimal? TotalFinal { get; set; }
    public ICollection<PedidoItem> Itens { get; set; } = [];
}
