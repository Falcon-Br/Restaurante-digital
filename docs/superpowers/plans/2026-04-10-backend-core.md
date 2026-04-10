# Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação do backend .NET 10 com PostgreSQL, ASP.NET Core Identity, JWT e os módulos Cardápio e Mesas.

**Architecture:** Monólito modular — única Web API ASP.NET Core com estrutura de pastas por feature. Cada módulo contém seus próprios models, DTOs, services e controllers. EF Core com PostgreSQL via Npgsql.

**Tech Stack:** .NET 10, ASP.NET Core Web API, EF Core 9, Npgsql, ASP.NET Core Identity, JWT Bearer, QRCoder, xUnit, WebApplicationFactory

---

## Estrutura de Arquivos

```
RestauranteDigital/
├── RestauranteDigital.sln
├── src/
│   └── RestauranteDigital.Api/
│       ├── Data/
│       │   └── AppDbContext.cs
│       ├── Modules/
│       │   ├── Auth/
│       │   │   ├── Models/ApplicationUser.cs
│       │   │   ├── DTOs/LoginRequest.cs
│       │   │   ├── DTOs/LoginResponse.cs
│       │   │   ├── Services/TokenService.cs
│       │   │   └── Controllers/AuthController.cs
│       │   ├── Cardapio/
│       │   │   ├── Models/Categoria.cs
│       │   │   ├── Models/Item.cs
│       │   │   ├── DTOs/CategoriaDto.cs
│       │   │   ├── DTOs/ItemDto.cs
│       │   │   └── Controllers/CategoriasController.cs
│       │   │   └── Controllers/ItensController.cs
│       │   └── Mesas/
│       │       ├── Models/Mesa.cs
│       │       ├── DTOs/MesaDto.cs
│       │       └── Controllers/MesasController.cs
│       ├── Program.cs
│       ├── appsettings.json
│       └── appsettings.Development.json
└── tests/
    └── RestauranteDigital.Tests/
        ├── TestBase.cs
        ├── Auth/AuthControllerTests.cs
        ├── Cardapio/ItensControllerTests.cs
        └── Mesas/MesasControllerTests.cs
```

---

### Task 1: Criar estrutura da solução

**Files:**
- Create: `RestauranteDigital.sln`
- Create: `src/RestauranteDigital.Api/RestauranteDigital.Api.csproj`
- Create: `tests/RestauranteDigital.Tests/RestauranteDigital.Tests.csproj`

- [ ] **Step 1: Criar solução e projetos**

```bash
cd "D:/Projetos Pessoais/Restaurante digital"
dotnet new sln -n RestauranteDigital
dotnet new webapi -n RestauranteDigital.Api --use-controllers -o src/RestauranteDigital.Api
dotnet new xunit -n RestauranteDigital.Tests -o tests/RestauranteDigital.Tests
dotnet sln add src/RestauranteDigital.Api/RestauranteDigital.Api.csproj
dotnet sln add tests/RestauranteDigital.Tests/RestauranteDigital.Tests.csproj
dotnet add tests/RestauranteDigital.Tests/RestauranteDigital.Tests.csproj reference src/RestauranteDigital.Api/RestauranteDigital.Api.csproj
```

- [ ] **Step 2: Adicionar pacotes ao projeto API**

```bash
cd src/RestauranteDigital.Api
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 9.*
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.*
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 9.*
dotnet add package QRCoder --version 1.6.*
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 9.*
```

- [ ] **Step 3: Adicionar pacotes ao projeto de testes**

```bash
cd ../../tests/RestauranteDigital.Tests
dotnet add package Microsoft.AspNetCore.Mvc.Testing --version 9.*
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.*
dotnet add package FluentAssertions --version 6.*
```

- [ ] **Step 4: Remover arquivos template desnecessários**

```bash
cd ../../src/RestauranteDigital.Api
rm -f Controllers/WeatherForecastController.cs WeatherForecast.cs
```

- [ ] **Step 5: Verificar build**

```bash
cd "D:/Projetos Pessoais/Restaurante digital"
dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: solução inicial com projetos API e testes"
```

---

