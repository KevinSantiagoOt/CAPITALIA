import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login } from '../controllers/auth.controller'

const router = Router()

// Máximo 10 intentos fallidos cada 15 minutos por conexión, para que nadie pruebe contraseñas sin parar.
// Los logins correctos no cuentan
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' },
})

// RUTAS DE AUTENTICACION
// No hay registro público: los usuarios se crean con "npm run usuario" (src/scripts/usuario.ts)
router.post('/login', limiteLogin, login)
export default router
