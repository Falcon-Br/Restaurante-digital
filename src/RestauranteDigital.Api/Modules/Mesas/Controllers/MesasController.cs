using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using QRCoder;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;

namespace RestauranteDigital.Api.Modules.Mesas.Controllers;

[ApiController]
[Route("api/mesas")]
public class MesasController(AppDbContext db, IConfiguration config, IHubContext<RestauranteHub> hub) : ControllerBase
{
    private string FrontendUrl =>
        string.IsNullOrWhiteSpace(config["App:FrontendUrl"])
            ? "http://localhost:5173"
            : config["App:FrontendUrl"]!.TrimEnd('/');

    private string RequestFrontendUrl
    {
        get
        {
            foreach (var header in new[] { "Origin", "Referer" })
            {
                if (!Request.Headers.TryGetValue(header, out var value)) continue;
                if (!Uri.TryCreate(value.ToString(), UriKind.Absolute, out var uri)) continue;
                if (uri.Scheme is not ("http" or "https")) continue;

                return uri.GetLeftPart(UriPartial.Authority);
            }

            return FrontendUrl;
        }
    }

    private string GetMenuUrl(string token) =>
        $"{RequestFrontendUrl}/menu/{token}";

    private string GetQrPageUrl(string token) =>
        $"{RequestFrontendUrl}/qr/{token}";

    private string GetQrImageUrl(string token) =>
        $"/api/mesas/token/{token}/qrcode";

    private MesaPublicQrResponse ToPublicQrResponse(Mesa mesa) =>
        new(mesa.Numero, mesa.QrCodeToken, GetMenuUrl(mesa.QrCodeToken), GetQrImageUrl(mesa.QrCodeToken), GetQrPageUrl(mesa.QrCodeToken));

    private FileContentResult CreateQrCodeFile(string url, string? fileName = null)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var bytes = qrCode.GetGraphic(20);
        return fileName is null
            ? File(bytes, "image/png")
            : File(bytes, "image/png", fileName);
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Garcom,Gerente")]
    public async Task<IActionResult> GetAll()
    {
        var mesas = await db.Mesas
            .OrderBy(m => m.Numero)
            .ToListAsync();

        return Ok(mesas.Select(m =>
            new MesaResponse(m.Id, m.Numero, m.QrCodeToken, m.Status, GetMenuUrl(m.QrCodeToken))));
    }

    [HttpGet("public")]
    public async Task<IActionResult> GetPublicQrs()
    {
        var mesas = await db.Mesas
            .OrderBy(m => m.Numero)
            .ToListAsync();

        return Ok(mesas.Select(ToPublicQrResponse));
    }

    [HttpGet("token/{token}")]
    public async Task<IActionResult> GetByToken(string token)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == token);
        if (mesa is null) return NotFound();
        return Ok(new MesaResponse(mesa.Id, mesa.Numero, mesa.QrCodeToken, mesa.Status, GetMenuUrl(mesa.QrCodeToken)));
    }

    [HttpGet("token/{token}/qrcode")]
    public async Task<IActionResult> GetQrCodeByToken(string token)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == token);
        if (mesa is null) return NotFound();

        return CreateQrCodeFile(GetMenuUrl(mesa.QrCodeToken));
    }

    [HttpGet("{id}/qrcode")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetQrCode(int id)
    {
        var mesa = await db.Mesas.FindAsync(id);
        if (mesa is null) return NotFound();

        var url = GetMenuUrl(mesa.QrCodeToken);
        return CreateQrCodeFile(url, $"mesa-{mesa.Numero}-qr.png");
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(MesaRequest request)
    {
        if (await db.Mesas.AnyAsync(m => m.Numero == request.Numero))
            return BadRequest(new { message = $"Mesa {request.Numero} já existe." });

        var mesa = new Mesa { Numero = request.Numero };
        db.Mesas.Add(mesa);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("MesasAtualizadas");

        return CreatedAtAction(nameof(GetAll), null,
            new MesaResponse(mesa.Id, mesa.Numero, mesa.QrCodeToken, mesa.Status, GetMenuUrl(mesa.QrCodeToken)));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var mesa = await db.Mesas.FindAsync(id);
        if (mesa is null) return NotFound();
        db.Mesas.Remove(mesa);
        await db.SaveChangesAsync();
        await hub.Clients.All.SendAsync("MesasAtualizadas");
        return NoContent();
    }
}
