# Relatórios & Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de relatórios para o Gerente, completar a GerentePage no frontend e preparar o sistema para deploy em nuvem com Docker.

**Architecture:** Módulo `Relatorios` no backend existente com endpoints de consulta agregada. GerentePage no React consome esses endpoints. Containerização com Docker Compose (API + PostgreSQL). Deploy no Azure App Service ou VPS.

**Tech Stack:** .NET 10, EF Core 9, Docker, Docker Compose, Nginx (frontend), Azure App Service ou VPS Linux.

**Pré-requisito:** Planos 1, 2 e 3 concluídos.

---

## Estrutura de Arquivos

```
src/RestauranteDigital.Api/
└── Modules/
    └── Relatorios/
        ├── DTOs/
        │   └── RelatorioDto.cs
        └── Controllers/
            └── RelatoriosController.cs
frontend/src/pages/gerente/
└── GerentePage.tsx          # substituir placeholder
Dockerfile                   # backend
frontend/Dockerfile          # frontend com Nginx
docker-compose.yml
nginx.conf
.env.example
```

---

### Task 1: Módulo Relatórios — backend

**Files:**
- Create: `src/RestauranteDigital.Api/Modules/Relatorios/DTOs/RelatorioDto.cs`
- Create: `src/RestauranteDigital.Api/Modules/Relatorios/Controllers/RelatoriosController.cs`
- Create: `tests/RestauranteDigital.Tests/Relatorios/RelatoriosControllerTests.cs`

- [ ] **Step 1: Criar DTOs de Relatórios**

`src/RestauranteDigital.Api/Modules/Relatorios/DTOs/RelatorioDto.cs`
```csharp
namespace RestauranteDigital.Api.Modules.Relatorios.DTOs;

public record ResumoVendasResponse(
    DateTime De,
    DateTime Ate,
    int TotalPedidos,
    decimal TotalFaturado,
    double TempoMedioMinutos,
    List<ItemMaisVendido> ItensMaisVendidos);

public record ItemMaisVendido(
    int ItemId,
    string ItemNome,
    int QuantidadeTotal,
    decimal TotalGerado);

public record PedidoResumo(
    int Id,
    int MesaNumero,
    DateTime CriadoEm,
    decimal? TotalFinal,
    string Status,
    int NumeroItens);
```

- [ ] **Step 2: Escrever testes de Relatórios**