### Task 2: Criar entidades de domínio

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Auth/Models/ApplicationUser.cs`
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/Models/Categoria.cs`
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/Models/Item.cs`
- Create: `src/RestauranteDigital.Api/Modules/Mesas/Models/Mesa.cs`

- [ ] **Step 1: Criar ApplicationUser**

`src/RestauranteDigital.Api/Modules/Auth/Models/ApplicationUser.cs`
```csharp
using Microsoft.AspNetCore.Identity;

namespace RestauranteDigital.Api.Modules.Auth.Models;

public class ApplicationUser : IdentityUser
{
    public string Nome { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Criar Categoria**

`src/RestauranteDigital.Api/Modules/Cardapio/Models/Categoria.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Cardapio.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int Ordem { get; set; }
    public ICollection<Item> Itens { get; set; } = [];
}
```

- [ ] **Step 3: Criar Item**

`src/RestauranteDigital.Api/Modules/Cardapio/Models/Item.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Cardapio.Models;

public class Item
{
    public int Id { get; set; }
    public int CategoriaId { get; set; }
    public Categoria Categoria { get; set; } = null!;
    public string Nome { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Preco { get; set; }
    public string? ImagemUrl { get; set; }
    public bool Disponivel { get; set; } = true;
}
```

- [ ] **Step 4: Criar Mesa**

`src/RestauranteDigital.Api/Modules/Mesas/Models/Mesa.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Mesas.Models;

public enum MesaStatus { Livre, Ocupada }

public class Mesa
{
    public int Id { get; set; }
    public int Numero { get; set; }
    public string QrCodeToken { get; set; } = Guid.NewGuid().ToString();
    public MesaStatus Status { get; set; } = MesaStatus.Livre;
}
```

- [ ] **Step 5: Build para verificar sem erros**

```bash
dotnet build src/RestauranteDigital.Api
```
Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: entidades de domínio (ApplicationUser, Categoria, Item, Mesa)"
```

---

### Task 3: Configurar AppDbContext e migration inicial

**Files:**
- Create: `src/RestauranteDigital.Api/Data/AppDbContext.cs`
- Modify: `src/RestauranteDigital.Api/Program.cs`
- Modify: `src/RestauranteDigital.Api/appsettings.Development.json`

- [ ] **Step 1: Criar AppDbContext**

`src/RestauranteDigital.Api/Data/AppDbContext.cs`
```csharp
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
```

- [ ] **Step 2: Atualizar appsettings.Development.json**

`src/RestauranteDigital.Api/appsettings.Development.json`
```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=restaurante_digital;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "dev-secret-key-must-be-at-least-32-chars!!",
    "Issuer": "RestauranteDigital",
    "Audience": "RestauranteDigital"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

- [ ] **Step 3: Atualizar appsettings.json**

`src/RestauranteDigital.Api/appsettings.json`
```json
{
  "ConnectionStrings": {
    "Default": ""
  },
  "Jwt": {
    "Secret": "",
    "Issuer": "RestauranteDigital",
    "Audience": "RestauranteDigital"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 4: Registrar DbContext no Program.cs**

`src/RestauranteDigital.Api/Program.cs`
```csharp
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
```

- [ ] **Step 5: Criar migration inicial**

Certifique-se que PostgreSQL está rodando localmente, depois:
```bash
cd src/RestauranteDigital.Api
dotnet ef migrations add InitialCreate --output-dir Data/Migrations
dotnet ef database update
```
Expected: `Done.`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: AppDbContext com Identity e migration inicial"
```

---

### Task 4: Configurar Identity e JWT

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Auth/Services/TokenService.cs`
- Create: `src/RestauranteDigital.Api/Modules/Auth/DTOs/LoginRequest.cs`
- Create: `src/RestauranteDigital.Api/Modules/Auth/DTOs/LoginResponse.cs`
- Create: `src/RestauranteDigital.Api/Modules/Auth/DTOs/RegisterRequest.cs`
- Modify: `src/RestauranteDigital.Api/Program.cs`

- [ ] **Step 1: Criar DTOs de Auth**

`src/RestauranteDigital.Api/Modules/Auth/DTOs/LoginRequest.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Auth.DTOs;

public record LoginRequest(string Email, string Password);
```

`src/RestauranteDigital.Api/Modules/Auth/DTOs/RegisterRequest.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Auth.DTOs;

public record RegisterRequest(string Nome, string Email, string Password, string Role);
```

`src/RestauranteDigital.Api/Modules/Auth/DTOs/LoginResponse.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Auth.DTOs;

public record LoginResponse(string Token, string Nome, string Email, string Role);
```

- [ ] **Step 2: Criar TokenService**

`src/RestauranteDigital.Api/Modules/Auth/Services/TokenService.cs`
```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using RestauranteDigital.Api.Modules.Auth.Models;

namespace RestauranteDigital.Api.Modules.Auth.Services;

public class TokenService(IConfiguration config)
{
    public string GenerateToken(ApplicationUser user, IList<string> roles)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.Nome),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 3: Registrar Identity e JWT no Program.cs**

`src/RestauranteDigital.Api/Program.cs`
```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Auth.Models;
using RestauranteDigital.Api.Modules.Auth.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

// Services
builder.Services.AddScoped<TokenService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
```

- [ ] **Step 4: Build para verificar**

```bash
dotnet build src/RestauranteDigital.Api
```
Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: Identity e JWT configurados"
```

---

### Task 5: Criar AuthController com login e registro

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Auth/Controllers/AuthController.cs`
- Create: `tests/RestauranteDigital.Tests/TestBase.cs`
- Create: `tests/RestauranteDigital.Tests/Auth/AuthControllerTests.cs`

- [ ] **Step 1: Escrever testes de AuthController**

`tests/RestauranteDigital.Tests/TestBase.cs`
```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RestauranteDigital.Api.Data;

namespace RestauranteDigital.Tests;

public class TestBase : IDisposable
{
    protected readonly HttpClient Client;
    private readonly WebApplicationFactory<Program> _factory;

    public TestBase()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Testing");
                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (descriptor != null) services.Remove(descriptor);

                    services.AddDbContext<AppDbContext>(options =>
                        options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));
                });
            });

        Client = _factory.CreateClient();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
    }

    public void Dispose() => _factory.Dispose();
}
```

`tests/RestauranteDigital.Tests/Auth/AuthControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;

namespace RestauranteDigital.Tests.Auth;

public class AuthControllerTests : TestBase
{
    [Fact]
    public async Task Register_WithValidData_Returns200WithToken()
    {
        var request = new RegisterRequest("João Silva", "joao@test.com", "senha123", "Garcom");

        var response = await Client.PostAsJsonAsync("/api/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        result!.Token.Should().NotBeNullOrEmpty();
        result.Role.Should().Be("Garcom");
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithToken()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Maria", "maria@test.com", "senha123", "Admin"));

        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("maria@test.com", "senha123"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        result!.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Carlos", "carlos@test.com", "senha123", "Cozinha"));

        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("carlos@test.com", "senhaerrada"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
cd "D:/Projetos Pessoais/Restaurante digital"
dotnet test tests/RestauranteDigital.Tests --filter "AuthControllerTests"
```
Expected: FAIL — `AuthController` não existe ainda.

- [ ] **Step 3: Criar AuthController**

`src/RestauranteDigital.Api/Modules/Auth/Controllers/AuthController.cs`
```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Auth.Models;
using RestauranteDigital.Api.Modules.Auth.Services;

namespace RestauranteDigital.Api.Modules.Auth.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    TokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var validRoles = new[] { "Garcom", "Cozinha", "Admin", "Gerente" };
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { message = "Role inválido." });

        var user = new ApplicationUser
        {
            Nome = request.Nome,
            UserName = request.Email,
            Email = request.Email
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        await userManager.AddToRoleAsync(user, request.Role);

        var token = tokenService.GenerateToken(user, [request.Role]);
        return Ok(new LoginResponse(token, user.Nome, user.Email!, request.Role));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null) return Unauthorized();

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var token = tokenService.GenerateToken(user, roles);
        return Ok(new LoginResponse(token, user.Nome, user.Email!, roles.FirstOrDefault() ?? ""));
    }
}
```

- [ ] **Step 4: Adicionar seed de roles na inicialização**

Adicione ao final do `Program.cs`, antes de `app.Run()`:
```csharp
// Seed roles
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Garcom", "Cozinha", "Admin", "Gerente" })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }
}
```

- [ ] **Step 5: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "AuthControllerTests" -v normal
```
Expected: `Passed: 3, Failed: 0`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: AuthController com registro e login JWT"
```

---

### Task 6: Módulo Cardápio — Categorias e Itens

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/DTOs/CategoriaDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/DTOs/ItemDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/Controllers/CategoriasController.cs`
- Create: `src/RestauranteDigital.Api/Modules/Cardapio/Controllers/ItensController.cs`
- Create: `tests/RestauranteDigital.Tests/Cardapio/ItensControllerTests.cs`

- [ ] **Step 1: Criar DTOs de Cardápio**

`src/RestauranteDigital.Api/Modules/Cardapio/DTOs/CategoriaDto.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Cardapio.DTOs;

public record CategoriaRequest(string Nome, int Ordem);
public record CategoriaResponse(int Id, string Nome, int Ordem);
```

`src/RestauranteDigital.Api/Modules/Cardapio/DTOs/ItemDto.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Cardapio.DTOs;

public record ItemRequest(int CategoriaId, string Nome, string Descricao, decimal Preco, string? ImagemUrl);
public record ItemResponse(int Id, int CategoriaId, string CategoriaNome, string Nome, string Descricao, decimal Preco, string? ImagemUrl, bool Disponivel);
```

- [ ] **Step 2: Escrever testes para itens**

`tests/RestauranteDigital.Tests/Cardapio/ItensControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;

namespace RestauranteDigital.Tests.Cardapio;

public class ItensControllerTests : TestBase
{
    private async Task AuthAsAdmin()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin", "admin@test.com", "senha123", "Admin"));
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@test.com", "senha123"));
        var loginData = await loginResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", loginData!.Token);
    }

    [Fact]
    public async Task GetItens_PublicEndpoint_Returns200()
    {
        var response = await Client.GetAsync("/api/itens");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateItem_AsAdmin_Returns201()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var catResp = await Client.GetAsync("/api/categorias");
        var cats = await catResp.Content.ReadFromJsonAsync<List<CategoriaResponse>>();

        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cats![0].Id, "X-Burguer", "Pão, carne 180g, queijo", 28.00m, null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateItem_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(1, "X-Burguer", "Pão, carne 180g, queijo", 28.00m, null));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ToggleDisponibilidade_AsAdmin_UpdatesItem()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var catResp = await Client.GetAsync("/api/categorias");
        var cats = await catResp.Content.ReadFromJsonAsync<List<CategoriaResponse>>();
        var createResp = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cats![0].Id, "X-Bacon", "Pão, carne, bacon", 34.00m, null));
        var item = await createResp.Content.ReadFromJsonAsync<ItemResponse>();

        var toggleResp = await Client.PatchAsync($"/api/itens/{item!.Id}/disponibilidade", null);

        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await toggleResp.Content.ReadFromJsonAsync<ItemResponse>();
        updated!.Disponivel.Should().BeFalse();
    }
}
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "ItensControllerTests"
```
Expected: FAIL

- [ ] **Step 4: Criar CategoriasController**

`src/RestauranteDigital.Api/Modules/Cardapio/Controllers/CategoriasController.cs`
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Cardapio.Controllers;

[ApiController]
[Route("api/categorias")]
public class CategoriasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cats = await db.Categorias
            .OrderBy(c => c.Ordem)
            .Select(c => new CategoriaResponse(c.Id, c.Nome, c.Ordem))
            .ToListAsync();
        return Ok(cats);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CategoriaRequest request)
    {
        var cat = new Categoria { Nome = request.Nome, Ordem = request.Ordem };
        db.Categorias.Add(cat);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new CategoriaResponse(cat.Id, cat.Nome, cat.Ordem));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, CategoriaRequest request)
    {
        var cat = await db.Categorias.FindAsync(id);
        if (cat is null) return NotFound();
        cat.Nome = request.Nome;
        cat.Ordem = request.Ordem;
        await db.SaveChangesAsync();
        return Ok(new CategoriaResponse(cat.Id, cat.Nome, cat.Ordem));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var cat = await db.Categorias.FindAsync(id);
        if (cat is null) return NotFound();
        db.Categorias.Remove(cat);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 5: Criar ItensController**

`src/RestauranteDigital.Api/Modules/Cardapio/Controllers/ItensController.cs`
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Cardapio.Controllers;

[ApiController]
[Route("api/itens")]
public class ItensController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? categoriaId)
    {
        var query = db.Itens.Include(i => i.Categoria).AsQueryable();
        if (categoriaId.HasValue)
            query = query.Where(i => i.CategoriaId == categoriaId.Value);

        var itens = await query
            .OrderBy(i => i.Categoria.Ordem).ThenBy(i => i.Nome)
            .Select(i => new ItemResponse(
                i.Id, i.CategoriaId, i.Categoria.Nome,
                i.Nome, i.Descricao, i.Preco, i.ImagemUrl, i.Disponivel))
            .ToListAsync();
        return Ok(itens);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(ItemRequest request)
    {
        var cat = await db.Categorias.FindAsync(request.CategoriaId);
        if (cat is null) return BadRequest(new { message = "Categoria não encontrada." });

        var item = new Item
        {
            CategoriaId = request.CategoriaId,
            Nome = request.Nome,
            Descricao = request.Descricao,
            Preco = request.Preco,
            ImagemUrl = request.ImagemUrl
        };
        db.Itens.Add(item);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll),
            new ItemResponse(item.Id, item.CategoriaId, cat.Nome,
                item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, ItemRequest request)
    {
        var item = await db.Itens.Include(i => i.Categoria).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();

        item.CategoriaId = request.CategoriaId;
        item.Nome = request.Nome;
        item.Descricao = request.Descricao;
        item.Preco = request.Preco;
        item.ImagemUrl = request.ImagemUrl;
        await db.SaveChangesAsync();

        return Ok(new ItemResponse(item.Id, item.CategoriaId, item.Categoria.Nome,
            item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpPatch("{id}/disponibilidade")]
    [Authorize(Roles = "Admin,Cozinha")]
    public async Task<IActionResult> ToggleDisponibilidade(int id)
    {
        var item = await db.Itens.Include(i => i.Categoria).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();

        item.Disponivel = !item.Disponivel;
        await db.SaveChangesAsync();

        return Ok(new ItemResponse(item.Id, item.CategoriaId, item.Categoria.Nome,
            item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Itens.FindAsync(id);
        if (item is null) return NotFound();
        db.Itens.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 6: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "ItensControllerTests" -v normal
```
Expected: `Passed: 4, Failed: 0`

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: módulo Cardápio com Categorias e Itens CRUD"
```

---

### Task 7: Módulo Mesas com QR Code

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Mesas/DTOs/MesaDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/Mesas/Controllers/MesasController.cs`
- Create: `tests/RestauranteDigital.Tests/Mesas/MesasControllerTests.cs`

