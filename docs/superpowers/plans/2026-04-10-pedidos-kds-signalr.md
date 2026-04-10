# Pedidos, KDS & SignalR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo completo de pedidos, o hub SignalR para tempo real e o módulo KDS com estimativa de tempo.

**Architecture:** Módulos `Pedidos` e `KDS` adicionados ao monólito existente. SignalR hub único em `/hubs/restaurante` emite três eventos: `NovoPedido`, `StatusAtualizado`, `ItemEsgotado`. KDS calcula tempo médio baseado nos últimos 20 itens concluídos.

**Tech Stack:** ASP.NET Core SignalR, EF Core 9, .NET 10 — extensão do backend do Plano 1.

**Pré-requisito:** Plano 1 (Backend Core) concluído.

---

## Estrutura de Arquivos

```
src/RestauranteDigital.Api/
├── Hubs/
│   └── RestauranteHub.cs
├── Modules/
│   ├── Pedidos/
│   │   ├── Models/
│   │   │   ├── Pedido.cs
│   │   │   └── PedidoItem.cs
│   │   ├── DTOs/
│   │   │   ├── PedidoDto.cs
│   │   │   └── PedidoItemDto.cs
│   │   └── Controllers/
│   │       └── PedidosController.cs
│   └── KDS/
│       ├── DTOs/
│       │   └── KdsDto.cs
│       └── Controllers/
│           └── KdsController.cs
tests/RestauranteDigital.Tests/
├── Pedidos/
│   └── PedidosControllerTests.cs
└── KDS/
    └── KdsControllerTests.cs
```

---

### Task 1: Criar entidades Pedido e PedidoItem

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Pedidos/Models/Pedido.cs`
- Create: `src/RestauranteDigital.Api/Modules/Pedidos/Models/PedidoItem.cs`
- Modify: `src/RestauranteDigital.Api/Data/AppDbContext.cs`

- [ ] **Step 1: Criar Pedido**

`src/RestauranteDigital.Api/Modules/Pedidos/Models/Pedido.cs`
```csharp
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.Models;

public enum PedidoStatus { Aberto, Fechado }

public class Pedido
{
    public int Id { get; set; }
    public int MesaId { get; set; }
    public Mesa Mesa { get; set; } = null!;
    public string? GarcomId { get; set; }
    public PedidoStatus Status { get; set; } = PedidoStatus.Aberto;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public decimal? TotalFinal { get; set; }
    public ICollection<PedidoItem> Itens { get; set; } = [];
}
```

- [ ] **Step 2: Criar PedidoItem**

`src/RestauranteDigital.Api/Modules/Pedidos/Models/PedidoItem.cs`
```csharp
using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.Models;

public enum PedidoItemStatus { Pendente, EmPreparo, Pronto }

public class PedidoItem
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public Pedido Pedido { get; set; } = null!;
    public int ItemId { get; set; }
    public Item Item { get; set; } = null!;
    public int Quantidade { get; set; }
    public string? Observacao { get; set; }
    public PedidoItemStatus Status { get; set; } = PedidoItemStatus.Pendente;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? ConcluidoEm { get; set; }
}
```

- [ ] **Step 3: Adicionar DbSets ao AppDbContext**

Adicione ao `src/RestauranteDigital.Api/Data/AppDbContext.cs`, após os DbSets existentes:
```csharp
using RestauranteDigital.Api.Modules.Pedidos.Models;

// dentro da classe AppDbContext:
public DbSet<Pedido> Pedidos => Set<Pedido>();
public DbSet<PedidoItem> PedidoItens => Set<PedidoItem>();
```

- [ ] **Step 4: Criar migration**

```bash
cd src/RestauranteDigital.Api
dotnet ef migrations add AddPedidos --output-dir Data/Migrations
dotnet ef database update
```
Expected: `Done.`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: entidades Pedido e PedidoItem com migration"
```

---

### Task 2: Configurar SignalR Hub

**Files:**
- Create: `src/RestauranteDigital.Api/Hubs/RestauranteHub.cs`
- Modify: `src/RestauranteDigital.Api/Program.cs`

- [ ] **Step 1: Criar RestauranteHub**