`tests/RestauranteDigital.Tests/Relatorios/RelatoriosControllerTests.cs`
```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using RestauranteDigital.Api.Modules.Auth.DTOs;
using RestauranteDigital.Api.Modules.Cardapio.DTOs;
using RestauranteDigital.Api.Modules.Mesas.DTOs;
using RestauranteDigital.Api.Modules.Pedidos.DTOs;
using RestauranteDigital.Api.Modules.Relatorios.DTOs;

namespace RestauranteDigital.Tests.Relatorios;

public class RelatoriosControllerTests : TestBase
{
    private async Task<string> AuthAs(string role, string email)
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("User", email, "senha123", role));
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "senha123"));
        return (await resp.Content.ReadFromJsonAsync<LoginResponse>())!.Token;
    }

    private async Task SeedPedidoFechado(string adminToken)
    {
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        var catResp = await Client.PostAsJsonAsync("/api/categorias", new CategoriaRequest("Lanches", 1));
        var cat = await catResp.Content.ReadFromJsonAsync<CategoriaResponse>();
        var itemResp = await Client.PostAsJsonAsync("/api/itens",
            new ItemRequest(cat!.Id, "X-Burguer", "Pão e carne", 28.00m, null));
        var item = await itemResp.Content.ReadFromJsonAsync<ItemResponse>();
        var mesaResp = await Client.PostAsJsonAsync("/api/mesas", new MesaRequest(1));
        var mesa = await mesaResp.Content.ReadFromJsonAsync<MesaResponse>();
        Client.DefaultRequestHeaders.Authorization = null;

        var pedidoResp = await Client.PostAsJsonAsync("/api/pedidos",
            new CriarPedidoRequest(mesa!.QrCodeToken, [new PedidoItemRequest(item!.Id, 2, null)]));
        var pedido = await pedidoResp.Content.ReadFromJsonAsync<PedidoResponse>();

        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", adminToken);
        await Client.PostAsync($"/api/pedidos/{pedido!.Id}/fechar", null);
    }

    [Fact]
    public async Task GetResumo_ComoGerente_Returns200ComDados()
    {
        var adminToken = await AuthAs("Admin", "admin@rel.com");
        await SeedPedidoFechado(adminToken);
        var gerenteToken = await AuthAs("Gerente", "gerente@rel.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var de = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        var ate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var response = await Client.GetAsync($"/api/relatorios/resumo?de={de}&ate={ate}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var resumo = await response.Content.ReadFromJsonAsync<ResumoVendasResponse>();
        resumo!.TotalPedidos.Should().Be(1);
        resumo.TotalFaturado.Should().Be(56.00m);
    }

    [Fact]
    public async Task GetResumo_SemAutenticacao_Returns401()
    {
        var response = await Client.GetAsync("/api/relatorios/resumo");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPedidos_ComoGerente_RetornaPedidosFechados()
    {
        var adminToken = await AuthAs("Admin", "admin@rel2.com");
        await SeedPedidoFechado(adminToken);
        var gerenteToken = await AuthAs("Gerente", "gerente@rel2.com");
        Client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", gerenteToken);

        var response = await Client.GetAsync("/api/relatorios/pedidos?status=Fechado");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var pedidos = await response.Content.ReadFromJsonAsync<List<PedidoResumo>>();
        pedidos.Should().HaveCount(1);
        pedidos![0].Status.Should().Be("Fechado");
    }
}
```

- [ ] **Step 3: Rodar testes para verificar que falham**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "RelatoriosControllerTests"
```
Expected: FAIL

- [ ] **Step 4: Criar RelatoriosController**

`src/RestauranteDigital.Api/Modules/Relatorios/Controllers/RelatoriosController.cs`
```csharp
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
```

- [ ] **Step 5: Rodar testes**

```bash
dotnet test tests/RestauranteDigital.Tests --filter "RelatoriosControllerTests" -v normal
```
Expected: `Passed: 3, Failed: 0`

- [ ] **Step 6: Rodar todos os testes**

```bash
dotnet test tests/RestauranteDigital.Tests
```
Expected: todos passando.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: módulo Relatórios com resumo de vendas e histórico de pedidos"
```

---

### Task 2: GerentePage — Relatórios no frontend

**Files:**
- Modify: `frontend/src/pages/gerente/GerentePage.tsx`

- [ ] **Step 1: Implementar GerentePage**

`frontend/src/pages/gerente/GerentePage.tsx`
```tsx
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { ResumoVendasResponse, PedidoResumo } from '../../api/types'
```

Adicione os tipos ao `frontend/src/api/types.ts`:
```ts
export interface ItemMaisVendido {
  itemId: number
  itemNome: string
  quantidadeTotal: number
  totalGerado: number
}

export interface ResumoVendasResponse {
  de: string
  ate: string
  totalPedidos: number
  totalFaturado: number
  tempoMedioMinutos: number
  itensMaisVendidos: ItemMaisVendido[]
}

export interface PedidoResumo {
  id: number
  mesaNumero: number
  criadoEm: string
  totalFinal: number | null
  status: string
  numeroItens: number
}
```