- [ ] **Step 1: Criar DTOs de Mesas**

`src/RestauranteDigital.Api/Modules/Mesas/DTOs/MesaDto.cs`
```csharp
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Mesas.DTOs;

public record MesaRequest(int Numero);
public record MesaResponse(int Id, int Numero, string QrCodeToken, MesaStatus Status, string QrCodeUrl);
```

- [ ] **Step 2: Escrever testes de Mesas**

`tests/RestauranteDigital.Tests/Mesas/MesasControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Tests.Mesas;

public class MesasControllerTests : TestBase
{
    private async Task AuthAsAdmin()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin", "admin@mesa.com", "senha123", "Admin"));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@mesa.com", "senha123"));
        var data = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", data!.Token);
    }

    [Fact]
    public async Task CreateMesa_AsAdmin_Returns201WithQrToken()
    {
        await AuthAsAdmin();
        var response = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(5));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var mesa = await response.Content.ReadFromJsonAsync<MesaResponse>();
        mesa!.Numero.Should().Be(5);
        mesa.QrCodeToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetCardapioByToken_ValidToken_Returns200()
    {
        await AuthAsAdmin();
        var createResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(1));
        var mesa = await createResp.Content.ReadFromJsonAsync<MesaResponse>();

        Client.DefaultRequestHeaders.Authorization = null;
        var response = await Client.GetAsync($"/api/mesas/token/{mesa!.QrCodeToken}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MesaResponse>();
        result!.Status.Should().Be(MesaStatus.Livre);
    }

    [Fact]
    public async Task GetCardapioByToken_InvalidToken_Returns404()
    {
        var response = await Client.GetAsync("/api/mesas/token/token-invalido-xyz");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "MesasControllerTests"
```
Expected: FAIL

