import { Request, Response } from "express";
import { Luminosidade, Prisma } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";

type ResultadoValidacao =
  | { erro: string }
  | { data: Partial<Prisma.PlantaCreateInput> };

// Valida apenas os campos enviados.
// No cadastro (parcial = false) todos são obrigatórios; na edição (parcial = true) nenhum é.
// Usamos "=== undefined" e não "!campo", porque 0 e false são valores válidos.
const validarPlanta = (body: any, parcial: boolean): ResultadoValidacao => {
  const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } =
    body ?? {};

  const campos = { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };

  if (!parcial) {
    for (const [campo, valor] of Object.entries(campos)) {
      if (valor === undefined) {
        return { erro: `O campo '${campo}' é obrigatório.` };
      }
    }
  } else if (Object.values(campos).every((valor) => valor === undefined)) {
    return { erro: "Envie pelo menos um campo para editar." };
  }

  if (nome !== undefined && (typeof nome !== "string" || nome.trim() === "")) {
    return { erro: "O campo 'nome' deve ser um texto não vazio." };
  }
  if (especie !== undefined && (typeof especie !== "string" || especie.trim() === "")) {
    return { erro: "O campo 'especie' deve ser um texto não vazio." };
  }
  if (preco !== undefined && (!Number.isInteger(preco) || preco <= 0)) {
    return { erro: "O campo 'preco' deve ser um inteiro maior que zero (em centavos)." };
  }
  if (estoque !== undefined && (!Number.isInteger(estoque) || estoque < 0)) {
    return { erro: "O campo 'estoque' deve ser um inteiro maior ou igual a zero." };
  }
  if (luminosidade !== undefined && !Object.values(Luminosidade).includes(luminosidade)) {
    return {
      erro: `O campo 'luminosidade' deve ser um destes valores: ${Object.values(Luminosidade).join(", ")}.`,
    };
  }
  if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
    return { erro: "O campo 'petFriendly' deve ser true ou false." };
  }
  if (regaACadaDias !== undefined && (!Number.isInteger(regaACadaDias) || regaACadaDias < 1)) {
    return { erro: "O campo 'regaACadaDias' deve ser um inteiro maior ou igual a 1." };
  }

  // Só repassamos os campos da planta que foram enviados (nunca o req.body inteiro)
  const data: Partial<Prisma.PlantaCreateInput> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (especie !== undefined) data.especie = especie.trim();
  if (preco !== undefined) data.preco = preco;
  if (estoque !== undefined) data.estoque = estoque;
  if (luminosidade !== undefined) data.luminosidade = luminosidade;
  if (petFriendly !== undefined) data.petFriendly = petFriendly;
  if (regaACadaDias !== undefined) data.regaACadaDias = regaACadaDias;

  return { data };
};

// O id chega da URL como texto: convertemos e conferimos se é um inteiro positivo
const lerId = (req: Request): number | null => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const createPlanta = async (req: Request, res: Response) => {
  try {
    const resultado = validarPlanta(req.body, false);

    if ("erro" in resultado) {
      return res.status(400).json({ message: resultado.erro });
    }

    const planta = await PlantaRepository.createPlanta(
      resultado.data as Prisma.PlantaCreateInput
    );

    return res.status(201).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao criar planta." });
  }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    // Os filtros chegam em req.query e são sempre texto
    const { luminosidade, petFriendly, nome, ordem } = req.query;

    if (
      luminosidade !== undefined &&
      !Object.values(Luminosidade).includes(luminosidade as Luminosidade)
    ) {
      return res.status(400).json({
        message: `O filtro 'luminosidade' deve ser um destes valores: ${Object.values(Luminosidade).join(", ")}.`,
      });
    }
    if (petFriendly !== undefined && petFriendly !== "true" && petFriendly !== "false") {
      return res.status(400).json({ message: "O filtro 'petFriendly' deve ser true ou false." });
    }
    if (nome !== undefined && typeof nome !== "string") {
      return res.status(400).json({ message: "O filtro 'nome' deve ser um texto." });
    }
    if (ordem !== undefined && ordem !== "preco" && ordem !== "nome") {
      return res.status(400).json({ message: "O parâmetro 'ordem' deve ser 'preco' ou 'nome'." });
    }

    const plantas = await PlantaRepository.findAllPlantas({
      luminosidade: luminosidade as Luminosidade | undefined,
      // filtro não enviado continua undefined (não vira false)
      petFriendly: petFriendly === undefined ? undefined : petFriendly === "true",
      nome: nome as string | undefined,
      ordem: ordem as "preco" | "nome" | undefined,
    });

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const readEsgotadas = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findEsgotadas();

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas esgotadas." });
  }
};

export const readPlantaById = async (req: Request, res: Response) => {
  try {
    const id = lerId(req);

    if (id === null) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    return res.status(200).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar planta." });
  }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req);

    if (id === null) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const resultado = validarPlanta(req.body, true);

    if ("erro" in resultado) {
      return res.status(400).json({ message: resultado.erro });
    }

    // Antes de editar, garantimos que a planta existe (senão o erro viraria 500)
    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const plantaAtualizada = await PlantaRepository.updatePlanta(id, resultado.data);

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req);

    if (id === null) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    await PlantaRepository.deletePlanta(id);

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar planta." });
  }
};

export const sellPlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req);

    if (id === null) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const quantidade = req.body?.quantidade;

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return res
        .status(400)
        .json({ message: "O campo 'quantidade' deve ser um inteiro maior que zero." });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    if (planta.estoque < quantidade) {
      return res
        .status(400)
        .json({ message: `Temos só ${planta.estoque} vasos em estoque.` });
    }

    // Venda atômica: protege contra duas compras simultâneas do último vaso
    const vendidos = await PlantaRepository.sellPlanta(id, quantidade);

    if (vendidos === 0) {
      return res.status(400).json({ message: "Estoque insuficiente para esta venda." });
    }

    const plantaAtualizada = await PlantaRepository.findPlantaById(id);

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao vender planta." });
  }
};

export const readValorTotalEstoque = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPrecoEEstoque();

    // Com a loja vazia, o reduce devolve 0 nos dois valores
    const valorTotalEmCentavos = plantas.reduce(
      (soma, planta) => soma + planta.preco * planta.estoque,
      0
    );
    const totalDeVasos = plantas.reduce((soma, planta) => soma + planta.estoque, 0);

    return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao calcular o valor do estoque." });
  }
};