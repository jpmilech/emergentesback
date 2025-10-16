import express from 'express'
import cors from 'cors'

import routesCategorias from './routes/categorias'
import routesProdutos from './routes/produtos'
import routesLogin from './routes/login'
import routesClientes from './routes/clientes'
import routesPropostas from './routes/propostas'
import routesDashboard from './routes/dashboard'
import routesAdminLogin from './routes/adminLogin'
import routesAdmins from './routes/admins'

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())

app.use("/categorias", routesCategorias)
app.use("/produtos", routesProdutos)
app.use("/clientes/login", routesLogin) 
app.use("/clientes", routesClientes)
app.use("/propostas", routesPropostas)
app.use("/dashboard", routesDashboard)
app.use("/admins/login", routesAdminLogin) 
app.use("/admins", routesAdmins)

app.get('/', (req, res) => {
  res.send('API: Venda de Produtos')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})