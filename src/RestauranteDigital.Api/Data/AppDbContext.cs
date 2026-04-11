using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Modules.Auth.Models;
using RestauranteDigital.Api.Modules.Cardapio.Models;
using RestauranteDigital.Api.Modules.Mesas.Models;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Item> Itens => Set<Item>();
    public DbSet<Mesa> Mesas => Set<Mesa>();
    public DbSet<Comanda> Comandas => Set<Comanda>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<PedidoItem> PedidoItens => Set<PedidoItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Item>()
            .Property(i => i.Preco)
            .HasPrecision(10, 2);

        builder.Entity<Mesa>()
            .HasIndex(m => m.QrCodeToken)
            .IsUnique();

        builder.Entity<Mesa>()
            .HasIndex(m => m.Numero)
            .IsUnique();

        builder.Entity<Pedido>()
            .Property(p => p.TotalFinal)
            .HasPrecision(10, 2);

        builder.Entity<Comanda>()
            .Property(c => c.TotalFinal)
            .HasPrecision(10, 2);
    }
}
