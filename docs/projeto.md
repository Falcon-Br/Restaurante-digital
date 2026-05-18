# Restaurante Digital

## Visao geral

O Restaurante Digital e um sistema completo para gestao operacional de restaurantes. A proposta e centralizar o fluxo de cardapio, pedidos, cozinha, comandas, mesas e relatorios em uma aplicacao web com atualizacoes em tempo real.

O projeto atende quatro perfis principais:

- Cliente: acessa o cardapio por QR Code da mesa e envia pedidos.
- Garcom: gerencia mesas, abre pedidos e acompanha comandas.
- Cozinha: acompanha os pedidos no KDS e atualiza o preparo dos itens.
- Admin/Gerente: administra cardapio, mesas e acompanha relatorios de venda.

## Objetivo

Reduzir atrito entre atendimento, cozinha e fechamento de contas, permitindo que os pedidos sejam registrados de forma digital, enviados rapidamente para a cozinha e acompanhados em tempo real pelos perfis envolvidos.

## Uso como portfolio e demo

Este projeto tambem funciona como uma demonstracao pratica de desenvolvimento full stack. Ele foi pensado para ser apresentado em portfolio, entrevista tecnica ou video explicativo, mostrando um fluxo completo de produto em vez de apenas telas isoladas.

Pontos fortes para demonstracao:

- Fluxo real de negocio com varios perfis.
- Dados demo criados automaticamente.
- Login rapido por perfil na tela inicial.
- Backend com testes automatizados.
- Atualizacoes em tempo real com SignalR.
- Ambiente Docker para facilitar execucao local.

## Principais funcionalidades

- Cardapio digital acessivel via QR Code.
- Login com perfis e rotas protegidas.
- Cadastro e gerenciamento de categorias e itens do cardapio.
- Controle de disponibilidade de itens.
- Cadastro de mesas e geracao de QR Code.
- Pedidos por mesa.
- Sistema de comandas por mesa, incluindo comandas separadas por cliente.
- KDS para cozinha com fila de preparo.
- Atualizacao de status dos itens de pedido.
- Marcacao de itens como esgotados.
- Relatorios de pedidos, faturamento, itens vendidos e comandas fechadas.
- Comunicacao em tempo real com SignalR.

## Arquitetura

O projeto e dividido em backend, frontend, banco de dados e infraestrutura local com Docker Compose.

### Backend

- ASP.NET Core Web API
- .NET 10
- Entity Framework Core
- PostgreSQL
- ASP.NET Core Identity
- JWT
- SignalR

O backend fica em `src/RestauranteDigital.Api` e organiza os recursos por modulos:

- Auth
- Cardapio
- Mesas
- Pedidos
- KDS
- Relatorios

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- SignalR client
- Axios

O frontend fica em `frontend` e possui telas para:

- Login
- Admin
- Garcom
- Cozinha
- Gerente
- Menu publico do cliente

### Banco de dados

O banco principal e PostgreSQL. Em testes automatizados do backend, o projeto usa provider in-memory do Entity Framework.

### Docker

O ambiente Docker Compose sobe:

- `db`: PostgreSQL
- `backend`: API ASP.NET Core
- `frontend`: aplicacao React servida por Nginx

URLs locais principais:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`

## Usuarios de teste

O backend cria usuarios padrao no startup quando necessario:

| Perfil | Email | Senha |
| --- | --- | --- |
| Admin | `admin@restaurante.com` | `123456` |
| Garcom | `garcom@restaurante.com` | `123456` |
| Cozinha | `cozinha@restaurante.com` | `123456` |
| Gerente | `gerente@restaurante.com` | `123456` |

## Estado esperado do produto

O produto deve funcionar como uma ferramenta operacional, nao como uma landing page. A primeira experiencia relevante deve permitir executar tarefas reais do restaurante: acessar cardapio, registrar pedidos, acompanhar cozinha, administrar dados e consultar resultados.
