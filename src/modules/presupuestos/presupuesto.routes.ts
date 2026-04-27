import express from 'express';
import * as presupuestoController from './presupuesto.controller';
import * as presupuestoValidation from './presupuesto.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), presupuestoValidation.createPresupuesto, validate, presupuestoController.createPresupuesto)
    .get(authenticate, tenancy, presupuestoController.getPresupuestos);

router
    .route('/:id')
    .get(authenticate, tenancy, presupuestoController.getPresupuesto)
    .patch(authenticate, tenancy, authorize('admin', 'vendedor'), presupuestoValidation.updatePresupuesto, validate, presupuestoController.updatePresupuesto)
    .delete(authenticate, tenancy, authorize('admin'), presupuestoController.deletePresupuesto);

export default router;
