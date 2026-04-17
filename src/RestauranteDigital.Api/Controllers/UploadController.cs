using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RestauranteDigital.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize(Roles = "Admin")]
public class UploadController : ControllerBase
{
    private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Nenhum arquivo enviado." });

        if (!AllowedTypes.Contains(file.ContentType.ToLowerInvariant()))
            return BadRequest(new { message = "Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Arquivo muito grande. Máximo 5MB." });

        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsPath);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsPath, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/{fileName}" });
    }
}
