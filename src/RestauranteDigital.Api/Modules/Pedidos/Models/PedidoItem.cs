using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.Models;

public enum PedidoItemStatus { Pendente, EmPreparo, Pronto }

public class PedidoItem
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public Pedido Pedido { get; set; } = null!;
    public int ItemId { get; set; }
    public Item Item { get; set; } = null!;
    public int Quantidade { get; set; }
    public string? Observacao { get; set; }
    public PedidoItemStatus Status { get; set; } = PedidoItemStatus.Pendente;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ConcluidoEm { get; set; }
}
