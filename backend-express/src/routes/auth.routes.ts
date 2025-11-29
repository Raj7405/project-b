import { Router } from "express";
import * as authController from '../controllers/auth.controller';

const router = Router();

router.get('/get-register-user', authController.getRegisterUser);
router.post('/register-user', authController.registerUser);
router.post('/retopup', authController.retopupUser)

export default router;