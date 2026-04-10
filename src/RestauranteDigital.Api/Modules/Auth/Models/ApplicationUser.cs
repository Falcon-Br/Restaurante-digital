using Microsoft.AspNetCore.Identity;

namespace RestauranteDigital.Api.Modules.Auth.Models;

public class ApplicationUser : IdentityUser
{
    public string Nome { get; set; } = string.Empty;
}
