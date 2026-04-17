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
            mesaToken, null, [new PedidoItemRequest(itemId, 2, "Sem cebola")]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var pedido = await response.Content.ReadFromJsonAsync<PedidoResponse>();
        pedido!.Itens.Should().HaveCount(1);
        pedido.Itens[0].Observacao.Should().Be("Sem cebola");
    }

    [Fact]
    public async Task CriarPedido_TokenMesaInvalido_Returns404()
    {
        var response = await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest("token-invalido", null, [new PedidoItemRequest(1, 1, null)]));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPedidosByMesa_ComoGarcom_Returns200()
    {
        var adminToken = await AuthAsAdmin();
        var (mesaToken, itemId) = await SeedData(adminToken);

        await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest(mesaToken, null, [new PedidoItemRequest(itemId, 1, null)]));

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

    private async Task<string> AuthAsCozinha(string suffix = "")
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Cozinha", $"cozinha{suffix}@test.com", "senha123", "Cozinha"));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest($"cozinha{suffix}@test.com", "senha123"));
        var data = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        return data!.Token;
    }

    private async Task<PedidoResponse> SeedPedido(string adminToken)
    {
        var (mesaToken, itemId) = await SeedData(adminToken);
        Client.DefaultRequestHeaders.Authorization = null;
        var resp = await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest(mesaToken, null, [new PedidoItemRequest(itemId, 1, null)]));
        return (await resp.Content.ReadFromJsonAsync<PedidoResponse>())!;
    }

    [Fact]
    public async Task CancelarItem_ItemExistente_Remove204()
    {
        var adminToken = await AuthAsAdmin();
        var pedido = await SeedPedido(adminToken);
        var pedidoItemId = pedido.Itens[0].Id;

        var cozinhaToken = await AuthAsCozinha("cancelitem");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync($"/api/pedidos/{pedido.Id}/itens/{pedidoItemId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CancelarItem_ItemNaoEncontrado_Returns404()
    {
        var adminToken = await AuthAsAdmin();
        var pedido = await SeedPedido(adminToken);

        var cozinhaToken = await AuthAsCozinha("cancelitem404");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync($"/api/pedidos/{pedido.Id}/itens/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CancelarItem_PedidoFechado_Returns400()
    {
        var adminToken = await AuthAsAdmin();
        var pedido = await SeedPedido(adminToken);
        var pedidoItemId = pedido.Itens[0].Id;

        // Fechar o pedido como Admin
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsJsonAsync($"/api/pedidos/{pedido.Id}/fechar", new { });

        var cozinhaToken = await AuthAsCozinha("cancelitemfechado");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync($"/api/pedidos/{pedido.Id}/itens/{pedidoItemId}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CancelarPedido_PedidoExistente_Remove204()
    {
        var adminToken = await AuthAsAdmin();
        var pedido = await SeedPedido(adminToken);

        var cozinhaToken = await AuthAsCozinha("cancelpedido");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync($"/api/pedidos/{pedido.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CancelarPedido_PedidoNaoEncontrado_Returns404()
    {
        var adminToken = await AuthAsAdmin();
        _ = adminToken; // register admin to init db

        var cozinhaToken = await AuthAsCozinha("cancelpedido404");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync("/api/pedidos/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CancelarPedido_PedidoFechado_Returns400()
    {
        var adminToken = await AuthAsAdmin();
        var pedido = await SeedPedido(adminToken);

        // Fechar o pedido como Admin
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsJsonAsync($"/api/pedidos/{pedido.Id}/fechar", new { });

        var cozinhaToken = await AuthAsCozinha("cancelpedidofechado");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", cozinhaToken);

        var response = await Client.DeleteAsync($"/api/pedidos/{pedido.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
