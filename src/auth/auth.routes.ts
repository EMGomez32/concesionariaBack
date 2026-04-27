import express from 'express';
import * as authController from './auth.controller';
// import { authenticate } from '../middlewares/authenticate'; // Se añadirá en Fase 6

const router = express.Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
// router.get('/me', authenticate, authController.me);

export default router;
