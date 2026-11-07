import { Router } from 'express'
import { recibirArchivo, uploadDocument, deleteDocument } from '../controllers/documentController'

const router = Router()

// RUTAS DOCUMENTOS (LETRAS)
router.post('/prestamos/:id/documentos', recibirArchivo, uploadDocument)
router.delete('/documentos/:id', deleteDocument)
export default router
