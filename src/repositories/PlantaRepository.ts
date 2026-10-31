import { Prisma, Luminosidade } from "@prisma/client";
import prisma from "@database";

export type FiltrosPlanta = {
    luminosidade?: Luminosidade;
    petFriendly?: boolean;
    nome?: string;
    ordem?: "preco" | "nome";
};

export const createPlanta = async (data: Prisma.PlantaCreateInput) => {
    return await prisma.planta.create({
        data: data,
    });
};

// Filtros com valor undefined são ignorados pelo Prisma,
// então uma única consulta resolve todas as combinações.
export const findAllPlantas = async (filtros: FiltrosPlanta) => {
    const { luminosidade, petFriendly, nome, ordem } = filtros;

    return await prisma.planta.findMany({
        where: {
            luminosidade: luminosidade,
            petFriendly: petFriendly,
            nome: nome ? { contains: nome, mode: "insensitive" } : undefined,
        },
        orderBy: ordem ? { [ordem]: "asc" } : undefined,
    });
};

export const findEsgotadas = async () => {
    return await prisma.planta.findMany({
        where: { estoque: 0 },
    });
};

export const findPlantaById = async (id: number) => {
    return await prisma.planta.findUnique({
        where: { id: id },
    });
};

export const updatePlanta = async (id: number, data: Prisma.PlantaUpdateInput) => {
    return await prisma.planta.update({
        where: { id: id },
        data: data,
    });
};

export const deletePlanta = async (id: number) => {
    return await prisma.planta.delete({
        where: { id: id },
    });
};

// Venda atômica: o UPDATE só acontece se ainda houver estoque suficiente.
// Assim, duas compras simultâneas do último vaso não deixam o estoque negativo.
export const sellPlanta = async (id: number, quantidade: number) => {
    const resultado = await prisma.planta.updateMany({
        where: { id: id, estoque: { gte: quantidade } },
        data: { estoque: { decrement: quantidade } },
    });

    return resultado.count; // 1 = vendeu, 0 = estoque insuficiente
};

export const findPrecoEEstoque = async () => {
    return await prisma.planta.findMany({
        select: { preco: true, estoque: true },
    });
};