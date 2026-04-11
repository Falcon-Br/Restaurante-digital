namespace RestauranteDigital.Api.Modules.Cardapio.DTOs;

public record CategoriaRequest(string Nome, int Ordem, bool Cozinhar = true);
public record CategoriaResponse(int Id, string Nome, int Ordem, bool Cozinhar);
