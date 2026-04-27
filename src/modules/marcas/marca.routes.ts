import express from 'express';
import * as marcaController from './marca.controller';
import * as marcaValidation from './marca.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), marcaValidation.createMarca, validate, marcaController.createMarca)
    .get(authenticate, tenancy, marcaController.getMarcas);

router
    .route('/:id')
    .get(authenticate, tenancy, marcaController.getMarca)
    .patch(authenticate, tenancy, authorize('admin'), marcaValidation.updateMarca, validate, marcaController.updateMarca)
    .delete(authenticate, tenancy, authorize('admin'), marcaController.deleteMarca);

export default router;
