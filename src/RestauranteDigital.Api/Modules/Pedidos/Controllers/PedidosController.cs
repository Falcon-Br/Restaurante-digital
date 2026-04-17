using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Mesas.Models;
using RestauranteDigital.Api.Modules.Pedidos.Models;
using RestauranteDigital.Api.Modules.Mesas.DTOs;

namespace RestauranteDigital.Api.Modules.Pedidos.Controllers;

[ApiController]
[Route("api/pedidos")]
public class PedidosController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Garcom,Admin,Gerente")]
    public async Task<IActionResult> GetAll([FromQuery] int? mesaId, [FromQuery] string? status)
    {
        var query = db.Pedidos
            .Include(p => p.Mesa)
            .Include(p => p.Itens).ThenInclude(i => i.Item).ThenInclude(i => i.Categoria)
            .AsQueryable();

        if (mesaId.HasValue) query = query.Where(p => p.MesaId == mesaId.Value);
        if (Enum.TryParse<PedidoStatus>(status, out var s)) query = query.Where(p => p.Status == s);

        var pedidos = await query.OrderByDescending(p => p.CriadoEm).ToListAsync();
        return Ok(pedidos.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Criar(CriarPedidoRequest request)
    {
        var mesa = await db.Mesas.FirstOrDefaultAsync(m => m.QrCodeToken == request.MesaToken);
        if (mesa is null) return NotFound(new { message = "Mesa não encontrada." });

        var itemIds = request.Itens.Select(i => i.ItemId).ToList();
        var itensDb = await db.Itens.Where(i => itemIds.Contains(i.Id) && i.Disponivel).ToListAsync();
        if (itensDb.Count != itemIds.Distinct().Count())
            return BadRequest(new { message = "Um ou mais itens não estão disponíveis." });

        int comandaId;
        if (request.ComandaId.HasValue)
        {
            var comandaExistente = await db.Comandas
                .FirstOrDefaultAsync(c => c.Id == request.ComandaId.Value && c.MesaId == mesa.Id && c.Status == ComandaStatus.Aberta);
            if (comandaExistente is null)
                return BadRequest(new { message = "Comanda não encontrada ou já fechada." });
            comandaId = comandaExistente.Id;
        }
        else
        {
            var comandaGeral = await db.Comandas
                .FirstOrDefaultAsync(c => c.MesaId == mesa.Id && c.Status == ComandaStatus.Aberta);
            if (comandaGeral is null)
            {
                comandaGeral = new Comanda { MesaId = mesa.Id, Nome = "Geral" };
                db.Comandas.Add(comandaGeral);
                await db.SaveChangesAsync();
            }
            comandaId = comandaGeral.Id;
        }

        var pedido = new Pedido { MesaId = mesa.Id, ComandaId = comandaId };
        foreach (var req in request.Itens)
        {
            pedido.Itens.Add(new PedidoItem
            {
                ItemId = req.ItemId,
                Quantidade = req.Quantidade,
                Observacao = req.Observacao
            });
        }
        mesa.Status = MesaStatus.Ocupada;
        db.Pedidos.Add(pedido);
        await db.SaveChangesAsync();

        var nomesItens = itensDb.Select(i => i.Nome).ToArray();
        await hub.Clients.All.SendAsync("NovoPedido", pedido.Id, mesa.Numero, nomesItens);

        await db.Entry(pedido).Reference(p => p.Mesa).LoadAsync();
        foreach (var pi in pedido.Itens) await db.Entry(pi).Reference(x => x.Item).LoadAsync();

        return CreatedAtAction(nameof(GetAll), ToResponse(pedido));
    }

    [HttpPost("{id}/fechar")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Garcom,Admin")]
    public async Task<IActionResult> FecharConta(int id)
    {
        var pedido = await db.Pedidos
            .Include(p => p.Mesa)
            .Include(p => p.Itens).ThenInclude(i => i.Item)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pedido is null) return NotFound();
        if (pedido.Status == PedidoStatus.Fechado)
            return BadRequest(new { message = "Pedido já está fechado." });

        pedido.TotalFinal = pedido.Itens.Sum(i => i.Item.Preco * i.Quantidade);
        pedido.Status = PedidoStatus.Fechado;
        await LiberarMesaSeVazia(pedido.MesaId, pedido.Id);
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("PedidoFechado", pedido.Id);

        return Ok(ToResponse(pedido));
    }

    [HttpPatch("itens/{pedidoItemId}/entregue")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Garcom,Admin")]
    public async Task<IActionResult> MarcarEntregue(int pedidoItemId)
    {
        var pi = await db.PedidoItens.FirstOrDefaultAsync(x => x.Id == pedidoItemId);
        if (pi is null) return NotFound();

        pi.Status = PedidoItemStatus.Entregue;
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("StatusAtualizado", pi.Id, PedidoItemStatus.Entregue.ToString());

        return NoContent();
    }

    [HttpDelete("{pedidoId}/itens/{itemId}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Cozinha")]
    public async Task<IActionResult> CancelarItem(int pedidoId, int itemId)
    {
        var pedido = await db.Pedidos.Include(p => p.Itens).FirstOrDefaultAsync(p => p.Id == pedidoId);
        if (pedido is null) return NotFound();
        if (pedido.Status == PedidoStatus.Fechado)
            return BadRequest(new { message = "Pedido já está fechado." });

        var pedidoItem = pedido.Itens.FirstOrDefault(i => i.Id == itemId);
        if (pedidoItem is null) return NotFound();

        if (pedido.Itens.Count == 1)
        {
            await LiberarMesaSeVazia(pedido.MesaId, pedido.Id);
            db.Pedidos.Remove(pedido);  // EF cascade removes the single PedidoItem
        }
        else
            db.PedidoItens.Remove(pedidoItem);

        await db.SaveChangesAsync();

        if (pedido.Itens.Count == 1)
            await hub.Clients.All.SendAsync("PedidoCancelado", pedido.Id);
        else
            await hub.Clients.All.SendAsync("StatusAtualizado", itemId, "Cancelado");

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Cozinha")]
    public async Task<IActionResult> CancelarPedido(int id)
    {
        var pedido = await db.Pedidos.Include(p => p.Itens).FirstOrDefaultAsync(p => p.Id == id);
        if (pedido is null) return NotFound();
        if (pedido.Status == PedidoStatus.Fechado)
            return BadRequest(new { message = "Pedido já está fechado." });

        await LiberarMesaSeVazia(pedido.MesaId, pedido.Id);
        db.PedidoItens.RemoveRange(pedido.Itens);
        db.Pedidos.Remove(pedido);
        await db.SaveChangesAsync();

        await hub.Clients.All.SendAsync("PedidoCancelado", id);

        return NoContent();
    }

    private async Task LiberarMesaSeVazia(int mesaId, int pedidoIdExcluido)
    {
        var temOutroPedidoAberto = await db.Pedidos
            .AnyAsync(p => p.MesaId == mesaId && p.Id != pedidoIdExcluido && p.Status == PedidoStatus.Aberto);
        if (!temOutroPedidoAberto)
        {
            var mesa = await db.Mesas.FindAsync(mesaId);
            if (mesa is not null) mesa.Status = MesaStatus.Livre;
        }
    }

    private static PedidoResponse ToResponse(Pedido p) => new(
        p.Id, p.MesaId, p.Mesa.Numero, p.Status, p.CriadoEm, p.TotalFinal,
        p.Itens.Select(i => new PedidoItemResponse(
            i.Id, i.ItemId, i.Item.Nome, i.Item.Preco,
            i.Quantidade, i.Observacao, i.Status, i.CriadoEm,
            i.Item.Categoria?.Cozinhar ?? true)).ToList());
}
