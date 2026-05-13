import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/authRoutes'
import debtorRoutes from './routes/debtorRoutes'
import loanRoutes from './routes/loanRoutes'
import installmentRoutes from './routes/installmentRoutes'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', debtorRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', loanRoutes)
app.use('/api', installmentRoutes)

app.get('/ping', (_req, res) => {
  res.send('pong')
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto: ${PORT}`)
})