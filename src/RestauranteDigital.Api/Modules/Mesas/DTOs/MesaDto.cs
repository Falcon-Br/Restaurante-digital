using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Mesas.DTOs;

public record MesaRequest(int Numero);
public record MesaResponse(int Id, int Numero, string QrCodeToken, MesaStatus Status, string QrCodeUrl);
