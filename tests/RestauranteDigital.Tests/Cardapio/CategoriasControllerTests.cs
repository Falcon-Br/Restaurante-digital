using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;

namespace RestauranteDigital.Tests.Cardapio;

public class CategoriasControllerTests : TestBase
{
    private async Task AuthAsAdmin()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Admin", "admin@categoria.com", "senha123", "Admin"));
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@categoria.com", "senha123"));
        var loginData = await loginResp.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", loginData!.Token);
    }

    [Fact]
    public async Task GetAll_ReturnsCategoriesOrderedByOrdem()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Bebidas", 2, false));
        await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Entradas", 1, true));
        Client.DefaultRequestHeaders.Authorization = null;

        var response = await Client.GetAsync("/api/categorias");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var categorias = await response.Content.ReadFromJsonAsync<List<CategoriaResponse>>();
        categorias.Should().NotBeNull();
        categorias!.Select(c => c.Nome).Should().Equal("Entradas", "Bebidas");
        categorias![0].Cozinhar.Should().BeTrue();
        categorias[1].Cozinhar.Should().BeFalse();
    }

    [Fact]
    public async Task Create_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/categorias",
            new CategoriaRequest("Sobremesas", 3));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Update_AsAdmin_UpdatesNameOrderAndCozinhar()
    {
        await AuthAsAdmin();
        var createResp = await Client.PostAsJsonAsync("/api/categorias",
            new CategoriaRequest("Lanches", 1, true));
        var categoria = await createResp.Content.ReadFromJsonAsync<CategoriaResponse>();

        var response = await Client.PutAsJsonAsync($"/api/categorias/{categoria!.Id}",
            new CategoriaRequest("Pratos", 5, false));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<CategoriaResponse>();
        updated!.Nome.Should().Be("Pratos");
        updated.Ordem.Should().Be(5);
        updated.Cozinhar.Should().BeFalse();
    }

    [Fact]
    public async Task Update_MissingCategory_Returns404()
    {
        await AuthAsAdmin();

        var response = await Client.PutAsJsonAsync("/api/categorias/99999",
            new CategoriaRequest("Inexistente", 1));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_AsAdmin_RemovesCategory()
    {
        await AuthAsAdmin();
        var createResp = await Client.PostAsJsonAsync("/api/categorias",
            new CategoriaRequest("Vinhos", 1, false));
        var categoria = await createResp.Content.ReadFromJsonAsync<CategoriaResponse>();

        var deleteResp = await Client.DeleteAsync($"/api/categorias/{categoria!.Id}");
        var listResp = await Client.GetAsync("/api/categorias");

        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var categorias = await listResp.Content.ReadFromJsonAsync<List<CategoriaResponse>>();
        categorias.Should().BeEmpty();
    }

    [Fact]
    public async Task Delete_MissingCategory_Returns404()
    {
        await AuthAsAdmin();

        var response = await Client.DeleteAsync("/api/categorias/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