Implemente o componente:
```tsx
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import type { ResumoVendasResponse, PedidoResumo } from '../../api/types'

export function GerentePage() {
  const { logout } = useAuth()
  const [resumo, setResumo] = useState<ResumoVendasResponse | null>(null)
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([])
  const [de, setDe] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  const [ate, setAte] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const carregar = async () => {
    setLoading(true)
    const [r, p] = await Promise.all([
      api.get<ResumoVendasResponse>(`/relatorios/resumo?de=${de}&ate=${ate}`),
      api.get<PedidoResumo[]>(`/relatorios/pedidos?status=Fechado&de=${de}&ate=${ate}`),
    ])
    setResumo(r.data)
    setPedidos(p.data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📊 Relatórios</h1>
        <button onClick={logout} className="text-sm opacity-80">Sair</button>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Filtro de datas */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">De</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)}
              className="border rounded-lg p-2 w-full text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)}
              className="border rounded-lg p-2 w-full text-sm" />
          </div>
          <button onClick={carregar} disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {loading ? '...' : 'Filtrar'}
          </button>
        </div>

        {resumo && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-2xl font-black text-red-600">{resumo.totalPedidos}</div>
                <div className="text-xs text-gray-500 mt-1">Pedidos</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-xl font-black text-green-600">
                  R$ {resumo.totalFaturado.toFixed(2).replace('.', ',')}
                </div>
                <div className="text-xs text-gray-500 mt-1">Faturado</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                <div className="text-2xl font-black text-blue-600">
                  {resumo.tempoMedioMinutos > 0 ? `${resumo.tempoMedioMinutos}min` : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Tempo médio</div>
              </div>
            </div>

            {/* Itens mais vendidos */}
            {resumo.itensMaisVendidos.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <h2 className="font-bold mb-3">🏆 Itens mais vendidos</h2>
                {resumo.itensMaisVendidos.map((item, i) => (
                  <div key={item.itemId} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-5">{i + 1}.</span>
                      <span className="font-medium">{item.itemNome}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{item.quantidadeTotal}x</div>
                      <div className="text-xs text-gray-500">
                        R$ {item.totalGerado.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico de pedidos */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h2 className="font-bold mb-3">📋 Pedidos fechados ({pedidos.length})</h2>
              {pedidos.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum pedido no período</p>
              )}
              {pedidos.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">Mesa {p.mesaNumero} — Pedido #{p.id}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(p.criadoEm).toLocaleString('pt-BR')} · {p.numeroItens} itens
                    </div>
                  </div>
                  <div className="font-bold text-green-700">
                    R$ {(p.totalFinal ?? 0).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/pages/gerente/ frontend/src/api/types.ts
git commit -m "feat: GerentePage com relatórios de vendas e itens mais vendidos"
```

---

### Task 3: Dockerfile do backend

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Criar Dockerfile do backend**

`Dockerfile`
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY RestauranteDigital.sln .
COPY src/RestauranteDigital.Api/RestauranteDigital.Api.csproj src/RestauranteDigital.Api/
RUN dotnet restore src/RestauranteDigital.Api/RestauranteDigital.Api.csproj
COPY . .
RUN dotnet publish src/RestauranteDigital.Api -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "RestauranteDigital.Api.dll"]
```

- [ ] **Step 2: Testar build da imagem**

```bash
docker build -t restaurante-api .
```
Expected: `Successfully built <id>`

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "chore: Dockerfile do backend"
```

---

### Task 4: Dockerfile do frontend

**Files:**
- Create: `frontend/Dockerfile`
- Create: `nginx.conf`

- [ ] **Step 1: Criar nginx.conf**