`src/RestauranteDigital.Api/Hubs/RestauranteHub.cs`
```csharp
using Microsoft.AspNetCore.SignalR;

namespace RestauranteDigital.Api.Hubs;

public class RestauranteHub : Hub
{
    // Eventos emitidos pelo servidor para clientes:
    // NovoPedido(int pedidoId, int mesaNumero, string[] itens)
    // StatusAtualizado(int pedidoItemId, string novoStatus)
    // ItemEsgotado(int itemId, string itemNome)
}
```

- [ ] **Step 2: Registrar SignalR no Program.cs**

Adicione no bloco de serviços do `Program.cs`:
```csharp
builder.Services.AddSignalR();
```

Adicione após `app.MapControllers()`:
```csharp
using RestauranteDigital.Api.Hubs;
app.MapHub<RestauranteHub>("/hubs/restaurante");
```

- [ ] **Step 3: Ajustar CORS para SignalR**

Atualize a política CORS no `Program.cs` para incluir `AllowCredentials` (já deve estar, verificar):
```csharp
policy.WithOrigins(
        builder.Configuration["App:FrontendUrl"] ?? "http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials(); // obrigatório para SignalR
```

- [ ] **Step 4: Build**

```bash
dotnet build src/RestauranteDigital.Api
```
Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: SignalR hub configurado em /hubs/restaurante"
```

---

### Task 3: Módulo Pedidos — criação e consulta

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Pedidos/DTOs/PedidoDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/Pedidos/Controllers/PedidosController.cs`
- Create: `tests/RestauranteDigital.Tests/Pedidos/PedidosControllerTests.cs`

- [ ] **Step 1: Criar DTOs de Pedidos**

`src/RestauranteDigital.Api/Modules/Pedidos/DTOs/PedidoDto.cs`
```csharp
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.DTOs;

public record PedidoItemRequest(int ItemId, int Quantidade, string? Observacao);

public record CriarPedidoRequest(string MesaToken, List<PedidoItemRequest> Itens);

public record PedidoItemResponse(
    int Id, int ItemId, string ItemNome, decimal ItemPreco,
    int Quantidade, string? Observacao, PedidoItemStatus Status, DateTime CriadoEm);

public record PedidoResponse(
    int Id, int MesaId, int MesaNumero, PedidoStatus Status,
    DateTime CriadoEm, decimal? TotalFinal, List<PedidoItemResponse> Itens);
```

- [ ] **Step 2: Escrever testes de Pedidos**

`tests/RestauranteDigital.Tests/Pedidos/PedidosControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Tests.Pedidos;

public class PedidosControllerTests : TestBase
{
    private async Task<string> AuthAsAdmin()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin", "admin@pedido.com", "senha123", "Admin"));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@pedido.com", "senha123"));
        var data = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        return data!.Token;
    }

    private async Task<(string mesaToken, int itemId)> SeedData(string adminToken)
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);

        var catResp = await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var cat = await catResp.Content.ReadFromJsonAsync<CategoriaResponse>();
        var itemResp = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cat!.Id, "X-Burguer", "Pão e carne", 28.00m, null));
        var item = await itemResp.Content.ReadFromJsonAsync<ItemResponse>();

        var mesaResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(1));
        var mesa = await mesaResp.Content.ReadFromJsonAsync<MesaResponse>();

        Client.DefaultRequestHeaders.Authorization = null;
        return (mesa!.QrCodeToken, item!.Id);
    }

    [Fact]
    public async Task CriarPedido_ClienteComTokenValido_Returns201()
    {
        var token = await AuthAsAdmin();
        var (mesaToken, itemId) = await SeedData(token);

        var response = await Client.PostAsJsonAsync("/api/pedidos", new CriarPedidoRequest(
            mesaToken, [new PedidoItemRequest(itemId, 2, "Sem cebola")]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var pedido = await response.Content.ReadFromJsonAsync<PedidoResponse>();
        pedido!.Itens.Should().HaveCount(1);
        pedido.Itens[0].Observacao.Should().Be("Sem cebola");
    }

    [Fact]
    public async Task CriarPedido_TokenMesaInvalido_Returns404()
    {
        var response = await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest("token-invalido", [new PedidoItemRequest(1, 1, null)]));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPedidosByMesa_ComoGarcom_Returns200()
    {
        var adminToken = await AuthAsAdmin();
        var (mesaToken, itemId) = await SeedData(adminToken);

        await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest(mesaToken, [new PedidoItemRequest(itemId, 1, null)]));

        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Garcom", "garcom@test.com", "senha123", "Garcom"));
        var garcomResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("garcom@test.com", "senha123"));
        var garcomData = await garcomResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", garcomData!.Token);

        var mesa = await (await Client.GetAsync($"/api/mesas/token/{mesaToken}"))
            .Content.ReadFromJsonAsync<MesaResponse>();
        var response = await Client.GetAsync($"/api/pedidos?mesaId={mesa!.Id}&status=Aberto");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pedidos = await response.Content.ReadFromJsonAsync<List<PedidoResponse>>();
        pedidos.Should().HaveCount(1);
    }
}
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "PedidosControllerTests"
```
Expected: FAIL

