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
