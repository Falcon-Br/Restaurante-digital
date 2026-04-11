using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.Mesas.Models;

public enum ComandaStatus { Aberta, Fechada }

public class Comanda
{
    public int Id { get; set; }
    public int MesaId { get; set; }
    public Mesa Mesa { get; set; } = null!;
    public string Nome { get; set; } = "Geral";
    public ComandaStatus Status { get; set; } = ComandaStatus.Aberta;
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    public decimal? TotalFinal { get; set; }
    public ICollection<Pedido> Pedidos { get; set; } = [];
}
