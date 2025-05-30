import { Router } from 'express'
import {
  getAllProtocols,
  getProtocol,
  createProtocol,
} from '../controllers/protocolController/protocolController'

const router = Router()

router.get('/', getAllProtocols)
router.get('/:key', getProtocol)
router.post('/', createProtocol)

export default router