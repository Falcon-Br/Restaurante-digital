# Restaurante Digital

Sistema completo de gestão de pedidos para restaurantes, com cardápio digital via QR Code, KDS (Kitchen Display System) para a cozinha, sistema de comandas por mesa e relatórios em tempo real.

## Funcionalidades

### Por perfil de acesso

**Garçom**
- Visualiza mesas com status (Livre / Ocupada) atualizado em tempo real
- Abre pedidos por mesa via cardápio interno
- Sistema de comandas: todos os pedidos vão para uma comanda única por padrão; o garçom pode criar comandas separadas por cliente (ex: "João", "Maria") para pagamentos individuais
- Ao enviar um pedido com múltiplas comandas abertas, o sistema pergunta para qual comanda o pedido vai
- Fecha comandas individualmente com somatória automática dos itens

**Cliente (via QR Code)**
- Acessa o cardápio pelo celular escaneando o QR da mesa
- Adiciona itens com quantidade e observação
- Envia o pedido diretamente para a cozinha; o pedido vai automaticamente para a comanda da mesa

**Cozinha (KDS)**
- Visualiza todos os itens pendentes agrupados por pedido
- Cada card exibe cor de urgência: branco (< 5 min), amarelo (5–14 min), vermelho (≥ 15 min)
- Marca itens como prontos individualmente
- Marca itens como esgotados (desativa no cardápio em tempo real para todos)

**Administrador**
- Gerencia categorias do cardápio (com flag "Precisa ser preparado na cozinha")
- Gerencia itens: nome, descrição, preço, disponibilidade
- Gerencia mesas: cadastro, exclusão (com proteção para mesas ocupadas) e geração de QR Code
- Todas as alterações refletem em tempo real via SignalR

**Gerente**
- Relatórios de vendas com filtro de período
- Total de pedidos, faturamento e tempo médio de preparo
- Ranking dos itens mais vendidos
- Histórico completo de pedidos fechados

### Tempo real
Todas as telas são reativas via **SignalR** — não há necessidade de recarregar a página. Eventos: novo pedido, status de item atualizado, item esgotado/disponível, pedido fechado, pedido cancelado, mesas criadas/removidas.

---

## Stack

| Camada     | Tecnologia                                              |
|------------|---------------------------------------------------------|
| Backend    | .NET 10, ASP.NET Core Web API, EF Core 10, SignalR      |
| Banco      | PostgreSQL 17                                           |
| Auth       | ASP.NET Core Identity + JWT                             |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS v4             |
| Tempo real | SignalR (`@microsoft/signalr`)                          |
| Testes     | xUnit, WebApplicationFactory, FluentAssertions          |
| Deploy     | Docker Compose                                          |

---

## Instalação local

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

### Subir com Docker Compose

```bash
git clone https://github.com/seu-usuario/restaurante-digital.git
cd restaurante-digital
docker compose up --build
```

Aguarde o build (~2 min na primeira vez). Quando estiver pronto:

| Serviço   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost:3000    |
| API       | http://localhost:8080    |
| Banco     | localhost:5432           |

O banco é criado e as migrations são aplicadas automaticamente no startup.

### Rotas principais para navegação

| Público / Perfil | URL | Uso |
|------------------|-----|-----|
| Apresentação pública | http://localhost:3000/ | Página inicial para entender o produto e acessar a demo |
| Login interno | http://localhost:3000/login | Entrada dos perfis Admin, Garçom, Cozinha e Gerente |
| Cardápio do cliente | http://localhost:3000/menu/{token-da-mesa} | Link público usado no QR Code de cada mesa |

O cardápio do cliente não exige login. O mesmo endereço gerado para a mesa pode ser aberto por QR Code ou compartilhado como link direto.

### Usuários de teste (criados automaticamente)

| Perfil    | Email                   | Senha  |
|-----------|-------------------------|--------|
| Admin     | admin@restaurante.com   | 123456 |
| Garçom    | garcom@restaurante.com  | 123456 |
| Cozinha   | cozinha@restaurante.com | 123456 |
| Gerente   | gerente@restaurante.com | 123456 |

