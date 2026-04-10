namespace RestauranteDigital.Api.Modules.Auth.DTOs;

public record RegisterRequest(string Nome, string Email, string Password, string Role);
