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
    public async Task GetQrCodeByToken_ValidToken_ReturnsPngWithoutAuth()
    {
        await AuthAsAdmin();
        var createResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(9));
        var mesa = await createResp.Content.ReadFromJsonAsync<MesaResponse>();

        Client.DefaultRequestHeaders.Authorization = null;
        var response = await Client.GetAsync($"/api/mesas/token/{mesa!.QrCodeToken}/qrcode");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        bytes.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetPublicQrs_ReturnsMesaListWithoutAuth()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(2));
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(7));

        Client.DefaultRequestHeaders.Authorization = null;
        var response = await Client.GetAsync("/api/mesas/public");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<List<MesaPublicQrResponse>>();
        result.Should().NotBeNull();
        var mesas = result!;
        mesas.Should().HaveCount(2);
        mesas[0].Numero.Should().Be(2);
        mesas[0].QrCodeToken.Should().NotBeNullOrWhiteSpace();
        mesas[0].QrCodeImageUrl.Should().Contain("/api/mesas/token/");
        mesas[0].QrPageUrl.Should().Contain("/qr/");
    }

    [Fact]
    public async Task GetPublicQrs_UsesOriginHeaderAsFrontendUrl()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(4));
        Client.DefaultRequestHeaders.Authorization = null;

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/mesas/public");
        request.Headers.Add("Origin", "https://restaurante.adrio.dev");
        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var mesas = await response.Content.ReadFromJsonAsync<List<MesaPublicQrResponse>>();
        mesas.Should().ContainSingle();
        mesas![0].QrCodeUrl.Should().StartWith("https://restaurante.adrio.dev/menu/");
        mesas[0].QrPageUrl.Should().StartWith("https://restaurante.adrio.dev/qr/");
    }

    [Fact]
    public async Task GetPublicQrs_UsesRefererWhenOriginHeaderIsMissing()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(6));
        Client.DefaultRequestHeaders.Authorization = null;

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/mesas/public");
        request.Headers.Referrer = new Uri("http://localhost:5173/home");
        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var mesas = await response.Content.ReadFromJsonAsync<List<MesaPublicQrResponse>>();
        mesas.Should().ContainSingle();
        mesas![0].QrCodeUrl.Should().StartWith("http://localhost:5173/menu/");
        mesas[0].QrPageUrl.Should().StartWith("http://localhost:5173/qr/");
    }

    [Fact]
    public async Task GetPublicQrs_WithoutRequestOriginFallsBackToConfiguredLocalFrontend()
    {
        await AuthAsAdmin();
        await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(8));
        Client.DefaultRequestHeaders.Authorization = null;

        var response = await Client.GetAsync("/api/mesas/public");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var mesas = await response.Content.ReadFromJsonAsync<List<MesaPublicQrResponse>>();
        mesas.Should().ContainSingle();
        mesas![0].QrCodeUrl.Should().StartWith("http://localhost:5173/menu/");
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
