using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.Models;

namespace RestauranteDigital.Api.Modules.Mesas.Controllers;

[ApiController]
[Authorize(Roles = "Garcom,Admin")]
public class ComandaController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet("api/mesas/{mesaId}/comandas")]
    public async Task<IActionResult> GetByMesa(int mesaId, [FromQuery] string? status)
    {
        var query = db.Comandas
            .Include(c => c.Pedidos).ThenInclude(p => p.Mesa)
            .Include(c => c.Pedidos).ThenInclude(p => p.Itens).ThenInclude(i => i.Item).ThenInclude(i => i.Categoria)
            .Where(c => c.MesaId == mesaId);

        if (status == "Aberta")
            query = query.Where(c => c.Status == ComandaStatus.Aberta);

        var comandas = await query.OrderBy(c => c.CriadaEm).ToListAsync();
        return Ok(comandas.Select(ToResponse));
    }

    [HttpPost("api/mesas/{mesaId}/comandas")]
    public async Task<IActionResult> Criar(int mesaId, CriarComandaRequest request)
    {
        var mesa = await db.Mesas.FindAsync(mesaId);
        if (mesa is null) return NotFound(new { message = "Mesa não encontrada." });

        var comanda = new Comanda { MesaId = mesaId, Nome = request.Nome };
        db.Comandas.Add(comanda);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByMesa), new { mesaId }, ToResponse(comanda));
    }

    [HttpPost("api/comandas/{id}/fechar")]
    public async Task<IActionResult> Fechar(int id)
    {
        var comanda = await db.Comandas
            .Include(c => c.Pedidos).ThenInclude(p => p.Mesa)
            .Include(c => c.Pedidos).ThenInclude(p => p.Itens).ThenInclude(i => i.Item).ThenInclude(i => i.Categoria)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comanda is null) return NotFound();
        if (comanda.Status == ComandaStatus.Fechada)
            return BadRequest(new { message = "Comanda já está fechada." });

        foreach (var pedido in comanda.Pedidos.Where(p => p.Status == PedidoStatus.Aberto))
        {
            pedido.TotalFinal = pedido.Itens.Sum(i => i.Item.Preco * i.Quantidade);
            pedido.Status = PedidoStatus.Fechado;
        }

        comanda.TotalFinal = comanda.Pedidos
            .SelectMany(p => p.Itens)
            .Sum(i => i.Item.Preco * i.Quantidade);
        comanda.Status = ComandaStatus.Fechada;

        // Libera mesa se não houver mais comandas abertas
        var temComandaAberta = await db.Comandas
            .AnyAsync(c => c.MesaId == comanda.MesaId && c.Id != id && c.Status == ComandaStatus.Aberta);
        if (!temComandaAberta)
        {
            var mesa = await db.Mesas.FindAsync(comanda.MesaId);
            if (mesa is not null) mesa.Status = MesaStatus.Livre;
        }

        await db.SaveChangesAsync();

        foreach (var pedido in comanda.Pedidos)
            await hub.Clients.All.SendAsync("PedidoFechado", pedido.Id);

        return Ok(ToResponse(comanda));
    }

    private static ComandaResponse ToResponse(Comanda c) => new(
        c.Id, c.MesaId, c.Nome, c.Status, c.CriadaEm, c.TotalFinal,
        c.Pedidos.Select(p => new PedidoResponse(
            p.Id, p.MesaId, p.Mesa?.Numero ?? 0, p.Status, p.CriadoEm, p.TotalFinal,
            p.Itens.Select(i => new PedidoItemResponse(
                i.Id, i.ItemId, i.Item?.Nome ?? "", i.Item?.Preco ?? 0,
                i.Quantidade, i.Observacao, i.Status, i.CriadoEm,
                i.Item?.Categoria?.Cozinhar ?? true)).ToList()
        )).ToList());
}
