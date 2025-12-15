import { Router } from 'express';
import * as userController from '../controllers/user.controller';

const router = Router();

router.get('/recent', userController.getRecentRegistrations);
router.get('/count', userController.getTotalUsers);
router.get('/retopup/count', userController.getActiveReTopupCount);
router.get('/wallet/:walletAddress', userController.getUserByWallet);
router.get('/children/:parentId', userController.getChildren);
router.get('/:userId/autopool/tree', userController.getUserAutopoolTree);
router.get('/:userId', userController.getUserById);
router.get('/', userController.getAllUsers);

export default router;

