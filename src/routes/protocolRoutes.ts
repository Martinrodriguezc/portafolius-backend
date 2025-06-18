import { Router } from 'express';

import {
  getAllProtocols,
  createProtocol
} from '../controllers/protocolController/protocolController';

import { getProtocol } from '../controllers/protocolController/getProtocol';
import { getWindowsByProtocol } from '../controllers/protocolController/getWindows';
import { getFindingsByWindow } from '../controllers/protocolController/getFindings';
import { getPossibleDiagnosesByFinding } from '../controllers/protocolController/getPossibleDiagnoses';
import { getSubdiagnosesByDiagnosis } from '../controllers/protocolController/getSubdiagnoses';
import { getSubSubdiagnosesBySubdiagnosis } from '../controllers/protocolController/getSubsubdiagnoses';
import { getThirdOrderBySubSub } from '../controllers/protocolController/getThirdOrder';
import { getImageQualities } from '../controllers/protocolController/getImageQualities';
import { getFinalDiagnoses } from '../controllers/protocolController/getFinalDiagnoses';
import {
  saveClipSelection,
  getClipSelection
} from '../controllers/selectionController';

const router = Router();

router.get('/', getAllProtocols);
router.post('/', createProtocol);

router.get('/image-qualities', getImageQualities);
router.get('/final-diagnoses', getFinalDiagnoses);

router.post('/video/:clipId/selection', saveClipSelection);
router.get('/video/:clipId/selection', getClipSelection);

router.get('/:key', getProtocol);

router.get('/:protocolKey/windows', getWindowsByProtocol);
router.get('/:protocolKey/windows/:windowId/findings', getFindingsByWindow);
router.get('/:protocolKey/windows/:windowId/findings/:findingId/diagnoses', getPossibleDiagnosesByFinding);
router.get('/:protocolKey/diagnoses/:diagnosisId/subdiagnoses', getSubdiagnosesByDiagnosis);
router.get('/:protocolKey/subdiagnoses/:subId/subsub', getSubSubdiagnosesBySubdiagnosis);
router.get('/:protocolKey/subsub/:subSubId/thirdorder', getThirdOrderBySubSub);

export default router;