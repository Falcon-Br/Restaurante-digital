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
        var item = await response.Content.ReadFromJsonAsync<ItemResponse>();
        item!.Nome.Should().Be("X-Burguer");
        item.Disponivel.Should().BeTrue();
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

    [Fact]
    public async Task ToggleDisponibilidade_AsCozinha_Returns200()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var catResp = await Client.GetAsync("/api/categorias");
        var cats = await catResp.Content.ReadFromJsonAsync<List<CategoriaResponse>>();
        var createResp = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cats![0].Id, "X-Frango", "Pão, frango", 26.00m, null));
        var item = await createResp.Content.ReadFromJsonAsync<ItemResponse>();

        // Login como Cozinha
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Cozinheiro", "cozinha@test.com", "senha123", "Cozinha"));
        var cozinhaResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("cozinha@test.com", "senha123"));
        var cozinhaData = await cozinhaResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaData!.Token);

        var toggleResp = await Client.PatchAsync($"/api/itens/{item!.Id}/disponibilidade", null);
        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
