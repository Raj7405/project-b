import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { adminAuth } from '../middleware/admin.middleware';

const router = Router();

// Public admin login endpoint (no auth required)
router.post('/login', adminController.adminLogin);

// All other admin endpoints require authentication
router.get('/members', adminAuth, adminController.getMemberRegister);
router.get('/members/:userId/income', adminAuth, adminController.getUserIncomeDetails);

router.get('/slots/report', adminAuth, adminController.getSlotReport);

router.get('/level-income/eligible-parents', adminAuth, adminController.getLevelIncomeEligibleParents);
router.post('/level-income/manual-transfer', adminAuth, adminController.manualTransferLevelIncome);

router.get('/income/overall', adminAuth, adminController.getOverallIncomeReport);
router.get('/income/direct', adminAuth, adminController.getDirectIncomeReport);
router.get('/income/slot', adminAuth, adminController.getSlotIncomeReport);
router.get('/income/level', adminAuth, adminController.getLevelIncomeReport);

export default router;

