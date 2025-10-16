import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { authAdmin } from '../middleware/auth'

const prisma = new PrismaClient()
const router = Router()

const adminSchema = z.object({
  nome: z.string().min(10,
    { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  email: z.string().email(),
  senha: z.string(),
  nivel: z.number()
    .min(1, { message: "Nível, no mínimo, 1" })
    .max(5, { message: "Nível, no máximo, 5" })
})

// ROTA PÚBLICA para criar primeiro admin (sem autenticação)
router.post("/primeiro-admin", async (req, res) => {
  // Verificar se já existe algum admin no sistema
  const adminsExistentes = await prisma.admin.count()
  
  if (adminsExistentes > 0) {
    return res.status(400).json({ erro: "Já existe um administrador cadastrado no sistema" })
  }

  const valida = adminSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    return res.status(400).json({ erro: erros.join("; ") })
  }

  // Verificar se email já existe
  const adminExistente = await prisma.admin.findFirst({
    where: { email: valida.data.email }
  })

  if (adminExistente) {
    return res.status(400).json({ erro: "E-mail já cadastrado" })
  }

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  const { nome, email, nivel } = valida.data

  try {
    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel: nivel || 5 }, // Nível 5 = super admin
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        createdAt: true
      }
    })
    res.status(201).json(admin)
  } catch (error) {
    console.error("Erro ao criar admin:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// ROTAS PROTEGIDAS (apenas para admins autenticados)
router.use(authAdmin)

router.get("/", async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        createdAt: true,
        updatedAt: true
      }
    })
    res.status(200).json(admins)
  } catch (error) {
    console.error("Erro ao buscar admins:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Criar admin (após primeiro admin já estar criado)
router.post("/", async (req, res) => {
  const valida = adminSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }

  const erros = validaSenha(valida.data.senha)
  if (erros.length > 0) {
    return res.status(400).json({ erro: erros.join("; ") })
  }

  // Verificar se email já existe
  const adminExistente = await prisma.admin.findFirst({
    where: { email: valida.data.email }
  })

  if (adminExistente) {
    return res.status(400).json({ erro: "E-mail já cadastrado" })
  }

  const salt = bcrypt.genSaltSync(12)
  const hash = bcrypt.hashSync(valida.data.senha, salt)

  const { nome, email, nivel } = valida.data

  try {
    const admin = await prisma.admin.create({
      data: { nome, email, senha: hash, nivel },
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        createdAt: true
      }
    })
    res.status(201).json(admin)
  } catch (error) {
    console.error("Erro ao criar admin:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const admin = await prisma.admin.findFirst({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!admin) {
      return res.status(404).json({ erro: "Admin não encontrado" })
    }
    
    res.status(200).json(admin)
  } catch (error) {
    console.error("Erro ao buscar admin:", error)
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