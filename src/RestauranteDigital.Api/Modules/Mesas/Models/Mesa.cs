namespace RestauranteDigital.Api.Modules.Mesas.Models;

public enum MesaStatus { Livre, Ocupada }

public class Mesa
{
    public Mesa()
    {
        QrCodeToken = Guid.NewGuid().ToString();
    }

    public int Id { get; set; }
    public int Numero { get; set; }
    public string QrCodeToken { get; set; }
    public MesaStatus Status { get; set; } = MesaStatus.Livre;
}
