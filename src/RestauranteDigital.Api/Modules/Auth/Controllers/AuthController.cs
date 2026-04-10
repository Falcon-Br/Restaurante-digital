using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Auth.Models;
using RestauranteDigital.Api.Modules.Auth.Services;

namespace RestauranteDigital.Api.Modules.Auth.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    TokenService tokenService) : ControllerBase
{
    private static readonly string[] ValidRoles = ["Garcom", "Cozinha", "Admin", "Gerente"];

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (!ValidRoles.Contains(request.Role))
            return BadRequest(new { message = "Role inválido." });

        var user = new ApplicationUser
        {
            Nome = request.Nome,
            UserName = request.Email,
            Email = request.Email
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        await userManager.AddToRoleAsync(user, request.Role);

        var token = tokenService.GenerateToken(user, [request.Role]);
        return Ok(new LoginResponse(token, user.Nome, user.Email!, request.Role));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null) return Unauthorized();

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var token = tokenService.GenerateToken(user, roles);
        return Ok(new LoginResponse(token, user.Nome, user.Email!, roles.FirstOrDefault() ?? ""));
    }
}
