import { Unidade, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

// Validação com Zod
const produtoSchema = z.object({
  nome: z.string().min(2, {
    message: "Nome deve possuir, no mínimo, 2 caracteres"
  }),
  descricao: z.string().nullable().optional(),
  preco: z.number(),
  estoque: z.number().min(0),
  foto: z.string().nullable().optional(),
  unidade: z.nativeEnum(Unidade).optional(),
  destaque: z.boolean().optional(),
  categoriaId: z.number(),
})

const produtoUpdateSchema = produtoSchema.partial()

// Listar todos os produtos
router.get("/", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: {
        categoria: true,
      }
    })
    res.status(200).json(produtos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Buscar produto por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const produto = await prisma.produto.findFirst({
      where: { id: Number(id) },
      include: {
        categoria: true,
      }
    })
    res.status(200).json(produto)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Cadastrar novo produto
router.post("/", async (req, res) => {
  const valida = produtoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const {
    nome, descricao = null, preco, estoque,
    foto = null, unidade = 'UNIDADE',
    destaque = false, categoriaId
  } = valida.data

  try {
    const produto = await prisma.produto.create({
      data: {
        nome, descricao, preco, estoque,
        foto, unidade, destaque, categoriaId
      }
    })
    res.status(201).json(produto)
  } catch (error) {
    res.status(400).json({ error })
  }
})

// Excluir produto
router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const produto = await prisma.produto.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(produto)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Atualizar produto
router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = produtoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const {
    nome, descricao, preco, estoque,
    foto, unidade, destaque, categoriaId
  } = valida.data

  try {
    const produto = await prisma.produto.update({
      where: { id: Number(id) },
      data: {
        nome, descricao, preco, estoque,
        foto, unidade, destaque, categoriaId
      }
    })
    res.status(200).json(produto)
  } catch (error) {
    res.status(400).json({ error })
  }
})

// Atualizar parcialmente produto
router.patch("/:id", async (req, res) => {
  const { id } = req.params

  const valida = produtoUpdateSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const produto = await prisma.produto.update({
      where: { id: Number(id) },
      data: valida.data, // só os campos enviados são aplicados
    })
    res.status(200).json(produto)
  } catch (error) {
    res.status(400).json({ error })
  }
})



// Pesquisa de produtos (por nome, categoria, preço ou estoque)
router.get("/pesquisa/:termo", async (req, res) => {
  const { termo } = req.params
  const termoNumero = Number(termo)

  if (isNaN(termoNumero)) {
    // Pesquisa por texto
    try {
      const produtos = await prisma.produto.findMany({
        include: { categoria: true },
        where: {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { categoria: { nome: { contains: termo, mode: "insensitive" } } }
          ]
        }
      })
      res.status(200).json(produtos)
    } catch (error) {
      res.status(500).json({ erro: error })
    }
  } else {
    // Pesquisa numérica
    try {
      const produtos = await prisma.produto.findMany({
        include: { categoria: true },
        where: {
          OR: [
            { preco: { lte: termoNumero } },   // preço até X
            { estoque: { gte: termoNumero } }  // estoque maior/igual a X
          ]
        }
      })
      res.status(200).json(produtos)
    } catch (error) {
      res.status(500).json({ erro: error })
    }
  }
})

export default router
