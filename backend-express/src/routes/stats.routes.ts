import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';

const router = Router();

router.get('/', statsController.getStats);
router.get('/health', statsController.health);

export default router;

