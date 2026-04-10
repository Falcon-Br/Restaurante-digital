using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Hubs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Cardapio.Controllers;

[ApiController]
[Route("api/itens")]
public class ItensController(AppDbContext db, IHubContext<RestauranteHub> hub) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? categoriaId)
    {
        var query = db.Itens.Include(i => i.Categoria).AsQueryable();
        if (categoriaId.HasValue)
            query = query.Where(i => i.CategoriaId == categoriaId.Value);

        var itens = await query
            .OrderBy(i => i.Categoria.Ordem).ThenBy(i => i.Nome)
            .Select(i => new ItemResponse(
                i.Id, i.CategoriaId, i.Categoria.Nome,
                i.Nome, i.Descricao, i.Preco, i.ImagemUrl, i.Disponivel))
            .ToListAsync();
        return Ok(itens);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(ItemRequest request)
    {
        var cat = await db.Categorias.FindAsync(request.CategoriaId);
        if (cat is null) return BadRequest(new { message = "Categoria não encontrada." });

        var item = new Item
        {
            CategoriaId = request.CategoriaId,
            Nome = request.Nome,
            Descricao = request.Descricao,
            Preco = request.Preco,
            ImagemUrl = request.ImagemUrl
        };
        db.Itens.Add(item);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), null,
            new ItemResponse(item.Id, item.CategoriaId, cat.Nome,
                item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, ItemRequest request)
    {
        var item = await db.Itens.Include(i => i.Categoria).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();

        item.CategoriaId = request.CategoriaId;
        item.Nome = request.Nome;
        item.Descricao = request.Descricao;
        item.Preco = request.Preco;
        item.ImagemUrl = request.ImagemUrl;
        await db.SaveChangesAsync();

        return Ok(new ItemResponse(item.Id, item.CategoriaId, item.Categoria.Nome,
            item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpPatch("{id}/disponibilidade")]
    [Authorize(Roles = "Admin,Cozinha")]
    public async Task<IActionResult> ToggleDisponibilidade(int id)
    {
        var item = await db.Itens.Include(i => i.Categoria).FirstOrDefaultAsync(i => i.Id == id);
        if (item is null) return NotFound();

        item.Disponivel = !item.Disponivel;
        await db.SaveChangesAsync();

        if (item.Disponivel)
            await hub.Clients.All.SendAsync("ItemDisponivel", item.Id, item.Nome);
        else
            await hub.Clients.All.SendAsync("ItemEsgotado", item.Id, item.Nome);

        return Ok(new ItemResponse(item.Id, item.CategoriaId, item.Categoria.Nome,
            item.Nome, item.Descricao, item.Preco, item.ImagemUrl, item.Disponivel));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Itens.FindAsync(id);
        if (item is null) return NotFound();
        db.Itens.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
