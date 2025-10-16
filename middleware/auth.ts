import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from 'express'

// Tipos para os tokens
type AdminTokenType = {
  adminLogadoId: string
  adminLogadoNome: string
  adminLogadoNivel: number
  iat?: number
  exp?: number
}

type ClienteTokenType = {
  clienteLogadoId: string
  clienteLogadoNome: string
  iat?: number
  exp?: number
}

// Extendendo a interface Request do Express
export interface AuthRequest extends Request {
  adminLogadoId?: string
  adminLogadoNome?: string
  adminLogadoNivel?: number
  clienteLogadoId?: string
  clienteLogadoNome?: string
}

// Middleware para autenticação de Admin
export function authAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({ erro: "Token não informado" })
  }

  const token = authorization.split(" ")[1]

  // Verificar se o token está no formato Bearer
  if (!token || authorization.split(" ")[0] !== "Bearer") {
    return res.status(401).json({ erro: "Formato de token inválido. Use: Bearer <token>" })
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_KEY as string) as AdminTokenType
    const { adminLogadoId, adminLogadoNome, adminLogadoNivel } = decode

    req.adminLogadoId = adminLogadoId
    req.adminLogadoNome = adminLogadoNome
    req.adminLogadoNivel = adminLogadoNivel

    next()
  } catch (error: any) {
    console.error("Erro na autenticação admin:", error.message)
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: "Token expirado" })
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ erro: "Token inválido" })
    } else {
      return res.status(401).json({ erro: "Erro na autenticação" })
    }
  }
}

// Middleware para autenticação de Cliente
export function authCliente(req: AuthRequest, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({ erro: "Token não informado" })
  }

  const token = authorization.split(" ")[1]

  // Verificar se o token está no formato Bearer
  if (!token || authorization.split(" ")[0] !== "Bearer") {
    return res.status(401).json({ erro: "Formato de token inválido. Use: Bearer <token>" })
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_KEY as string) as ClienteTokenType
    const { clienteLogadoId, clienteLogadoNome } = decode

    req.clienteLogadoId = clienteLogadoId
    req.clienteLogadoNome = clienteLogadoNome

    next()
  } catch (error: any) {
    console.error("Erro na autenticação cliente:", error.message)
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: "Token expirado" })
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ erro: "Token inválido" })
    } else {
      return res.status(401).json({ erro: "Erro na autenticação" })
    }
  }
}

// Middleware para autenticação opcional (para rotas que podem ser acessadas com ou sem login)
export function authOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const { authorization } = req.headers

  if (!authorization) {
    // Se não tem token, continua sem dados de usuário
    next()
    return
  }

  const token = authorization.split(" ")[1]

  // Verificar se está no formato Bearer
  if (!token || authorization.split(" ")[0] !== "Bearer") {
    next()
    return
  }

  try {
    // Tenta verificar como admin primeiro
    try {
      const decodeAdmin = jwt.verify(token, process.env.JWT_KEY as string) as AdminTokenType
      req.adminLogadoId = decodeAdmin.adminLogadoId
      req.adminLogadoNome = decodeAdmin.adminLogadoNome
      req.adminLogadoNivel = decodeAdmin.adminLogadoNivel
    } catch {
      // Se não for admin, tenta como cliente
      const decodeCliente = jwt.verify(token, process.env.JWT_KEY as string) as ClienteTokenType
      req.clienteLogadoId = decodeCliente.clienteLogadoId
      req.clienteLogadoNome = decodeCliente.clienteLogadoNome
    }

    next()
  } catch (error) {
    // Se ambos falharem, continua sem dados de usuário
    next()
  }
}

// Middleware para verificar se é admin de nível específico
export function authAdminLevel(levelRequired: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const { authorization } = req.headers

    if (!authorization) {
      return res.status(401).json({ erro: "Token não informado" })
    }

    const token = authorization.split(" ")[1]

    // Verificar se o token está no formato Bearer
    if (!token || authorization.split(" ")[0] !== "Bearer") {
      return res.status(401).json({ erro: "Formato de token inválido. Use: Bearer <token>" })
    }

    try {
      const decode = jwt.verify(token, process.env.JWT_KEY as string) as AdminTokenType
      const { adminLogadoId, adminLogadoNome, adminLogadoNivel } = decode

      if (adminLogadoNivel < levelRequired) {
        return res.status(403).json({ erro: "Acesso negado. Nível de permissão insuficiente." })
      }

      req.adminLogadoId = adminLogadoId
      req.adminLogadoNome = adminLogadoNome
      req.adminLogadoNivel = adminLogadoNivel

      next()
    } catch (error: any) {
      console.error("Erro na autenticação de nível admin:", error.message)
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ erro: "Token expirado" })
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ erro: "Token inválido" })
      } else {
        return res.status(401).json({ erro: "Erro na autenticação" })
      }
    }
  }
}

// Função auxiliar para verificar se o usuário é o dono do recurso
export function isResourceOwner(resourceOwnerId: string, req: AuthRequest): boolean {
  return req.clienteLogadoId === resourceOwnerId || 
         req.adminLogadoId === resourceOwnerId
}

// Função auxiliar para obter o ID do usuário logado
export function getLoggedUserId(req: AuthRequest): string | null {
  return req.clienteLogadoId || req.adminLogadoId || null
}

// Função auxiliar para obter o tipo de usuário logado
export function getUserType(req: AuthRequest): 'admin' | 'cliente' | null {
  if (req.adminLogadoId) return 'admin'
  if (req.clienteLogadoId) return 'cliente'
  return null
}

// Nova função: Verificar se o usuário tem permissão para acessar recurso
export function canAccessResource(resourceOwnerId: string, req: AuthRequest): boolean {
  // Admins podem acessar qualquer recurso
  if (req.adminLogadoId) return true
  
  // Clientes só podem acessar seus próprios recursos
  return req.clienteLogadoId === resourceOwnerId
}

// Nova função: Middleware para verificar acesso a recurso específico
export function authResourceAccess(resourceOwnerId: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!canAccessResource(resourceOwnerId, req)) {
      return res.status(403).json({ erro: "Acesso negado a este recurso" })
    }
    next()
  }
}