import express from 'express';
import * as gastoController from './gasto.controller';
import * as gastoValidation from './gasto.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), gastoValidation.createGasto, validate, gastoController.createGasto)
    .get(authenticate, tenancy, gastoController.getGastos);

router
    .route('/:id')
    .patch(authenticate, tenancy, authorize('admin'), gastoValidation.updateGasto, validate, gastoController.updateGasto)
    .delete(authenticate, tenancy, authorize('admin'), gastoController.deleteGasto);

export default router;
