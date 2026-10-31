import { PrismaClient, Luminosidade } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const resultado = await prisma.planta.createMany({
    data: [
      { nome: "Costela-de-adão", especie: "Monstera deliciosa", preco: 8990, estoque: 12, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: false, regaACadaDias: 7 },
      { nome: "Samambaia", especie: "Nephrolepis exaltata", preco: 4500, estoque: 8, luminosidade: Luminosidade.MEIA_SOMBRA, petFriendly: true, regaACadaDias: 3 },
      { nome: "Espada-de-são-jorge", especie: "Dracaena trifasciata", preco: 5990, estoque: 0, luminosidade: Luminosidade.SOMBRA, petFriendly: false, regaACadaDias: 14 },
      { nome: "Suculenta Echeveria", especie: "Echeveria elegans", preco: 2500, estoque: 15, luminosidade: Luminosidade.SOL_PLENO, petFriendly: true, regaACadaDias: 10 },
      { nome: "Palmeira-areca", especie: "Dypsis lutescens", preco: 12900, estoque: 2, luminosidade: Luminosidade.SOL_PLENO, petFriendly: true, regaACadaDias: 5 },
    ],
  });

  console.log(`Seed concluído: ${resultado.count} plantas criadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());