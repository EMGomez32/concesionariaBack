import express from 'express';
import * as rolController from './rol.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router.get('/', authenticate, authorize('admin'), rolController.getRoles);

export default router;
