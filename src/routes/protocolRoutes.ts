import { Router } from 'express'
import {
  getAllProtocols,
  createProtocol,
} from '../controllers/protocolController/protocolController'
import { getProtocol } from '../controllers/protocolController/getProtocol'

const router = Router()

router.get('/', getAllProtocols)
router.get('/:key', getProtocol)
router.post('/', createProtocol)

export default router