import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()
const router = Router()

router.post("/", async (req: Request, res: Response) => {
  const { email, senha } = req.body

  // Mensagem padrão para evitar revelar detalhes em caso de falha
  const mensaPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    return res.status(400).json({ erro: mensaPadrao })
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { email }
    })

    if (!cliente) {
      return res.status(400).json({ erro: mensaPadrao })
    }

    // Verifica senha com bcrypt
    const senhaConfere = bcrypt.compareSync(senha, cliente.senha)
    if (!senhaConfere) {
      return res.status(400).json({ erro: mensaPadrao })
    }

    // Gera JWT
    const token = jwt.sign(
      {
        clienteLogadoId: cliente.id,
        clienteLogadoNome: cliente.nome,
        clienteLogadoEmail: cliente.email
      },
      process.env.JWT_KEY as string,
      { expiresIn: "1h" }
    )

    return res.status(200).json({
      id: cliente.id,
      nome: cliente.nome,
      email: cliente.email,
      token
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ erro: "Erro interno no servidor" })
  }
})

export default router
