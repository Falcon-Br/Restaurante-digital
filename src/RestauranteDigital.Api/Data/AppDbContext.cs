using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Modules.Auth.Models;
using RestauranteDigital.Api.Modules.Cardapio.Models;
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Item> Itens => Set<Item>();
    public DbSet<Mesa> Mesas => Set<Mesa>();

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
    }
}
