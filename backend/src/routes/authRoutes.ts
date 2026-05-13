import { Router } from 'express'
import { register, login } from '../controllers/auth.controller'
import { createDebtor, getDebtorByCedula, updateDebtor, deleteDebtor } from '../controllers/debtorController'

const router = Router()

// RUTAS DE AUTENTICACION
router.post('/register', register)
router.post('/login', login)
export default router