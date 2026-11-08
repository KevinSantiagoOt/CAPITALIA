import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/authRoutes'
import debtorRoutes from './routes/debtorRoutes'
import loanRoutes from './routes/loanRoutes'
import installmentRoutes from './routes/installmentRoutes'
import documentRoutes from './routes/documentRoutes'
import profileRoutes from './routes/profileRoutes'
import { verificarToken } from './middleware/auth'

const app = express()

// En el servidor de internet (Railway, Render...) las peticiones llegan a través de un intermediario;
// esto hace que el límite de intentos de login vea la IP real de cada celular
app.set('trust proxy', 1)

app.use(cors())
app.use(express.json())

app.get('/ping', (_req, res) => {
  res.send('pong')
})

// RUTA PUBLICA (el login va antes del token)
app.use('/api/auth', authRoutes)

// DE AQUI EN ADELANTE TODAS LAS RUTAS NECESITAN TOKEN
app.use('/api', verificarToken)
app.use('/api', debtorRoutes)
app.use('/api', loanRoutes)
app.use('/api', installmentRoutes)
app.use('/api', documentRoutes)
app.use('/api', profileRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`)
})