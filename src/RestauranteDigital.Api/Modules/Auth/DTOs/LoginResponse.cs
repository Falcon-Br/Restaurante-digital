namespace RestauranteDigital.Api.Modules.Auth.DTOs;

public record LoginResponse(string Token, string Nome, string Email, string Role);
