using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Relatorios.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Tests.Relatorios;

public class RelatoriosControllerTests : TestBase
{
    private async Task<string> AuthAs(string role, string email)
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("User", email, "senha123", role));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "senha123"));
        return (await resp.Content.ReadFromJsonAsync<LoginResponse>())!.Token;
    }

    private async Task SeedPedidoFechado(string adminToken)
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
            new CriarPedidoRequest(mesa!.QrCodeToken, null, [new PedidoItemRequest(item!.Id, 2, null)]));
        var pedido = await pedidoResp.Content.ReadFromJsonAsync<PedidoResponse>();

        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsync($"/api/pedidos/{pedido!.Id}/fechar", null);
    }

    [Fact]
    public async Task GetResumo_ComoGerente_Returns200ComDados()
    {
        var adminToken = await AuthAs("Admin", "admin@rel.com");
        await SeedPedidoFechado(adminToken);
        var gerenteToken = await AuthAs("Gerente", "gerente@rel.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var de = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        var ate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var response = await Client.GetAsync($"/api/relatorios/resumo?de={de}&ate={ate}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var resumo = await response.Content.ReadFromJsonAsync<ResumoVendasResponse>();
        resumo!.TotalPedidos.Should().Be(1);
        resumo.TotalFaturado.Should().Be(56.00m);
    }

    [Fact]
    public async Task GetResumo_SemAutenticacao_Returns401()
    {
        var response = await Client.GetAsync("/api/relatorios/resumo");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPedidos_ComoGerente_RetornaPedidosFechados()
    {
        var adminToken = await AuthAs("Admin", "admin@rel2.com");
        await SeedPedidoFechado(adminToken);
        var gerenteToken = await AuthAs("Gerente", "gerente@rel2.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var response = await Client.GetAsync("/api/relatorios/pedidos?status=Fechado");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pedidos = await response.Content.ReadFromJsonAsync<List<PedidoResumo>>();
        pedidos.Should().HaveCount(1);
        pedidos![0].Status.Should().Be("Fechado");
    }

    private async Task<int> SeedMesaComComandaFechada(string adminToken)
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        var mesaResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(99));
        var mesa = await mesaResp.Content.ReadFromJsonAsync<MesaResponse>();

        var cmdResp = await Client.PostAsJsonAsync(
            $"/api/mesas/{mesa!.Id}/comandas", new CriarComandaRequest("Mesa 99 - Teste"));
        var comanda = await cmdResp.Content.ReadFromJsonAsync<ComandaResponse>();

        await Client.PostAsync($"/api/comandas/{comanda!.Id}/fechar", null);
        Client.DefaultRequestHeaders.Authorization = null;
        return comanda.Id;
    }

    [Fact]
    public async Task GetComandas_ComoGerente_RetornaComandasFechadas()
    {
        var adminToken = await AuthAs("Admin", "admin@rel3.com");
        await SeedMesaComComandaFechada(adminToken);
        var gerenteToken = await AuthAs("Gerente", "gerente@rel3.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var de = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        var ate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var response = await Client.GetAsync($"/api/relatorios/comandas?de={de}&ate={ate}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var comandas = await response.Content.ReadFromJsonAsync<List<ComandaResumo>>();
        comandas.Should().HaveCount(1);
        comandas![0].Nome.Should().Be("Mesa 99 - Teste");
        comandas[0].MesaNumero.Should().Be(99);
    }

    [Fact]
    public async Task GetComandas_SemAutenticacao_Returns401()
    {
        var response = await Client.GetAsync("/api/relatorios/comandas");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetComandas_ComoGarcom_Returns403()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Garcom", "garcom@rel.com", "senha123", "Garcom"));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("garcom@rel.com", "senha123"));
        var token = (await resp.Content.ReadFromJsonAsync<LoginResponse>())!.Token;
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await Client.GetAsync("/api/relatorios/comandas");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetComandas_SemComandas_RetornaListaVazia()
    {
        var gerenteToken = await AuthAs("Gerente", "gerente@rel4.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var de = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        var ate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var response = await Client.GetAsync($"/api/relatorios/comandas?de={de}&ate={ate}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var comandas = await response.Content.ReadFromJsonAsync<List<ComandaResumo>>();
        comandas.Should().BeEmpty();
    }
}
