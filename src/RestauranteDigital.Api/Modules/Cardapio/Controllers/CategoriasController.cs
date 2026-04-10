using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RestauranteDigital.Api.Data;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.Models;

namespace RestauranteDigital.Api.Modules.Cardapio.Controllers;

[ApiController]
[Route("api/categorias")]
public class CategoriasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cats = await db.Categorias
            .OrderBy(c => c.Ordem)
            .Select(c => new CategoriaResponse(c.Id, c.Nome, c.Ordem))
            .ToListAsync();
        return Ok(cats);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create(CategoriaRequest request)
    {
        var cat = new Categoria { Nome = request.Nome, Ordem = request.Ordem };
        db.Categorias.Add(cat);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), null, new CategoriaResponse(cat.Id, cat.Nome, cat.Ordem));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, CategoriaRequest request)
    {
        var cat = await db.Categorias.FindAsync(id);
        if (cat is null) return NotFound();
        cat.Nome = request.Nome;
        cat.Ordem = request.Ordem;
        await db.SaveChangesAsync();
        return Ok(new CategoriaResponse(cat.Id, cat.Nome, cat.Ordem));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var cat = await db.Categorias.FindAsync(id);
        if (cat is null) return NotFound();
        db.Categorias.Remove(cat);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
