using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Pedidos.Models;
using RestauranteDigital.Api.Modules.Relatorios.DTOs;

namespace RestauranteDigital.Api.Modules.Relatorios.Controllers;

[ApiController]
[Route("api/relatorios")]
[Authorize(Roles = "Gerente")]
public class RelatoriosController(AppDbContext db) : ControllerBase
{
    [HttpGet("resumo")]
    public async Task<IActionResult> GetResumo(
        [FromQuery] DateTime? de,
        [FromQuery] DateTime? ate)
    {
        var dataInicio = de?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(-30);
        var dataFim = (ate?.ToUniversalTime() ?? DateTime.UtcNow).AddDays(1);

        var pedidos = await db.Pedidos
            .Include(p => p.Itens).ThenInclude(i => i.Item)
            .Where(p => p.Status == PedidoStatus.Fechado
                     && p.CriadoEm >= dataInicio
                     && p.CriadoEm < dataFim)
            .ToListAsync();

        var totalFaturado = pedidos.Sum(p => p.TotalFinal ?? 0);

        var itensMaisVendidos = pedidos
            .SelectMany(p => p.Itens)
            .GroupBy(i => new { i.ItemId, i.Item.Nome })
            .Select(g => new ItemMaisVendido(
                g.Key.ItemId,
                g.Key.Nome,
                g.Sum(i => i.Quantidade),
                g.Sum(i => i.Quantidade * i.Item.Preco)))
            .OrderByDescending(i => i.QuantidadeTotal)
            .Take(10)
            .ToList();

        var tempoMedio = await db.PedidoItens
            .Where(pi => pi.Status == PedidoItemStatus.Pronto && pi.ConcluidoEm.HasValue
                      && pi.CriadoEm >= dataInicio && pi.CriadoEm < dataFim)
            .Select(pi => (pi.ConcluidoEm!.Value - pi.CriadoEm).TotalMinutes)
            .AverageAsync(x => (double?)x) ?? 0;

        return Ok(new ResumoVendasResponse(
            dataInicio, dataFim.AddDays(-1),
            pedidos.Count,
            totalFaturado,
            Math.Round(tempoMedio, 1),
            itensMaisVendidos));
    }

    [HttpGet("pedidos")]
    public async Task<IActionResult> GetPedidos(
        [FromQuery] string? status,
        [FromQuery] DateTime? de,
        [FromQuery] DateTime? ate)
    {
        var query = db.Pedidos
            .Include(p => p.Mesa)
            .Include(p => p.Itens)
            .AsQueryable();

        if (Enum.TryParse<PedidoStatus>(status, out var s))
            query = query.Where(p => p.Status == s);

        if (de.HasValue) query = query.Where(p => p.CriadoEm >= de.Value.ToUniversalTime());
        if (ate.HasValue) query = query.Where(p => p.CriadoEm < ate.Value.ToUniversalTime().AddDays(1));

        var pedidos = await query
            .OrderByDescending(p => p.CriadoEm)
            .Take(200)
            .Select(p => new PedidoResumo(
                p.Id, p.Mesa.Numero, p.CriadoEm,
                p.TotalFinal, p.Status.ToString(), p.Itens.Count))
            .ToListAsync();

        return Ok(pedidos);
    }
}