- [ ] **Step 4: Criar PedidosController**

`src/RestauranteDigital.Api/Modules/Pedidos/Controllers/PedidosController.cs`
```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.Pedidos.Controllers;

[ApiController]
[Route("api/pedidos")]
public class PedidosController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Garcom,Admin,Gerente")]
    public async Task<IActionResult> GetAll([FromQuery] int? mesaId, [FromQuery] string? status)
    {
        var query = db.Pedidos
            .Include(p => p.Mesa)
            .Include(p => p.Itens).ThenInclude(i => i.Item)
            .AsQueryable();

        if (mesaId.HasValue) query = query.Where(p => p.MesaId == mesaId.Value);
        if (Enum.TryParse<PedidoStatus>(status, out var s)) query = query.Where(p => p.Status == s);

        var pedidos = await query.OrderByDescending(p => p.CriadoEm).ToListAsync();
        return Ok(pedidos.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarPedidoRequest request)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == request.MesaToken);
        if (mesa is null) return NotFound(new { message = "Mesa não encontrada." });

        var itemIds = request.Itens.Select(i => i.ItemId).ToList();
        var itensDb = await db.Itens.Where(i => itemIds.Contains(i.Id) && i.Disponivel).ToListAsync();
        if (itensDb.Count != itemIds.Distinct().Count())
            return BadRequest(new { message = "Um ou mais itens não estão disponíveis." });

        var pedido = new Pedido { MesaId = mesa.Id };
        foreach (var req in request.Itens)
        {
            pedido.Itens.Add(new PedidoItem
            {
                ItemId = req.ItemId,
                Quantidade = req.Quantidade,
                Observacao = req.Observacao
            });
        }
        db.Pedidos.Add(pedido);
        await db.SaveChangesAsync();

        var nomesItens = itensDb.Select(i => i.Nome).ToArray();
        await hub.Clients.All.SendAsync("NovoPedido", pedido.Id, mesa.Numero, nomesItens);

        await db.Entry(pedido).Reference(p => p.Mesa).LoadAsync();
        foreach (var pi in pedido.Itens) await db.Entry(pi).Reference(x => x.Item).LoadAsync();

        return CreatedAtAction(nameof(GetAll), ToResponse(pedido));
    }

    private static PedidoResponse ToResponse(Pedido p) => new(
        p.Id, p.MesaId, p.Mesa.Numero, p.Status, p.CriadoEm, p.TotalFinal,
        p.Itens.Select(i => new PedidoItemResponse(
            i.Id, i.ItemId, i.Item.Nome, i.Item.Preco,
            i.Quantidade, i.Observacao, i.Status, i.CriadoEm)).ToList());
}
```

- [ ] **Step 5: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "PedidosControllerTests" -v normal
```
Expected: `Passed: 3, Failed: 0`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: módulo Pedidos com criação e consulta + evento SignalR NovoPedido"
```

---

### Task 4: Módulo KDS — fila, status e estimativa de tempo

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/KDS/DTOs/KdsDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/KDS/Controllers/KdsController.cs`
- Create: `tests/RestauranteDigital.Tests/KDS/KdsControllerTests.cs`

- [ ] **Step 1: Criar DTOs do KDS**

`src/RestauranteDigital.Api/Modules/KDS/DTOs/KdsDto.cs`
```csharp
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.KDS.DTOs;

