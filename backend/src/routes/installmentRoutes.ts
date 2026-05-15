import { Router } from 'express'
import { createInstallment, getInstallmentsByLoanId, updateInstallment, deleteInstallment, getInstallmentsNotPaid, getInstallmentsPaid, getInstallmentsDueThisMonth, getInstallmentsVencidas } from '../controllers/installmentController'

const router = Router()

// RUTAS DE CUOTAS
router.post('/cuotas', createInstallment)
router.get('/cuotas/prestamo/:prestamoId', getInstallmentsByLoanId)
router.get('/cuotas/pagadas/prestamo/:prestamoId/pagadas', getInstallmentsPaid)
router.put('/cuotas/:id', updateInstallment)
router.delete('/cuotas/:id', deleteInstallment)
router.get('/cuotas/nopagadas/prestamo/:prestamoId/pendientes', getInstallmentsNotPaid)
router.get('/cuotas/prestamo/:usuarioId/vencenpronto', getInstallmentsDueThisMonth)
router.get('/cuotas/prestamo/:usuarioId/vencidas', getInstallmentsVencidas)
export default router