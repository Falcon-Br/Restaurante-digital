using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;

namespace RestauranteDigital.Tests.Cardapio;

public class ItensControllerTests : TestBase
{
    private async Task AuthAsAdmin(string suffix = "")
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin", $"admin{suffix}@item.com", "senha123", "Admin"));
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest($"admin{suffix}@item.com", "senha123"));
        var loginData = await loginResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", loginData!.Token);
    }

    private async Task<CategoriaResponse> CreateCategoria(string nome = "Lanches", bool cozinhar = true)
    {
        var response = await Client.PostAsJsonAsync("/api/categorias",
            new CategoriaRequest(nome, 1, cozinhar));
        return (await response.Content.ReadFromJsonAsync<CategoriaResponse>())!;
    }

    private async Task<ItemResponse> CreateItem(int categoriaId, string nome = "X-Burguer")
    {
        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(categoriaId, nome, "Pao, carne 180g, queijo", 28.00m, null));
        return (await response.Content.ReadFromJsonAsync<ItemResponse>())!;
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
        var categoria = await CreateCategoria();

        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(categoria.Id, "X-Burguer", "Pao, carne 180g, queijo", 28.00m, null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var item = await response.Content.ReadFromJsonAsync<ItemResponse>();
        item!.Nome.Should().Be("X-Burguer");
        item.Disponivel.Should().BeTrue();
    }

    [Fact]
    public async Task CreateItem_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(1, "X-Burguer", "Pao, carne 180g, queijo", 28.00m, null));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateItem_InvalidCategoria_Returns400()
    {
        await AuthAsAdmin();

        var response = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(99999, "Item sem categoria", "Descricao", 10.00m, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetItens_WithCategoriaId_ReturnsOnlyItemsFromCategory()
    {
        await AuthAsAdmin();
        var entradas = await CreateCategoria("Entradas");
        var bebidasResp = await Client.PostAsJsonAsync("/api/categorias",
            new CategoriaRequest("Bebidas", 2, false));
        var bebidas = await bebidasResp.Content.ReadFromJsonAsync<CategoriaResponse>();
        await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(entradas.Id, "Bruschetta", "Tomate", 24.90m, "/demo-images/bruschetta-da-casa.jpg"));
        await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(bebidas!.Id, "Suco", "Natural", 12.90m, "/demo-images/suco-natural.jpg"));
        Client.DefaultRequestHeaders.Authorization = null;

        var response = await Client.GetAsync($"/api/itens?categoriaId={entradas.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var itens = await response.Content.ReadFromJsonAsync<List<ItemResponse>>();
        itens.Should().ContainSingle();
        itens![0].Nome.Should().Be("Bruschetta");
        itens[0].CategoriaId.Should().Be(entradas.Id);
    }

    [Fact]
    public async Task UpdateItem_AsAdmin_UpdatesFields()
    {
        await AuthAsAdmin();
        var categoria = await CreateCategoria();
        var item = await CreateItem(categoria.Id, "X-Bacon");

        var response = await Client.PutAsJsonAsync($"/api/itens/{item.Id}",
            new ItemRequest(categoria.Id, "X-Salada", "Pao, carne, salada", 31.50m, "/demo-images/burger-artesanal.jpg"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ItemResponse>();
        updated!.Nome.Should().Be("X-Salada");
        updated.Preco.Should().Be(31.50m);
        updated.ImagemUrl.Should().Be("/demo-images/burger-artesanal.jpg");
    }

    [Fact]
    public async Task UpdateItem_MissingItem_Returns404()
    {
        await AuthAsAdmin();

        var response = await Client.PutAsJsonAsync("/api/itens/99999",
            new ItemRequest(1, "Nao existe", "Descricao", 9.90m, null));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ToggleDisponibilidade_AsAdmin_UpdatesItem()
    {
        await AuthAsAdmin();
        var categoria = await CreateCategoria();
        var item = await CreateItem(categoria.Id, "X-Bacon");

        var toggleResp = await Client.PatchAsync($"/api/itens/{item.Id}/disponibilidade", null);

        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await toggleResp.Content.ReadFromJsonAsync<ItemResponse>();
        updated!.Disponivel.Should().BeFalse();
    }

    [Fact]
    public async Task ToggleDisponibilidade_AsCozinha_Returns200()
    {
        await AuthAsAdmin();
        var categoria = await CreateCategoria();
        var item = await CreateItem(categoria.Id, "X-Frango");

        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Cozinheiro", "cozinha@test.com", "senha123", "Cozinha"));
        var cozinhaResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("cozinha@test.com", "senha123"));
        var cozinhaData = await cozinhaResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaData!.Token);

        var toggleResp = await Client.PatchAsync($"/api/itens/{item.Id}/disponibilidade", null);

        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ToggleDisponibilidade_MissingItem_Returns404()
    {
        await AuthAsAdmin();

        var response = await Client.PatchAsync("/api/itens/99999/disponibilidade", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteItem_AsAdmin_RemovesItem()
    {
        await AuthAsAdmin();
        var categoria = await CreateCategoria("Sobremesas");
        var item = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(categoria.Id, "Pudim", "Calda de caramelo", 18.90m, "/demo-images/pudim-classico.jpg"));
        var created = await item.Content.ReadFromJsonAsync<ItemResponse>();

        var deleteResp = await Client.DeleteAsync($"/api/itens/{created!.Id}");
        var listResp = await Client.GetAsync("/api/itens");

        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var itens = await listResp.Content.ReadFromJsonAsync<List<ItemResponse>>();
        itens.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteItem_MissingItem_Returns404()
    {
        await AuthAsAdmin();

        var response = await Client.DeleteAsync("/api/itens/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
