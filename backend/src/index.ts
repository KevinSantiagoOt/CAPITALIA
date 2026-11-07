import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/authRoutes'
import debtorRoutes from './routes/debtorRoutes'
import loanRoutes from './routes/loanRoutes'
import installmentRoutes from './routes/installmentRoutes'
import { verificarToken } from './middleware/auth'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/ping', (_req, res) => {
  res.send('pong')
})

// RUTAS PUBLICAS (login y registro van antes del token)
app.use('/api/auth', authRoutes)

// DE AQUI EN ADELANTE TODAS LAS RUTAS NECESITAN TOKEN
app.use('/api', verificarToken)
app.use('/api', debtorRoutes)
app.use('/api', loanRoutes)
app.use('/api', installmentRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`)
})