# Progresso do Projeto

## Status atual

O projeto esta funcional em ambiente Docker e possui backend validado por testes automatizados.

Servicos Docker verificados:

- PostgreSQL: em execucao e saudavel.
- Backend: em execucao na porta `8080`.
- Frontend: em execucao na porta `3000`.

Endpoints verificados:

- `http://localhost:8080/api/health`: respondeu `200 OK`.
- `http://localhost:3000`: respondeu `200 OK`.

## Validacoes realizadas

### Backend

Os testes automatizados do backend foram executados com sucesso:

- Total: 33 testes
- Falhas: 0
- Sucesso: 33
- Ignorados: 0

Resultado: backend aprovado na suite atual.

Observacoes dos logs de teste:

- O warning de `wwwroot` ausente aparece porque o ambiente de teste nao possui pasta de arquivos estaticos.
- O warning de HTTPS aparece porque o ambiente `Testing` nao define porta HTTPS.
- Esses warnings nao impediram a execucao nem causaram falhas nos testes.

### Frontend

As dependencias foram reinstaladas com:

- `npm ci`

Resultado:

- Instalacao concluida.
- 0 vulnerabilidades reportadas pelo npm.

Verificacoes aprovadas:

- `npm run lint`: passou.
- `npx tsc -b`: passou.
- Build Docker do frontend: passou dentro do container Linux.
- `dotnet test tests/RestauranteDigital.Tests/RestauranteDigital.Tests.csproj -v minimal`: passou com 33 testes.
- `docker compose up -d --build`: passou.
- `http://localhost:8080/api/health`: respondeu `200 OK`.
- `http://localhost:3000`: respondeu `200 OK`.
- API demo validada com 8 mesas e cardapio populado.
- KDS demo validado com itens na fila.
- Relatorio demo validado com pedidos, faturamento e ranking de itens.
- Imagens demo validadas via backend em `http://localhost:8080/demo-images/agua-com-gas.png`: respondeu `200 OK`.
- Imagens demo validadas via frontend em `http://localhost:3000/demo-images/agua-com-gas.png`: respondeu `200 OK`.

Correcoes aplicadas no frontend:

- Separacao do hook `useAuth` em arquivo proprio para resolver regra de Fast Refresh.
- Criacao de `frontend/src/context/auth-context.ts`.
- Criacao de `frontend/src/context/useAuth.ts`.
- Atualizacao dos imports de `useAuth`.
- Ajuste no carregamento inicial da tela da cozinha.
- Ajuste no carregamento da tela do gerente com `useCallback`.
- Correcao do calculo de minutos de espera na tela da cozinha.
- Inclusao de atalhos de login demo por perfil.
- Proxy de `/demo-images/` no Nginx do frontend para permitir que as imagens servidas pela API aparecam no ambiente Docker.
- Proxy de `/demo-images` e `/uploads` no Vite para facilitar o uso em ambiente local de desenvolvimento.
- Ajuste dos icones das categorias para usar regras baseadas no nome da categoria, evitando casos como `Lanches` aparecer com icone de bebida.

### Demo e portfolio

Melhorias aplicadas:

- Criacao de seed demo para mesas, categorias, itens, pedidos abertos, pedidos fechados e comandas.
- Inclusao de imagens reais nos itens demo do cardapio usando a pasta `src/RestauranteDigital.Api/wwwroot/demo-images`.
- Substituicao das imagens com marca d'agua pelas versoes corrigidas enviadas pelo usuario, preservando os nomes antigos esperados pelo seeder.
- Atualizacao do README com uma secao de portfolio.
- Registro do roteiro sugerido para testar ou gravar video.

## Bloqueio atual

Os comandos abaixo ainda falham no ambiente local Windows antes de executar completamente:

- `npm run build`
- `npm run test:run`

Erro principal:

```text
Could not load node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node
spawn EPERM
```

Interpretacao:

O problema aparenta ser de permissao/execucao de binario nativo no ambiente Windows, relacionado ao Tailwind/Vite. Nao parece ser erro de TypeScript, lint ou codigo de producao, pois essas verificacoes passam e o build Docker do frontend tambem passa.

Possiveis causas:

- Windows Defender ou antivirus bloqueando o binario nativo.
- Permissoes herdadas ruins em `node_modules`.
- Execucao bloqueada por politica local.
- Problema especifico do caminho do projeto no Windows.

Possiveis proximas acoes:

- Rodar o terminal/Codex como Administrador.
- Liberar a pasta do projeto ou `frontend/node_modules` no Windows Defender.
- Mover o projeto para um caminho mais simples, por exemplo `C:\tmp\restaurante-digital`.
- Usar o Docker como ambiente principal enquanto o bloqueio local nao for resolvido.

## Estado do Git

Arquivos modificados/criados nesta etapa:

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/auth-context.ts`
- `frontend/src/context/useAuth.ts`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/admin/AdminPage.tsx`
- `frontend/src/pages/admin/AdminPage.test.tsx`
- `frontend/src/pages/cozinha/CozinhaPage.tsx`
- `frontend/src/pages/garcom/GarcomPage.tsx`
- `frontend/src/pages/gerente/GerentePage.tsx`
- `frontend/src/pages/gerente/GerentePage.test.tsx`
- `frontend/nginx.conf`
- `frontend/vite.config.ts`
- `src/RestauranteDigital.Api/Data/DemoDataSeeder.cs`
- `src/RestauranteDigital.Api/Program.cs`
- `src/RestauranteDigital.Api/wwwroot/demo-images/`
- `docs/projeto.md`
- `docs/progresso.md`
- `README.md`

Tambem existe a pasta local nao versionada `.codex/`.

## Proximos passos recomendados

1. Resolver o bloqueio local do binario `@tailwindcss/oxide`.
2. Rodar novamente `npm run build`.
3. Rodar novamente `npm run test:run`.
4. Validar manualmente os fluxos principais no navegador:
   - Login
   - Admin
   - Garcom
   - Cozinha
   - Gerente
   - Menu publico via QR Code
5. Decidir se os warnings do backend em ambiente de teste devem ser silenciados ou tratados.
