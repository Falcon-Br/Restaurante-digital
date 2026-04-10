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
    public async Task GetByToken_ValidToken_Returns200()
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
    public async Task GetByToken_InvalidToken_Returns404()
    {
        var response = await Client.GetAsync("/api/mesas/token/token-invalido-xyz");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateMesa_DuplicateNumero_Returns400()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(3));
        var response = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(3));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
