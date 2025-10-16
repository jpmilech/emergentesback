import { PrismaClient } from "@prisma/client"
import { Router, Request } from "express"
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { authAdmin, authCliente, AuthRequest } from '../middleware/auth'


const prisma = new PrismaClient()
const router = Router()

const clienteSchema = z.object({
  nome: z.string().min(10, {
    message: "Nome do cliente deve possuir, no mínimo, 10 caracteres"
  }),
  email: z.string().email({ message: "Informe um e-mail válido" }),
  senha: z.string(),
  cidade: z.string()
})

// Rotas públicas
router.post("/", async (req, res) => {
  const valida = clienteSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    return res.status(400).json({ erro: erros.join("; ") })
  }

  // Verificar se email já existe
  const clienteExistente = await prisma.cliente.findFirst({
    where: { email: valida.data.email }
  })

  if (clienteExistente) {
    return res.status(400).json({ erro: "E-mail já cadastrado" })
  }

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  const { nome, email, cidade } = valida.data

  try {
    const cliente = await prisma.cliente.create({
      data: { nome, email, senha: hash, cidade },
      select: {
        id: true,
        nome: true,
        email: true,
        cidade: true,
        createdAt: true
      }
    })
    res.status(201).json(cliente)
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Rotas protegidas
router.get("/", authAdmin, async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cidade: true,
        createdAt: true,
        updatedAt: true
      }
    })
    res.status(200).json(clientes)
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

router.get("/:id", authCliente, async (req: AuthRequest, res) => {
  const { id } = req.params
  
  // Verificar se o cliente está acessando seus próprios dados
  if (id !== req.clienteLogadoId) {
    return res.status(403).json({ erro: "Acesso negado" })
  }

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.clienteLogadoId },
      select: {
        id: true,
        nome: true,
        email: true,
        cidade: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!cliente) {
      return res.status(404).json({ erro: "Cliente não encontrado" })
    }

    res.status(200).json(cliente)
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})
function validaSenha(senha: string) {
  const mensa: string[] = []

  if (senha.length < 8) {
    mensa.push("Senha deve possuir, no mínimo, 8 caracteres")
  }

  let pequenas = 0
  let grandes = 0
  let numeros = 0
  let simbolos = 0

  for (const letra of senha) {
    if ((/[a-z]/).test(letra)) pequenas++
    else if ((/[A-Z]/).test(letra)) grandes++
    else if ((/[0-9]/).test(letra)) numeros++
    else simbolos++
  }

  if (pequenas == 0) mensa.push("Senha deve possuir letra(s) minúscula(s)")
  if (grandes == 0) mensa.push("Senha deve possuir letra(s) maiúscula(s)")
  if (numeros == 0) mensa.push("Senha deve possuir número(s)")
  if (simbolos == 0) mensa.push("Senha deve possuir símbolo(s)")

  return mensa
}

export default router