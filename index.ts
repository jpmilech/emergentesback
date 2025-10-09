import express, { Request, Response } from 'express'
import cors from 'cors'

import routesCategorias from './routes/categorias'
import routesProdutos from './routes/produtos'
import routesClientes from './routes/clientes'
import routesLogin from './routes/login'

const app = express()
const port = 3000

// Middlewares
app.use(cors())
app.use(express.json())

// Rotas
app.use("/categorias", routesCategorias)      // GET, POST categorias
app.use("/produtos", routesProdutos)          // GET, POST produtos
app.use("/clientes", routesClientes)          // cadastro: /clientes/cadastro
app.use("/login", routesLogin)                // login: /login

// Rota principal
app.get("/", (req: Request, res: Response) => {
  res.send("🚜🌱 API ConnectAgro funcionando!")
})

// Start server
app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})
