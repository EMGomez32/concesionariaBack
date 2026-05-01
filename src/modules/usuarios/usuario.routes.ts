import express from 'express';
import * as usuarioController from './usuario.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import {
    createUserSchema,
    updateUserSchema,
    resetPasswordSchema,
} from './usuario.schemas';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), validateZod(createUserSchema), usuarioController.createUsuario)
    .get(authenticate, tenancy, authorize('admin'), usuarioController.getUsuarios);

router
    .route('/:id')
    .get(authenticate, tenancy, authorize('admin'), usuarioController.getUsuario)
    .patch(authenticate, tenancy, authorize('admin'), validateZod(updateUserSchema), usuarioController.updateUsuario)
    .delete(authenticate, tenancy, authorize('admin'), usuarioController.deleteUsuario);

// Reset administrativo de password (Sprint 4 cont).
router.post(
    '/:id/reset-password',
    authenticate,
    tenancy,
    authorize('admin'),
    validateZod(resetPasswordSchema),
    usuarioController.resetPassword,
);

export default router;
