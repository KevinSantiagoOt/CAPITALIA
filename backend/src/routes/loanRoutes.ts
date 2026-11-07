import { Router } from 'express'
import {createLoan, getLoanById, updateLoan, deleteLoan, getAllLoans, getActiveLoans, closeLoan} from '../controllers/loanController'

const router = Router()

// RUTAS PRESTAMOS
router.post('/prestamos', createLoan)
router.get('/prestamos/:id', getLoanById)
router.put('/prestamos/:id', updateLoan)
router.delete('/prestamos/:id', deleteLoan)
router.post('/prestamos/:id/cerrar', closeLoan)
router.get('/prestamos/usuario/:usuarioId', getAllLoans)
router.get('/prestamosactivos/usuario/:usuarioId', getActiveLoans)
export default router