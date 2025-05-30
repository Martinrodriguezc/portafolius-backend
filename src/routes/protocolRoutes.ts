import { Router } from 'express'
import { getAllProtocols, createProtocol } from '../controllers/protocolController/protocolController'

const router = Router()

router.get('/', getAllProtocols)
router.post('/', createProtocol)

export default router