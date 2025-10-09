import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const router = Router()
const prisma = new PrismaClient()

// POST /clientes/cadastro
router.post("/cadastro", async (req: Request, res: Response) => {
  const { nome, email, senha, cidade } = req.body

  // Verifica campos obrigatórios
  if (!nome || !email || !senha || !cidade) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios" })
  }

  try {
    // Verifica se email já existe
    const clienteExistente = await prisma.cliente.findFirst({ where: { email } })
    if (clienteExistente) {
      return res.status(400).json({ erro: "E-mail já cadastrado" })
    }

    // Criptografa a senha
    const senhaHash = bcrypt.hashSync(senha, 10)

    // Cria cliente
    const novoCliente = await prisma.cliente.create({
      data: { nome, email, senha: senhaHash, cidade }
    })

    return res.status(201).json({
      id: novoCliente.id,
      nome: novoCliente.nome,
      email: novoCliente.email,
      cidade: novoCliente.cidade
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: "Erro interno no servidor" })
  }
})

export default router
