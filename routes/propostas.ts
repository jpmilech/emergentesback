import { PrismaClient } from "@prisma/client"
import { Router } from "express"
import { z } from 'zod'
import { authAdmin, authCliente, AuthRequest, authOptional, canAccessResource, getUserType } from '../middleware/auth'

const prisma = new PrismaClient()
const router = Router()

const propostaSchema = z.object({
  clienteId: z.string().uuid(),
  produtoId: z.number().min(1),
  descricao: z.string().min(10, {
    message: "Descrição da Proposta deve possuir, no mínimo, 10 caracteres" 
  }),
})

// Rotas públicas (criação de proposta)
router.post("/", async (req, res) => {
  const valida = propostaSchema.safeParse(req.body)
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }  

  const { clienteId, produtoId, descricao } = valida.data

  // Verificar se cliente existe
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId }
  })

  if (!cliente) {
    return res.status(400).json({ erro: "Cliente não encontrado" })
  }

  // Verificar se produto existe
  const produto = await prisma.produtos.findUnique({
    where: { id: produtoId }
  })

  if (!produto) {
    return res.status(400).json({ erro: "Produto não encontrado" })
  }

  try {
    const proposta = await prisma.proposta.create({
      data: { 
        clienteId, 
        produtoId, 
        descricao 
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        produto: {
          include: {
            categorias: true,
            admins: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        }
      }
    })
    res.status(201).json(proposta)
  } catch (error) {
    console.error("Erro ao criar proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Rotas protegidas
// Listar todas as propostas (apenas admin)
router.get("/", authAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '10', status } = req.query
    
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    let whereCondition: any = {}

    // Filtro por status
    if (status === 'respondidas') {
      whereCondition.resposta = { not: null }
    } else if (status === 'pendentes') {
      whereCondition.resposta = null
    }

    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where: whereCondition,
        include: {
          cliente: {
            select: {
              id: true,
              nome: true,
              email: true,
              cidade: true
            }
          },
          produto: {
            include: {
              categorias: true,
              admins: {
                select: {
                  id: true,
                  nome: true,
                  email: true
                }
              }
            }
          },
          admin: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.proposta.count({ where: whereCondition })
    ])

    res.status(200).json({
      propostas,
      paginacao: {
        pagina: pageNum,
        limite: limitNum,
        total,
        totalPaginas: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar propostas:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Listar propostas do cliente logado
router.get("/minhas-propostas", authCliente, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '10' } = req.query
    
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [propostas, total] = await Promise.all([
      prisma.proposta.findMany({
        where: { clienteId: req.clienteLogadoId }, 
        include: {
          produto: {
            include: {
              categorias: true,
              admins: {
                select: {
                  id: true,
                  nome: true,
                  email: true
                }
              }
            }
          },
          admin: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.proposta.count({ where: { clienteId: req.clienteLogadoId } })
    ])

    res.status(200).json({
      propostas,
      paginacao: {
        pagina: pageNum,
        limite: limitNum,
        total,
        totalPaginas: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error("Erro ao buscar propostas do cliente:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Rota para admin responder proposta
router.put("/:id/responder", authAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  const { resposta } = req.body

  if (!resposta || resposta.trim().length === 0) {
    return res.status(400).json({ erro: "Resposta é obrigatória" })
  }

  if (resposta.trim().length < 5) {
    return res.status(400).json({ erro: "Resposta deve possuir, no mínimo, 5 caracteres" })
  }

  try {
    // Verificar se proposta existe
    const propostaExistente = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!propostaExistente) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    const proposta = await prisma.proposta.update({
      where: { id: Number(id) },
      data: { 
        resposta: resposta.trim(),
        adminId: req.adminLogadoId 
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        produto: {
          include: {
            categorias: true,
            admins: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })
    res.status(200).json(proposta)
  } catch (error) {
    console.error("Erro ao responder proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Buscar proposta por ID (acesso admin ou dono da proposta)
router.get("/:id", authOptional, async (req: AuthRequest, res) => {
  const { id } = req.params

  try {
    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        produto: {
          include: {
            categorias: true,
            admins: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    // Verificar se o usuário tem permissão para ver a proposta
    const userType = getUserType(req)
    const canAccess = userType === 'admin' || 
                     (userType === 'cliente' && req.clienteLogadoId === proposta.clienteId)

    if (!canAccess) {
      return res.status(403).json({ erro: "Acesso negado" })
    }

    res.status(200).json(proposta)
  } catch (error) {
    console.error("Erro ao buscar proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Excluir proposta (apenas admin ou dono da proposta)
router.delete("/:id", authOptional, async (req: AuthRequest, res) => {
  const { id } = req.params

  try {
    const proposta = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!proposta) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    // Verificar permissões
    const userType = getUserType(req)
    const canDelete = userType === 'admin' || 
                     (userType === 'cliente' && req.clienteLogadoId === proposta.clienteId)

    if (!canDelete) {
      return res.status(403).json({ erro: "Acesso negado" })
    }

    await prisma.proposta.delete({
      where: { id: Number(id) }
    })

    res.status(200).json({ mensagem: "Proposta excluída com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Rota para admin atualizar proposta
router.put("/:id", authAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  
  const propostaUpdateSchema = propostaSchema.partial()
  const valida = propostaUpdateSchema.safeParse(req.body)
  
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }

  const { clienteId, produtoId, descricao } = valida.data

  try {
    const propostaExistente = await prisma.proposta.findUnique({
      where: { id: Number(id) }
    })

    if (!propostaExistente) {
      return res.status(404).json({ erro: "Proposta não encontrada" })
    }

    if (clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      })
      if (!cliente) {
        return res.status(400).json({ erro: "Cliente não encontrado" })
      }
    }

    if (produtoId) {
      const produto = await prisma.produtos.findUnique({
        where: { id: produtoId }
      })
      if (!produto) {
        return res.status(400).json({ erro: "Produto não encontrado" })
      }
    }

    const proposta = await prisma.proposta.update({
      where: { id: Number(id) },
      data: {
        ...(clienteId && { clienteId }),
        ...(produtoId && { produtoId }),
        ...(descricao && { descricao }),
        updatedAt: new Date()
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        produto: {
          include: {
            categorias: true,
            admins: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })

    res.status(200).json(proposta)
  } catch (error) {
    console.error("Erro ao atualizar proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Cliente atualizar sua própria proposta
router.patch("/:id", authCliente, async (req: AuthRequest, res) => {
  const { id } = req.params
  
  const propostaClienteUpdateSchema = z.object({
    descricao: z.string().min(10, {
      message: "Descrição deve possuir, no mínimo, 10 caracteres" 
    })
  })

  const valida = propostaClienteUpdateSchema.safeParse(req.body)
  
  if (!valida.success) {
    return res.status(400).json({ erro: valida.error.errors })
  }

  const { descricao } = valida.data

  try {
    // Verificar se proposta existe e pertence ao cliente
    const propostaExistente = await prisma.proposta.findFirst({
      where: { 
        id: Number(id),
        clienteId: req.clienteLogadoId 
      }
    })

    if (!propostaExistente) {
      return res.status(404).json({ erro: "Proposta não encontrada ou acesso negado" })
    }

    // Não permitir editar se já foi respondida
    if (propostaExistente.resposta) {
      return res.status(400).json({ erro: "Não é possível editar proposta já respondida" })
    }

    const proposta = await prisma.proposta.update({
      where: { id: Number(id) },
      data: {
        descricao,
        updatedAt: new Date()
      },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            cidade: true
          }
        },
        produto: {
          include: {
            categorias: true,
            admins: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    })

    res.status(200).json(proposta)
  } catch (error) {
    console.error("Erro ao atualizar proposta:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Estatísticas de propostas para admin
router.get("/admin/estatisticas", authAdmin, async (req: AuthRequest, res) => {
  try {
    const [
      totalPropostas,
      propostasRespondidas,
      propostasPendentes,
      propostasUltimoMes,
      propostasPorProduto,
      clientesAtivos
    ] = await Promise.all([
      prisma.proposta.count(),
      prisma.proposta.count({ where: { resposta: { not: null } } }),
      prisma.proposta.count({ where: { resposta: null } }),
      prisma.proposta.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        }
      }),
      prisma.proposta.groupBy({
        by: ['produtoId'],
        _count: {
          produtoId: true
        },
        orderBy: {
          _count: {
            produtoId: 'desc'
          }
        },
        take: 5
      }),
      prisma.cliente.count({
        where: {
          propostas: {
            some: {
              createdAt: {
                gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
              }
            }
          }
        }
      })
    ])

    // Buscar nomes dos produtos mais populares
    const produtosPopulares = await Promise.all(
      propostasPorProduto.map(async (item) => {
        const produto = await prisma.produtos.findUnique({
          where: { id: item.produtoId },
          select: { nome: true }
        })
        return {
          produtoId: item.produtoId,
          produtoNome: produto?.nome || 'Produto não encontrado',
          quantidade: item._count.produtoId
        }
      })
    )

    const estatisticas = {
      totais: {
        totalPropostas,
        propostasRespondidas,
        propostasPendentes,
        propostasUltimoMes,
        clientesAtivos
      },
      taxas: {
        taxaResposta: totalPropostas > 0 ? (propostasRespondidas / totalPropostas) * 100 : 0,
        crescimento: totalPropostas > 0 ? (propostasUltimoMes / totalPropostas) * 100 : 0
      },
      produtosPopulares,
      resumo: {
        status: {
          respondidas: propostasRespondidas,
          pendentes: propostasPendentes
        }
      }
    }

    res.status(200).json(estatisticas)
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

// Rota para buscar propostas por produto
router.get("/produto/:produtoId", authOptional, async (req: AuthRequest, res) => {
  const { produtoId } = req.params
  const userType = getUserType(req)

  try {
    // Verificar se produto existe
    const produto = await prisma.produtos.findUnique({
      where: { id: Number(produtoId) }
    })

    if (!produto) {
      return res.status(404).json({ erro: "Produto não encontrado" })
    }

    let whereCondition: any = { produtoId: Number(produtoId) }

    // Se não for admin, só mostra as próprias propostas
    if (userType === 'cliente') {
      whereCondition.clienteId = req.clienteLogadoId
    }
    // Se não estiver logado, não mostra nada
    else if (!userType) {
      return res.status(401).json({ erro: "Acesso não autorizado" })
    }

    const propostas = await prisma.proposta.findMany({
      where: whereCondition,
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            cidade: true
          }
        },
        admin: {
          select: {
            id: true,
            nome: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.status(200).json(propostas)
  } catch (error) {
    console.error("Erro ao buscar propostas por produto:", error)
    res.status(500).json({ erro: "Erro interno do servidor" })
  }
})

export default router