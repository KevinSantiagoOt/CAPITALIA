import { Router } from 'express'
import { createDebtor, getDebtorByCedula, updateDebtor, deleteDebtor, getAllDebtors, archiveDebtor} from '../controllers/debtorController'

const router = Router()

// RUTAS DEUDOR
router.post('/deudores', createDebtor)
router.get('/deudores/cedula/:cedula', getDebtorByCedula)
router.put('/deudores/:id', updateDebtor)
router.delete('/deudores/:id', deleteDebtor)
router.put('/deudores/:id/archivar', archiveDebtor)
router.get('/alldeudores/:usuarioId', getAllDebtors)
export default router