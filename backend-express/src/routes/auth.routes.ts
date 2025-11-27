import { Router } from "express";
import * as authController from '../controllers/auth.controller';

const router = Router();

// get requests
router.get('/get-register-user', authController.getRegisterUser);

// post requests
router.post('/register-validate', authController.validateRegistration);
router.post('/link-user-to-parent', authController.linkUserToParentUser);

export default router;