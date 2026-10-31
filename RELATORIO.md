# Relatório · Folhagem & Cia

**Candidato:** Gabriel  
**Branch:** `desafio/gabrielfa`  
**Repositório:** https://github.com/Gfal0/repositorio-desafio-dev

## 1. O que foi feito

**Rotas obrigatórias (todas implementadas e testadas):**

| Rota | Sucesso |
|---|---|
| `POST /plantas` | 201 |
| `GET /plantas` (com `?luminosidade=` e `?petFriendly=`, sozinhos ou juntos) | 200 |
| `GET /plantas/:id` | 200 |
| `PATCH /plantas/:id` | 200 |
| `DELETE /plantas/:id` | 204 |
| `POST /plantas/:id/venda` | 200 |
| `GET /plantas/estoque/valor-total` | 200 |

**Regras de negócio:** as 7 regras do enunciado (campos obrigatórios, `preco > 0`, `regaACadaDias >= 1`, `estoque >= 0`, enum de luminosidade, 400 com mensagem clara, 404 para id inexistente, venda que nunca deixa o estoque negativo).

**Bônus implementados:**
- Busca por nome sem diferenciar maiúsculas (`?nome=costela`)
- Ordenação (`?ordem=preco` ou `?ordem=nome`)
- Rota `GET /plantas/esgotadas`
- Script de seed (`prisma/seed.ts`)

**O que ficou de fora:** nada. Todos os itens obrigatórios e os bônus foram implementados e testados.

**Como rodar o seed:** como o `DATABASE_URL` usa o nome do container do banco, o seed precisa rodar dentro do Docker:
`docker compose exec server npx ts-node prisma/seed.ts`. O seed apenas insere, então rodá-lo duas vezes duplica as plantas.

## 2. Como foi feito

**Ordem de trabalho:** 1) model e migration, 2) repository, 3) controller, 4) rotas, 5) testes no Thunder Client, 6) bônus e seed, 7) relatório.

**Commits:** um para o model e a migration, um para repository, controller e rotas juntos, e um para o seed e o relatório.

**Organização:** segui as camadas do CRUD de usuário (routes → controller → repository → Prisma), com os mesmos imports com alias (`@database`, `@repositories`, `@controllers`) e o mesmo formato de resposta de erro (`{ message: "..." }`).

**Decisões de validação:**
- Validei com `campo === undefined` e não com `!campo`, porque `estoque: 0` e `petFriendly: false` são valores válidos.
- Usei uma única função `validarPlanta(body, parcial)` para o POST (todos os campos obrigatórios) e o PATCH (só os enviados, mas com as mesmas regras).
- `Number.isInteger` para os números, o que recusa `"8990"` (texto), `1.5` e `NaN`. Para o enum, `Object.values(Luminosidade).includes(...)`.
- Só os campos da planta são repassados ao banco, nunca o `req.body` inteiro.
- O PATCH e o DELETE buscam a planta antes, para responder 404 em vez de deixar o erro do Prisma virar 500.
- Nos filtros, `?petFriendly=true` vira `true` e `?petFriendly=false` vira `false`, mas um filtro não enviado continua `undefined`, porque o Prisma ignora condições `undefined`. Filtro inválido dá 400; filtro válido sem resultado dá 200 com `[]`.
- As rotas fixas (`/plantas/esgotadas` e `/plantas/estoque/valor-total`) foram registradas antes de `/plantas/:id`, senão o Express trataria "esgotadas" como um id.

**Venda e concorrência (a pergunta do enunciado):** conferir `estoque >= quantidade` e depois diminuir tem uma brecha. Se duas pessoas comprarem o último vaso ao mesmo tempo, as duas podem passar pela conferência antes de qualquer uma diminuir, e o estoque ficaria negativo. Para evitar isso, a diminuição é feita com `updateMany`, filtrando por `estoque >= quantidade` e usando `decrement`. Assim, a própria atualização no banco só acontece se ainda houver estoque suficiente. Se duas vendas disputarem o último vaso, o banco executa uma de cada vez: a primeira altera a linha, e a segunda já não encontra nenhuma linha que atenda à condição, devolve 0 linhas alteradas e a API responde 400. O estoque nunca fica negativo. Não testei essa corrida na prática com duas requisições simultâneas; testei a regra normal (vender mais do que existe devolve 400 e não altera nada).

**Valor total:** busco só `preco` e `estoque` com `select` e calculo com `reduce` no código, já que o `aggregate` do Prisma não multiplica colunas. Com a loja vazia, o `reduce` começa em `0`, então a resposta deve ser 200 com os valores zerados (não testei esse caso na prática).