`nginx.conf`
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback — qualquer rota serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para a API
    location /api/ {
        proxy_pass http://api:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket para SignalR
    location /hubs/ {
        proxy_pass http://api:8080/hubs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 2: Criar Dockerfile do frontend**

`frontend/Dockerfile`
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile nginx.conf
git commit -m "chore: Dockerfile do frontend com Nginx"
```

---

### Task 5: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Criar .env.example**

`.env.example`
```env
POSTGRES_DB=restaurante_digital
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me_in_production

JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
JWT_ISSUER=RestauranteDigital
JWT_AUDIENCE=RestauranteDigital

APP_BASE_URL=https://seu-dominio.com
APP_FRONTEND_URL=https://seu-dominio.com
```

- [ ] **Step 2: Criar docker-compose.yml**

`docker-compose.yml`
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      ConnectionStrings__Default: "Host=db;Port=5432;Database=${POSTGRES_DB};Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}"
      Jwt__Secret: ${JWT_SECRET}
      Jwt__Issuer: ${JWT_ISSUER}
      Jwt__Audience: ${JWT_AUDIENCE}
      App__BaseUrl: ${APP_BASE_URL}
      App__FrontendUrl: ${APP_FRONTEND_URL}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

- [ ] **Step 3: Testar o stack completo localmente**

```bash
cp .env.example .env
# editar .env com valores de desenvolvimento
docker compose up --build
```
Expected: todos os serviços sobem. Abrir `http://localhost` no browser — deve carregar o login.

- [ ] **Step 4: Verificar migrations no startup**

Adicione ao `Program.cs` do backend, após o seed de roles:
```csharp
// Auto-apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: Docker Compose com API, PostgreSQL e frontend"
```

---

### Task 6: Deploy em nuvem

**Files:**
- Create: `.github/workflows/deploy.yml` (opcional, para CI/CD)

- [ ] **Step 1: Opção A — Deploy em VPS (recomendado para baixo custo)**

Em um VPS Ubuntu com Docker instalado:
```bash
# 1. Clonar o repositório
git clone <repo-url> /opt/restaurante
cd /opt/restaurante

# 2. Criar .env com valores de produção
cp .env.example .env
nano .env  # preencher com valores reais

# 3. Subir o stack
docker compose up -d

# 4. Verificar logs
docker compose logs -f api
```
Expected: API responde em `http://seu-ip/api/health`

- [ ] **Step 2: Opção B — Deploy no Azure App Service**

```bash
# Login no Azure CLI
az login

# Criar Resource Group
az group create --name restaurante-rg --location brazilsouth

# Criar Azure Container Registry
az acr create --resource-group restaurante-rg --name restauranteacr --sku Basic
az acr login --name restauranteacr

# Build e push das imagens
docker build -t restauranteacr.azurecr.io/restaurante-api:latest .
docker push restauranteacr.azurecr.io/restaurante-api:latest

docker build -t restauranteacr.azurecr.io/restaurante-frontend:latest ./frontend
docker push restauranteacr.azurecr.io/restaurante-frontend:latest

# Criar App Service Plan
az appservice plan create --name restaurante-plan --resource-group restaurante-rg \
  --is-linux --sku B1

# Criar Web App para a API
az webapp create --resource-group restaurante-rg --plan restaurante-plan \
  --name restaurante-api-app --deployment-container-image-name \
  restauranteacr.azurecr.io/restaurante-api:latest

# Configurar variáveis de ambiente da API
az webapp config appsettings set --resource-group restaurante-rg \
  --name restaurante-api-app --settings \
  "ConnectionStrings__Default=Host=<postgres-host>;..." \
  "Jwt__Secret=<secret>" \
  "Jwt__Issuer=RestauranteDigital" \
  "Jwt__Audience=RestauranteDigital"
```

- [ ] **Step 3: Adicionar endpoint de health check**

Adicione ao `Program.cs` antes de `app.Run()`:
```csharp
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
```

- [ ] **Step 4: Testar sistema completo em produção**

Após deploy, verificar manualmente:
1. `GET /api/health` retorna `{ "status": "healthy" }`
2. Login com usuário Admin funciona
3. Escanear QR Code de uma mesa abre o cardápio no celular
4. Criar pedido pelo celular aparece no KDS em tempo real
5. Marcar pedido como Pronto atualiza o status
6. Gerente consegue ver relatórios de vendas

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat: sistema completo com deploy Docker e health check"
```
