import { PrismaClient } from '@prisma/client'
import { Router, Request, Response } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

// Validação
const categoriaSchema = z.object({
  nome: z.string().min(3, {
    message: "Categoria deve possuir, no mínimo, 3 caracteres"
  })
})

// Listar categorias
router.get("/", async (req: Request, res: Response) => {
  try {
    const categorias = await prisma.categoria.findMany()
    res.status(200).json(categorias)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

// Criar nova categorias
router.post("/", async (req: Request, res: Response) => {
  const valida = categoriaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome } = valida.data

  try {
    const categorias = await prisma.categoria.create({
      data: { nome }
    })
    res.status(201).json(categorias)
  } catch (error) {
    res.status(400).json({ error })
  }
})

// Excluir categorias
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const categorias = await prisma.categoria.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(categorias)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Atualizar categorias
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params

  const valida = categoriaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome } = valida.data

  try {
    const categorias = await prisma.categoria.update({
      where: { id: Number(id) },
      data: { nome }
    })
    res.status(200).json(categorias)
  } catch (error) {
    res.status(400).json({ error })
  }
})

export default router
