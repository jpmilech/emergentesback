## Contexto rápido

Este é um backend Node.js/TypeScript simples para uma API de revenda (venda de produtos). O servidor principal está em `index.ts`. O projeto não possui um passo de build: em dev usa-se `ts-node-dev` (ver `package.json` -> script `dev`).

Principais diretórios e arquivos:
- `index.ts` — ponto de entrada; registra middlewares e rotas.
- `routes/` — rotas agrupadas por recurso (ex.: `routes/login.ts`, `routes/produtos.ts`, `routes/admins.ts`).
- `middleware/auth.ts` — middlewares de autenticação e helpers (authAdmin, authCliente, authOptional, authAdminLevel, isResourceOwner, getLoggedUserId).
- `prisma/schema.prisma` — modelo do banco (Postgres). Veja `prisma/migrations/` para histórico de migrações.
- `.env` — variáveis esperadas: `DATABASE_URL`, `JWT_KEY`, `PORT`, `NODE_ENV`, `FRONTEND_URL`.

Como o projeto funciona (fluxo essencial):
- Requisições entram em `index.ts`, que delega para os arquivos em `routes/` com prefixes como `/categorias`, `/produtos`, `/clientes` e `/admins`.
- Autenticação é baseada em JWT. Tokens são enviados via header `Authorization: Bearer <token>` e validados em `middleware/auth.ts`.
- A camada de persistência usa Prisma; os modelos e relações estão em `prisma/schema.prisma` (ex.: `Cliente`, `Admin`, `Produtos`, `Proposta`, `Categoria`).

Padrões e convenções do projeto (observáveis no código):
- Tipagem leve: projeto usa TypeScript, mas sem scripts de build personalizados — rodar em dev com `npx ts-node-dev --respawn index.ts`.
- Rotas de cliente e admin são separadas: clientes em `/clientes` (login em `/clientes/login`) e admin em `/admins` (login em `/admins/login`).
- Mensagens de erro de login usam mensagem padrão para evitar leak de informação (ver `routes/login.ts`).
- Middlewares expõem dados do usuário no tipo `AuthRequest` (definido em `middleware/auth.ts`): `adminLogadoId`, `clienteLogadoId`, etc.
- Admins têm um campo `nivel` usado para autorização por nível (`authAdminLevel`).

Operações e comandos úteis (descobertos no repositório):
- Rodar em desenvolvimento: `npm run dev` (usa `ts-node-dev`).
- Prisma (não há scripts npm para prisma no package.json): use `npx prisma generate` após alterar `schema.prisma`, e `npx prisma migrate dev --name <nome>` para aplicar migrações no DB de desenvolvimento.

Detalhes de autenticação e exemplos (importantes para gerar/validar código):
- Para criar um token de cliente (exemplo usado em `routes/login.ts`):
  - Payload: `{ clienteLogadoId: cliente.id, clienteLogadoNome: cliente.nome }`.
  - Chave: `process.env.JWT_KEY` (string)
  - Exemplo de header HTTP: `Authorization: Bearer <token>`
- `authOptional` tenta decodificar como admin primeiro, depois como cliente — rotas podem depender dessa ordem.

Observações de segurança e operações sensíveis encontradas:
- Não altere a mensagem padrão de login sem revisar o risco (o código deliberadamente oculta se o e-mail existe ou não).
- `JWT_KEY` deve ser diferente em produção; veja `.env` de exemplo.
- Senhas são armazenadas como hash (bcrypt). Ao criar novos endpoints de senha, siga o mesmo padrão de hashing/compare.

Onde olhar primeiro ao realizar mudanças:
- `routes/*` para comportamento de API e respostas JSON.
- `middleware/auth.ts` para regras de autorização e formato de token.
- `prisma/schema.prisma` e `prisma/migrations/` ao alterar o modelo de dados.

Exemplos de mudanças seguras e de baixo risco que você pode sugerir/implementar:
- Adicionar um script `prisma:generate` e `prisma:migrate` em `package.json` para consistência de desenvolvimento.
- Padronizar resposta de erro JSON (ex.: `{ error: string }`) nas rotas que ainda retornam formatos diferentes.

Se algo não estiver claro, pergunte sobre: credenciais do banco de dados em ambientes, expectativa de versionamento de migrações, e se há rotas públicas que devem usar `authOptional` versus `authCliente`.

Solicito feedback: revise se há áreas adicionais que um agente preciso saber para alterar rotas, migrações ou autenticação.
