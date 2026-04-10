namespace RestauranteDigital.Api.Modules.Cardapio.DTOs;

public record ItemRequest(int CategoriaId, string Nome, string Descricao, decimal Preco, string? ImagemUrl);
public record ItemResponse(int Id, int CategoriaId, string CategoriaNome, string Nome, string Descricao, decimal Preco, string? ImagemUrl, bool Disponivel);
