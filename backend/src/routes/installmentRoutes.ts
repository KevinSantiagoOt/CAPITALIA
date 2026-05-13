import { Router } from 'express'
import { createInstallment, getInstallmentsByLoanId, updateInstallment, deleteInstallment, getInstallmentsNotPaid, getInstallmentsPaid } from '../controllers/installmentController'

const router = Router()

// RUTAS DE CUOTAS
router.post('/cuotas', createInstallment)
router.get('/cuotas/prestamo/:prestamoId', getInstallmentsByLoanId)
router.get('/cuotas/pagadas/prestamo/:prestamoId/pagadas', getInstallmentsPaid)
router.get('/cuotas/nopagadas/prestamo/:prestamoId/pendientes', getInstallmentsNotPaid)
router.put('/cuotas/:id', updateInstallment)
router.delete('/cuotas/:id', deleteInstallment)
export default router