---

## Desenvolvimento local (sem Docker)

### Pré-requisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- PostgreSQL rodando localmente

### Backend

```bash
cd src/RestauranteDigital.Api

# Configurar connection string (ou usar variável de ambiente)
# appsettings.Development.json já aponta para localhost:5432

dotnet run
# API disponível em http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend disponível em http://localhost:5173
```

Para validar o build local de produção:

```bash
npm run build
```

### Testes

```bash
cd tests/RestauranteDigital.Tests
dotnet test
```

---

## Variáveis de ambiente (produção)

| Variável                        | Descrição                              | Exemplo                        |
|---------------------------------|----------------------------------------|--------------------------------|
| `ConnectionStrings__Default`    | Connection string do PostgreSQL        | `Host=db;Database=...`         |
| `Jwt__Secret`                   | Chave secreta para assinar tokens JWT  | string longa e aleatória       |
| `Jwt__Issuer`                   | Issuer do JWT                          | `RestauranteDigital`           |
| `Jwt__Audience`                 | Audience do JWT                        | `RestauranteDigital`           |
| `App__BaseUrl`                  | URL pública da API                     | `https://api.seudominio.com`   |
| `App__FrontendUrl`              | URL pública do frontend (CORS e QR Code) | `https://seudominio.com`     |

> **Importante:** em produção, troque o `Jwt__Secret` do `docker-compose.yml` por uma string forte e única.

---

## Estrutura do projeto

```
restaurante-digital/
├── src/
│   └── RestauranteDigital.Api/
│       ├── Modules/
│       │   ├── Auth/          # Login, JWT, Identity
│       │   ├── Cardapio/      # Categorias e Itens
│       │   ├── Mesas/         # Mesas e Comandas
│       │   ├── Pedidos/       # Pedidos e itens de pedido
│       │   ├── KDS/           # Fila da cozinha
│       │   └── Relatorios/    # Relatórios de vendas
│       ├── Hubs/              # SignalR Hub
│       ├── Data/              # DbContext e Migrations
│       └── Program.cs
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── admin/         # AdminPage
│       │   ├── cozinha/       # CozinhaPage (KDS)
│       │   ├── garcom/        # GarcomPage
│       │   ├── gerente/       # GerentePage
│       │   └── menu/          # MenuPage (QR público)
│       ├── hooks/             # useSignalR
│       ├── api/               # client axios + types
│       └── context/           # AuthContext
├── tests/
│   └── RestauranteDigital.Tests/
├── docker-compose.yml
└── README.md
```

---

## Licença

MIT

---

## Projeto de portfolio

Este projeto foi criado como uma demonstracao full stack de um fluxo real de restaurante: o cliente faz o pedido pelo cardapio digital, a cozinha recebe a demanda em tempo real, o garcom acompanha mesas e comandas, e o gerente consulta resultados operacionais.

O sistema pode ser usado como demo navegavel. Ao subir o ambiente, a tela de login oferece atalhos para entrar como Admin, Garcom, Cozinha ou Gerente sem digitar as credenciais manualmente.

### O que este projeto demonstra

- Backend modular com ASP.NET Core, EF Core, Identity, JWT e SignalR.
- Frontend React com TypeScript, rotas protegidas e telas por perfil.
- Banco PostgreSQL com migrations e dados de demonstracao.
- Comunicacao em tempo real entre pedidos, cozinha, mesas e relatorios.
- Testes automatizados no backend.
- Ambiente local reproduzivel com Docker Compose.

### Fluxo sugerido para testar ou gravar video

1. Entrar como Admin e revisar cardapio/mesas.
2. Acessar um cardapio publico de mesa por QR Code/link.
3. Enviar um pedido como cliente.
4. Entrar como Cozinha e marcar itens como prontos ou esgotados.
5. Entrar como Garcom e acompanhar mesas/comandas.
6. Entrar como Gerente e revisar relatorios e historico.
