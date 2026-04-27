import express from 'express';
import * as ingresoController from './ingreso.controller';
import * as ingresoValidation from './ingreso.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), ingresoValidation.createIngreso, validate, ingresoController.createIngreso)
    .get(authenticate, tenancy, ingresoValidation.getIngresos, validate, ingresoController.getIngresos);

router
    .route('/:id')
    .get(authenticate, tenancy, ingresoValidation.getIngresoById, validate, ingresoController.getIngresoById)
    .delete(authenticate, tenancy, authorize('admin'), ingresoValidation.deleteIngreso, validate, ingresoController.deleteIngreso);

export default router;
