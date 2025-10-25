import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';

const router = Router();

router.get('/user/:userId', transactionController.getUserTransactions);
router.get('/user/:userId/paginated', transactionController.getUserTransactionsPaginated);
router.get('/user/:userId/type/:type', transactionController.getUserTransactionsByType);
router.get('/recent', transactionController.getRecentTransactions);
router.get('/user/:userId/income/:type', transactionController.getTotalIncomeByType);

export default router;

