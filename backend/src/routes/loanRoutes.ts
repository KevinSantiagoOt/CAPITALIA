import { Router } from 'express'
import {createLoan, getLoanById, updateLoan, deleteLoan, getAllLoans} from '../controllers/loanController'

const router = Router()

// RUTAS PRESTAMOS
router.post('/prestamos', createLoan)
router.get('/prestamos/:id', getLoanById)
router.put('/prestamos/:id', updateLoan)
router.delete('/prestamos/:id', deleteLoan)
router.get('/prestamos/usuario/:usuarioId', getAllLoans)
export default router