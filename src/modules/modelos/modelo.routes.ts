import express from 'express';
import * as modeloController from './modelo.controller';
import * as modeloValidation from './modelo.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), modeloValidation.createModelo, validate, modeloController.createModelo)
    .get(authenticate, tenancy, modeloController.getModelos);

router
    .route('/:id')
    .get(authenticate, tenancy, modeloController.getModelo)
    .patch(authenticate, tenancy, authorize('admin'), modeloValidation.updateModelo, validate, modeloController.updateModelo)
    .delete(authenticate, tenancy, authorize('admin'), modeloController.deleteModelo);

export default router;
