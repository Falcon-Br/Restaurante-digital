namespace RestauranteDigital.Api.Modules.Mesas.Models;

public enum MesaStatus { Livre, Ocupada }

public class Mesa
{
    public int Id { get; set; }
    public int Numero { get; set; }
    public string QrCodeToken { get; set; } = Guid.NewGuid().ToString();
    public MesaStatus Status { get; set; } = MesaStatus.Livre;
}
