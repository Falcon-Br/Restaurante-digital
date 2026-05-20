using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Modules.Cardapio.Models;
using RestauranteDigital.Api.Modules.Mesas.Models;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Data;

public static class DemoDataSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedMesasAsync(db);
        await SeedCardapioAsync(db);
        await db.SaveChangesAsync();

        await SeedPedidosAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task SeedMesasAsync(AppDbContext db)
    {
        for (var numero = 1; numero <= 8; numero++)
        {
            if (!await db.Mesas.AnyAsync(m => m.Numero == numero))
            {
                db.Mesas.Add(new Mesa { Numero = numero });
            }
        }
    }

    private static async Task SeedCardapioAsync(AppDbContext db)
    {
        var categorias = new[]
        {
            new CategoriaSeed("Entradas", 1, true, new[]
            {
                new ItemSeed("Bruschetta da casa", "Tomate marinado, manjericao e azeite sobre pao artesanal.", 24.90m, "/demo-images/bruschetta-da-casa.jpg"),
                new ItemSeed("Bolinho de queijo", "Porcao crocante com molho de pimenta suave.", 29.90m, "/demo-images/bolinhos-de-queijo.jpg"),
                new ItemSeed("Salada fresca", "Folhas, legumes grelhados e vinagrete de ervas.", 27.90m, "/demo-images/salada-fresca.jpg", false),
            }),
            new CategoriaSeed("Pratos principais", 2, true, new[]
            {
                new ItemSeed("Risoto de cogumelos", "Arroz arboreo, mix de cogumelos e parmesao.", 54.90m, "/demo-images/risoto-de-cogumelos.jpg"),
                new ItemSeed("Burger artesanal", "Blend bovino, queijo, cebola caramelizada e batata rustica.", 42.90m, "/demo-images/burger-artesanal.jpg"),
                new ItemSeed("Frango grelhado", "File de frango, pure de batata e legumes.", 39.90m, "/demo-images/frango-grelhado.jpg"),
                new ItemSeed("Massa ao pesto", "Talharim fresco com pesto de manjericao e castanhas.", 46.90m, "/demo-images/massa-ao-pesto.jpg"),
            }),
            new CategoriaSeed("Bebidas", 3, false, new[]
            {
                new ItemSeed("Suco natural", "Laranja, limao ou abacaxi com hortela.", 12.90m, "/demo-images/suco-natural.jpg", false),
                new ItemSeed("Refrigerante", "Lata 350 ml.", 8.90m, "/demo-images/refrigerante.jpg", false),
                new ItemSeed("Agua com gas", "Garrafa 500 ml.", 6.90m, "/demo-images/agua-com-gas.jpg", false),
            }),
            new CategoriaSeed("Sobremesas", 4, true, new[]
            {
                new ItemSeed("Pudim classico", "Pudim de leite com calda de caramelo.", 18.90m, "/demo-images/pudim-classico.jpg"),
                new ItemSeed("Brownie com sorvete", "Brownie quente com sorvete de creme.", 24.90m, "/demo-images/brownie-com-sorvete.jpg"),
            }),
        };

        foreach (var categoriaSeed in categorias)
        {
            var categoria = await db.Categorias
                .Include(c => c.Itens)
                .FirstOrDefaultAsync(c => c.Nome == categoriaSeed.Nome);

            if (categoria is null)
            {
                categoria = new Categoria
                {
                    Nome = categoriaSeed.Nome,
                    Ordem = categoriaSeed.Ordem,
                    Cozinhar = categoriaSeed.Cozinhar,
                };
                db.Categorias.Add(categoria);
            }
            else
            {
                categoria.Ordem = categoriaSeed.Ordem;
                categoria.Cozinhar = categoriaSeed.Cozinhar;
            }

            foreach (var itemSeed in categoriaSeed.Itens)
            {
                var item = categoria.Itens.FirstOrDefault(i => i.Nome == itemSeed.Nome);
                if (item is null)
                {
                    categoria.Itens.Add(new Item
                    {
                        Nome = itemSeed.Nome,
                        Descricao = itemSeed.Descricao,
                        Preco = itemSeed.Preco,
                        ImagemUrl = itemSeed.ImagemUrl,
                        Disponivel = itemSeed.Disponivel,
                    });
                    continue;
                }

                item.Descricao = itemSeed.Descricao;
                item.Preco = itemSeed.Preco;
                item.ImagemUrl = itemSeed.ImagemUrl;
            }
        }
    }

    private static async Task SeedPedidosAsync(AppDbContext db)
    {
        if (await db.Comandas.AnyAsync(c => c.Nome.StartsWith("Demo - "))) return;

        var mesas = await db.Mesas.OrderBy(m => m.Numero).ToListAsync();
        var itens = await db.Itens.Include(i => i.Categoria).ToListAsync();

        Item Item(string nome) => itens.First(i => i.Nome == nome);
        Mesa Mesa(int numero) => mesas.First(m => m.Numero == numero);

        var agora = DateTime.UtcNow;

        var mesa1 = Mesa(1);
        var mesa2 = Mesa(2);
        var mesa3 = Mesa(3);
        var mesa4 = Mesa(4);
        var mesa5 = Mesa(5);

        mesa1.Status = MesaStatus.Ocupada;
        mesa2.Status = MesaStatus.Ocupada;
        mesa4.Status = MesaStatus.Ocupada;

        AddPedidoAberto(db, mesa1, "Demo - Mesa 1", agora.AddMinutes(-18), new[]
        {
            new PedidoItemSeed(Item("Risoto de cogumelos"), 2, "Sem cebola", PedidoItemStatus.EmPreparo, 0),
            new PedidoItemSeed(Item("Suco natural"), 2, null, PedidoItemStatus.Entregue, 0),
        });

        AddPedidoAberto(db, mesa2, "Demo - Mesa 2", agora.AddMinutes(-9), new[]
        {
            new PedidoItemSeed(Item("Burger artesanal"), 1, "Carne ao ponto", PedidoItemStatus.Pendente, 0),
            new PedidoItemSeed(Item("Bolinho de queijo"), 1, null, PedidoItemStatus.Pendente, 0),
        });

        AddPedidoAberto(db, mesa4, "Demo - Ana", agora.AddMinutes(-4), new[]
        {
            new PedidoItemSeed(Item("Massa ao pesto"), 1, null, PedidoItemStatus.Pendente, 0),
            new PedidoItemSeed(Item("Agua com gas"), 1, null, PedidoItemStatus.Entregue, 0),
        });

        AddPedidoFechado(db, mesa3, "Demo - Mesa 3", agora.AddDays(-1).AddHours(-2), new[]
        {
            new PedidoItemSeed(Item("Frango grelhado"), 2, null, PedidoItemStatus.Pronto, 0),
            new PedidoItemSeed(Item("Pudim classico"), 2, null, PedidoItemStatus.Pronto, 5),
            new PedidoItemSeed(Item("Refrigerante"), 2, null, PedidoItemStatus.Entregue, 0),
        });

        AddPedidoFechado(db, mesa5, "Demo - Mesa 5", agora.AddDays(-2).AddHours(-1), new[]
        {
            new PedidoItemSeed(Item("Bruschetta da casa"), 1, null, PedidoItemStatus.Pronto, 0),
            new PedidoItemSeed(Item("Brownie com sorvete"), 1, "Uma colher extra", PedidoItemStatus.Pronto, 5),
            new PedidoItemSeed(Item("Suco natural"), 1, null, PedidoItemStatus.Entregue, 0),
        });
    }

    private static void AddPedidoAberto(AppDbContext db, Mesa mesa, string comandaNome, DateTime criadoEm, PedidoItemSeed[] itens)
    {
        var comanda = new Comanda
        {
            Mesa = mesa,
            Nome = comandaNome,
            Status = ComandaStatus.Aberta,
            CriadaEm = criadoEm,
        };

        db.Comandas.Add(comanda);
        db.Pedidos.Add(new Pedido
        {
            Mesa = mesa,
            Comanda = comanda,
            Status = PedidoStatus.Aberto,
            CriadoEm = criadoEm,
            Itens = itens.Select(item => ToPedidoItem(item, criadoEm)).ToList(),
        });
    }

    private static void AddPedidoFechado(AppDbContext db, Mesa mesa, string comandaNome, DateTime criadoEm, PedidoItemSeed[] itens)
    {
        var total = itens.Sum(i => i.Item.Preco * i.Quantidade);
        var comanda = new Comanda
        {
            Mesa = mesa,
            Nome = comandaNome,
            Status = ComandaStatus.Fechada,
            CriadaEm = criadoEm,
            TotalFinal = total,
        };

        db.Comandas.Add(comanda);
        db.Pedidos.Add(new Pedido
        {
            Mesa = mesa,
            Comanda = comanda,
            Status = PedidoStatus.Fechado,
            CriadoEm = criadoEm,
            TotalFinal = total,
            Itens = itens.Select(item => ToPedidoItem(item, criadoEm)).ToList(),
        });
    }

    private static PedidoItem ToPedidoItem(PedidoItemSeed seed, DateTime pedidoCriadoEm)
    {
        var criadoEm = pedidoCriadoEm.AddMinutes(seed.MinutosOffset);
        return new PedidoItem
        {
            Item = seed.Item,
            Quantidade = seed.Quantidade,
            Observacao = seed.Observacao,
            Status = seed.Status,
            CriadoEm = criadoEm,
            ConcluidoEm = seed.Status == PedidoItemStatus.Pronto ? criadoEm.AddMinutes(14) : null,
        };
    }

    private sealed record CategoriaSeed(string Nome, int Ordem, bool Cozinhar, ItemSeed[] Itens);
    private sealed record ItemSeed(string Nome, string Descricao, decimal Preco, string ImagemUrl, bool Disponivel = true);
    private sealed record PedidoItemSeed(Item Item, int Quantidade, string? Observacao, PedidoItemStatus Status, int MinutosOffset);
}