- [ ] **Step 4: Criar MesasController**

`src/RestauranteDigital.Api/Modules/Mesas/Controllers/MesasController.cs`
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QRCoder;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Mesas.Controllers;

[ApiController]
[Route("api/mesas")]
public class MesasController(AppDbContext db, IConfiguration config) : ControllerBase
{
    private string GetMenuUrl(string token)
    {
        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:5173";
        return $"{baseUrl}/menu/{token}";
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Garcom,Gerente")]
    public async Task<IActionResult> GetAll()
    {
        var mesas = await db.Mesas
            .OrderBy(m => m.Numero)
            .Select(m => new MesaResponse(m.Id, m.Numero, m.QrCodeToken, m.Status, GetMenuUrl(m.QrCodeToken)))
            .ToListAsync();
        return Ok(mesas);
    }

    [HttpGet("token/{token}")]
    public async Task<IActionResult> GetByToken(string token)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == token);
        if (mesa is null) return NotFound();
        return Ok(new MesaResponse(mesa.Id, mesa.Numero, mesa.QrCodeToken, mesa.Status, GetMenuUrl(mesa.QrCodeToken)));
    }

    [HttpGet("{id}/qrcode")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetQrCode(int id)
    {
        var mesa = await db.Mesas.FindAsync(id);
        if (mesa is null) return NotFound();

        var url = GetMenuUrl(mesa.QrCodeToken);
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var bytes = qrCode.GetGraphic(20);

        return File(bytes, "image/png", $"mesa-{mesa.Numero}-qr.png");
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(MesaRequest request)
    {
        if (await db.Mesas.AnyAsync(m => m.Numero == request.Numero))
            return BadRequest(new { message = $"Mesa {request.Numero} já existe." });

        var mesa = new Mesa { Numero = request.Numero };
        db.Mesas.Add(mesa);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll),
            new MesaResponse(mesa.Id, mesa.Numero, mesa.QrCodeToken, mesa.Status, GetMenuUrl(mesa.QrCodeToken)));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var mesa = await db.Mesas.FindAsync(id);
        if (mesa is null) return NotFound();
        db.Mesas.Remove(mesa);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 5: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "MesasControllerTests" -v normal
```
Expected: `Passed: 3, Failed: 0`

- [ ] **Step 6: Rodar todos os testes**

```bash
dotnet test tests/RestauranteDigital.Tests -v normal
```
Expected: todos passando.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: módulo Mesas com geração de QR Code"
```

---

### Task 8: Configurar CORS e testar API manualmente

**Files:**
- Modify: `src/RestauranteDigital.Api/Program.cs`

- [ ] **Step 1: Adicionar CORS ao Program.cs**

Adicione no bloco de serviços do `Program.cs`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                builder.Configuration["App:FrontendUrl"] ?? "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
```

Adicione após `app.UseHttpsRedirection()`:
```csharp
app.UseCors();
```

- [ ] **Step 2: Adicionar App:BaseUrl ao appsettings.Development.json**

```json
{
  "App": {
    "BaseUrl": "http://localhost:5000",
    "FrontendUrl": "http://localhost:5173"
  },
  ...
}
```

- [ ] **Step 3: Iniciar API e testar Swagger**

```bash
cd src/RestauranteDigital.Api
dotnet run
```
Abrir `http://localhost:5000/swagger` no browser.
Expected: Swagger UI com todos os endpoints listados.

- [ ] **Step 4: Commit final do Plano 1**

```bash
git add .
git commit -m "feat: CORS configurado — Backend Core completo"
```
