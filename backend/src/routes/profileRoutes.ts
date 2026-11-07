import { Router } from 'express'
import { getProfile, updateProfile, changePassword } from '../controllers/profileController'

const router = Router()

// RUTAS DEL PERFIL DEL USUARIO (el usuario sale del token)
router.get('/perfil', getProfile)
router.put('/perfil', updateProfile)
router.put('/perfil/password', changePassword)
export default router
