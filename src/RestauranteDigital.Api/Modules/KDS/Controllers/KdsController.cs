using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.KDS.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.KDS.Controllers;

[ApiController]
[Route("api/kds")]
[Authorize(Roles = "Cozinha")]
public class KdsController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet("fila")]
    public async Task<IActionResult> GetFila()
    {
        var itens = await db.PedidoItens
            .Include(pi => pi.Pedido).ThenInclude(p => p.Mesa)
            .Include(pi => pi.Item)
            .Where(pi => pi.Status != PedidoItemStatus.Pronto && pi.Pedido.Status == PedidoStatus.Aberto)
            .OrderBy(pi => pi.CriadoEm)
            .ToListAsync();

        var tempoMedio = await CalcularTempoMedioAsync();

        var agora = DateTime.UtcNow;
        var response = itens.Select(pi => new KdsPedidoItemResponse(
            pi.Id, pi.PedidoId, pi.Pedido.Mesa.Numero,
            pi.Item.Nome, pi.Quantidade, pi.Observacao,
            pi.Status, pi.CriadoEm,
            (int)(agora - pi.CriadoEm).TotalMinutes)).ToList();

        return Ok(new KdsFilaResponse(response, tempoMedio));
    }

    [HttpPatch("{pedidoItemId}/status")]
    public async Task<IActionResult> AtualizarStatus(int pedidoItemId, AtualizarStatusRequest request)
    {
        var pi = await db.PedidoItens
            .Include(x => x.Pedido).ThenInclude(p => p.Mesa)
            .Include(x => x.Item)
            .FirstOrDefaultAsync(x => x.Id == pedidoItemId);

        if (pi is null) return NotFound();

        pi.Status = request.NovoStatus;
        if (request.NovoStatus == PedidoItemStatus.Pronto)
            pi.ConcluidoEm = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("StatusAtualizado", pi.Id, request.NovoStatus.ToString());

        var agora = DateTime.UtcNow;
        return Ok(new KdsPedidoItemResponse(
            pi.Id, pi.PedidoId, pi.Pedido.Mesa.Numero,
            pi.Item.Nome, pi.Quantidade, pi.Observacao,
            pi.Status, pi.CriadoEm,
            (int)(agora - pi.CriadoEm).TotalMinutes));
    }

    [HttpPatch("{itemId}/esgotado")]
    public async Task<IActionResult> MarcarEsgotado(int itemId)
    {
        var item = await db.Itens.FindAsync(itemId);
        if (item is null) return NotFound();

        item.Disponivel = false;
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("ItemEsgotado", item.Id, item.Nome);

        return Ok(new { item.Id, item.Nome, item.Disponivel });
    }

    private async Task<double> CalcularTempoMedioAsync()
    {
        var ultimos = await db.PedidoItens
            .Where(pi => pi.Status == PedidoItemStatus.Pronto && pi.ConcluidoEm.HasValue)
            .OrderByDescending(pi => pi.ConcluidoEm)
            .Take(20)
            .ToListAsync();

        if (!ultimos.Any()) return 0;

        return ultimos.Average(pi => (pi.ConcluidoEm!.Value - pi.CriadoEm).TotalMinutes);
    }
}