**Decisões além do enunciado:**
- `PATCH` com corpo vazio devolve 400 ("Envie pelo menos um campo para editar.").
- Nomes e espécies são salvos sem espaços nas pontas (`trim`).
- Os handlers seguem os nomes do projeto (`readAllPlantas`, `readPlantaById`).
- Mantive o `console.error(error)` dentro dos `catch`, como já faz o `UserController`.
- A listagem sem `?ordem=` não tem ordem garantida (é a ordem que o PostgreSQL devolver); o enunciado não pede ordem fixa.

## 3. Principais dificuldades

1. **O Docker não abria.** O Docker Desktop mostrava "Virtualization support not detected". Percebi pelo rodapé "Engine stopped". Resolvi ligando a virtualização na BIOS e ativando os recursos do Windows (Plataforma de Máquina Virtual e WSL).
2. **O push deu erro 403.** Eu tinha clonado o repositório original, que é um *template*, e não tinha permissão de escrita nele. Resolvi criando um repositório meu a partir do template (botão "Use this template") e apontando o `origin` para ele.
3. **O primeiro cadastro deu 500.** A resposta só dizia "Erro ao criar planta." Olhei os logs com `docker compose logs` e vi `Cannot convert undefined or null to object` em `Object.values(Luminosidade)`. A causa era que o Prisma Client dentro do container tinha sido gerado antes da migration da Planta e não conhecia o enum. Resolvi com `docker compose restart server`. O `yarn typecheck` passava porque o client do meu computador estava atualizado; o do container não.
4. **Nunca tinha usado um cliente HTTP.** Aprendi a usar o Thunder Client do zero: trocar o método, mandar o corpo em JSON e ler o status da resposta.
5. **Erro de digitação na URL.** Enviei um PATCH para `/plantas1` (sem a barra) e recebi "Rota não encontrada". Percebi que a mensagem não era a do meu controller ("Planta não encontrada.") e corrigi o endereço.
6. **O seed falhou fora do Docker.** `npx tsx prisma/seed.ts` deu `Can't reach database server at treinamento-crud-db:5432`, porque esse nome só existe dentro da rede do Docker. Rodei o seed dentro do container e funcionou.
7. **Falta de memória no computador.** O computador travou durante os testes por causa do Docker. Mais tarde, o `yarn typecheck` deu `JavaScript heap out of memory` e o terminal do VS Code travou. Parei os containers, reiniciei o computador e rodei o typecheck de novo, que passou sem erros (`Done in 2.38s.`), já com o seed no projeto.

## 4. Uso de IA

**Ferramenta:** Claude (Anthropic).

**Para que usei:**
- Gerar o código do `PlantaRepository`, do `PlantaController`, das rotas e do seed, seguindo o padrão do `UserRepository` e do `UserController` que eu mostrei a ela.
- Receber um passo a passo de setup e de testes, e entender erros (Docker, 403 no push, 500 no cadastro, falha do seed, falta de memória no typecheck).
- Tirar dúvidas, por exemplo sobre como usar o Thunder Client.

**Como conferi o que ela gerou:**
- Rodei `yarn typecheck`, que passou sem erros, inclusive depois de adicionar o seed.
- Testei os casos da tabela do enunciado no Thunder Client (201, 400, 404, 200 e 204) e os bônus, e conferi a conta do valor total na mão (135900 centavos e 18 vasos naquele momento, com as plantas 1, 2 e 3). Testei também vendas com quantidade em texto, decimal e ausente (todas 400, com o estoque inalterado). Não testei a loja vazia.
- Confirmei que requisições inválidas não alteram dados (por exemplo, a venda de 999 vasos deixou o estoque em 10).
- Li os logs e as mensagens de erro quando algo falhou.

**O que aprendi:**
- Por que `!campo` não serve para validar: `!0` e `!false` são verdadeiros e recusariam `estoque: 0` e `petFriendly: false`, que são válidos.
- Que o servidor dentro do Docker e o meu Windows são ambientes separados: um comando que funciona em um pode falhar no outro (o Prisma Client do container e o endereço do banco).
- Que o 404 de uma rota (`Rota não encontrada`) e o 404 de um recurso (`Planta não encontrada.`) são coisas diferentes, e que ler a mensagem ajuda a achar o erro.
- Como diminuir o estoque de forma segura contra compras simultâneas, deixando a conferência dentro da própria atualização do banco.

**Declaração:** o código foi escrito com ajuda da IA, e eu o testei e revisei.