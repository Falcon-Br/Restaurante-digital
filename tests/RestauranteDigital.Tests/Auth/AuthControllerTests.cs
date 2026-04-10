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

    [Fact]
    public async Task Register_WithInvalidRole_Returns400()
    {
        var request = new RegisterRequest("Hacker", "hack@test.com", "senha123", "SuperAdmin");

        var response = await Client.PostAsJsonAsync("/api/auth/register", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
