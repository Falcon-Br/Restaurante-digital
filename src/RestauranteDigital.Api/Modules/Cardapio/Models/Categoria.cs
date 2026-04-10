namespace RestauranteDigital.Api.Modules.Cardapio.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int Ordem { get; set; }
    public ICollection<Item> Itens { get; set; } = [];
}
