import express from 'express';
import * as usuarioController from './usuario.controller';
import * as usuarioValidation from './usuario.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), usuarioValidation.createUser, validate, usuarioController.createUsuario)
    .get(authenticate, tenancy, authorize('admin'), usuarioController.getUsuarios);

router
    .route('/:id')
    .get(authenticate, tenancy, authorize('admin'), usuarioController.getUsuario)
    .patch(authenticate, tenancy, authorize('admin'), usuarioValidation.updateUser, validate, usuarioController.updateUsuario)
    .delete(authenticate, tenancy, authorize('admin'), usuarioController.deleteUsuario);

export default router;
