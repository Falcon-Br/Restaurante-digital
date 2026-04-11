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
    private string GetMenuUrl(string token) =>
        $"{config["App:BaseUrl"] ?? "http://localhost:5173"}/menu/{token}";

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

    [HttpGet("token/{token}")]
    public async Task<IActionResult> GetByToken(string token)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == token);
        if (mesa is null) return NotFound();
        return Ok(new MesaResponse(mesa.Id, mesa.Numero, mesa.QrCodeToken, mesa.Status, GetMenuUrl(mesa.QrCodeToken)));
    }

    [HttpGet("{id}/qrcode")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetQrCode(int id)
    {
        var mesa = await db.Mesas.FindAsync(id);
        if (mesa is null) return NotFound();

        var url = GetMenuUrl(mesa.QrCodeToken);
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var bytes = qrCode.GetGraphic(20);
        return File(bytes, "image/png", $"mesa-{mesa.Numero}-qr.png");
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
