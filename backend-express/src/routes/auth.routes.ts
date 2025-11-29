import { Router } from "express";
import * as authController from '../controllers/auth.controller';

const router = Router();

// Get user by wallet address
router.get('/get-register-user', authController.getRegisterUser);

// Register new user
router.post('/register-user', authController.registerUser);

export default router;