public record KdsPedidoItemResponse(
    int PedidoItemId, int PedidoId, int MesaNumero,
    string ItemNome, int Quantidade, string? Observacao,
    PedidoItemStatus Status, DateTime CriadoEm, int MinutosEspera);

public record KdsFilaResponse(
    List<KdsPedidoItemResponse> Itens, double TempoMedioMinutos);

public record AtualizarStatusRequest(PedidoItemStatus NovoStatus);
```

- [ ] **Step 2: Escrever testes do KDS**

`tests/RestauranteDigital.Tests/KDS/KdsControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.KDS.DTOs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Tests.KDS;

public class KdsControllerTests : TestBase
{
    private async Task<string> AuthAs(string role, string email)
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("User", email, "senha123", role));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "senha123"));
        var data = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        return data!.Token;
    }

    private async Task<int> SeedPedido(string adminToken)
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        var catResp = await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var cat = await catResp.Content.ReadFromJsonAsync<CategoriaResponse>();
        var itemResp = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cat!.Id, "X-Burguer", "Pão e carne", 28.00m, null));
        var item = await itemResp.Content.ReadFromJsonAsync<ItemResponse>();
        var mesaResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(1));
        var mesa = await mesaResp.Content.ReadFromJsonAsync<MesaResponse>();
        Client.DefaultRequestHeaders.Authorization = null;

        var pedidoResp = await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest(mesa!.QrCodeToken, [new PedidoItemRequest(item!.Id, 1, null)]));
        var pedido = await pedidoResp.Content.ReadFromJsonAsync<PedidoResponse>();
        return pedido!.Itens[0].Id;
    }

    [Fact]
    public async Task GetFila_ComoCozinha_Returns200ComItens()
    {
        var adminToken = await AuthAs("Admin", "admin@kds.com");
        await SeedPedido(adminToken);
        var cozinhaToken = await AuthAs("Cozinha", "cozinha@kds.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.GetAsync("/api/kds/fila");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var fila = await response.Content.ReadFromJsonAsync<KdsFilaResponse>();
        fila!.Itens.Should().HaveCount(1);
        fila.Itens[0].Status.Should().Be(PedidoItemStatus.Pendente);
    }

    [Fact]
    public async Task AtualizarStatus_ComoCozinha_EmiteEventoEAtualiza()
    {
        var adminToken = await AuthAs("Admin", "admin@kds2.com");
        var pedidoItemId = await SeedPedido(adminToken);
        var cozinhaToken = await AuthAs("Cozinha", "cozinha@kds2.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.PatchAsJsonAsync(
            $"/api/kds/{pedidoItemId}/status",
            new AtualizarStatusRequest(PedidoItemStatus.Pronto));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var item = await response.Content.ReadFromJsonAsync<KdsPedidoItemResponse>();
        item!.Status.Should().Be(PedidoItemStatus.Pronto);
    }

    [Fact]
    public async Task GetFila_SemAutenticacao_Returns401()
    {
        var response = await Client.GetAsync("/api/kds/fila");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "KdsControllerTests"
```
Expected: FAIL

- [ ] **Step 4: Criar KdsController**

`src/RestauranteDigital.Api/Modules/KDS/Controllers/KdsController.cs`
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.KDS.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.KDS.Controllers;

[ApiController]
[Route("api/kds")]
[Authorize(Roles = "Cozinha")]
public class KdsController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet("fila")]
    public async Task<IActionResult> GetFila()
    {
        var itens = await db.PedidoItens
            .Include(pi => pi.Pedido).ThenInclude(p => p.Mesa)
            .Include(pi => pi.Item)
            .Where(pi => pi.Status != PedidoItemStatus.Pronto && pi.Pedido.Status == PedidoStatus.Aberto)
            .OrderBy(pi => pi.CriadoEm)
            .ToListAsync();

        var tempoMedio = await CalcularTempoMedioAsync();

        var agora = DateTime.UtcNow;
        var response = itens.Select(pi => new KdsPedidoItemResponse(
            pi.Id, pi.PedidoId, pi.Pedido.Mesa.Numero,
            pi.Item.Nome, pi.Quantidade, pi.Observacao,
            pi.Status, pi.CriadoEm,
            (int)(agora - pi.CriadoEm).TotalMinutes)).ToList();

        return Ok(new KdsFilaResponse(response, tempoMedio));
    }

    [HttpPatch("{pedidoItemId}/status")]
    public async Task<IActionResult> AtualizarStatus(int pedidoItemId, AtualizarStatusRequest request)
    {
        var pi = await db.PedidoItens
            .Include(x => x.Pedido).ThenInclude(p => p.Mesa)
            .Include(x => x.Item)
            .FirstOrDefaultAsync(x => x.Id == pedidoItemId);

        if (pi is null) return NotFound();

        pi.Status = request.NovoStatus;
        if (request.NovoStatus == PedidoItemStatus.Pronto)
            pi.ConcluidoEm = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("StatusAtualizado", pi.Id, request.NovoStatus.ToString());

        var agora = DateTime.UtcNow;
        return Ok(new KdsPedidoItemResponse(
            pi.Id, pi.PedidoId, pi.Pedido.Mesa.Numero,
            pi.Item.Nome, pi.Quantidade, pi.Observacao,
            pi.Status, pi.CriadoEm,
            (int)(agora - pi.CriadoEm).TotalMinutes));
    }

    [HttpPatch("{itemId}/esgotado")]
    public async Task<IActionResult> MarcarEsgotado(int itemId)
    {
        var item = await db.Itens.FindAsync(itemId);
        if (item is null) return NotFound();

        item.Disponivel = false;
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("ItemEsgotado", item.Id, item.Nome);

        return Ok(new { item.Id, item.Nome, item.Disponivel });
    }

    private async Task<double> CalcularTempoMedioAsync()
    {
        var ultimos = await db.PedidoItens
            .Where(pi => pi.Status == PedidoItemStatus.Pronto && pi.ConcluidoEm.HasValue)
            .OrderByDescending(pi => pi.ConcluidoEm)
            .Take(20)
            .ToListAsync();

        if (!ultimos.Any()) return 0;

        return ultimos
            .Where(pi => pi.ConcluidoEm.HasValue)
            .Average(pi => (pi.ConcluidoEm!.Value - pi.CriadoEm).TotalMinutes);
    }
}
```

- [ ] **Step 5: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "KdsControllerTests" -v normal
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
git commit -m "feat: módulo KDS com fila, status, estimativa de tempo e evento ItemEsgotado"
```

---

### Task 5: Fechamento de conta pelo Garçom/Admin

**Files:**
- Modify: `src/RestauranteDigital.Api/Modules/Pedidos/Controllers/PedidosController.cs`

- [ ] **Step 1: Adicionar endpoint de fechamento ao PedidosController**

Adicione o seguinte método ao `PedidosController`:
```csharp
[HttpPost("{id}/fechar")]
[Microsoft.AspNetCore.Authorization.Authorize(Roles = "Garcom,Admin")]
public async Task<IActionResult> FecharConta(int id)
{
    var pedido = await db.Pedidos
        .Include(p => p.Mesa)
        .Include(p => p.Itens).ThenInclude(i => i.Item)
        .FirstOrDefaultAsync(p => p.Id == id);

    if (pedido is null) return NotFound();
    if (pedido.Status == PedidoStatus.Fechado)
        return BadRequest(new { message = "Pedido já está fechado." });

    pedido.TotalFinal = pedido.Itens.Sum(i => i.Item.Preco * i.Quantidade);
    pedido.Status = PedidoStatus.Fechado;
    await db.SaveChangesAsync();

    return Ok(ToResponse(pedido));
}
```

- [ ] **Step 2: Testar manualmente**

```bash
cd src/RestauranteDigital.Api
dotnet run
```

Via Swagger em `http://localhost:5000/swagger`:
1. POST `/api/auth/login` com credenciais de Admin
2. POST `/api/pedidos` com token de uma mesa
3. POST `/api/pedidos/{id}/fechar`
Expected: pedido retornado com `status: "Fechado"` e `totalFinal` preenchido.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: fechamento de conta com cálculo de total"
```
