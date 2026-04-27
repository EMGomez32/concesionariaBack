import express from 'express';
import * as movimientoController from './movimiento.controller';
import * as movimientoValidation from './movimiento.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), movimientoValidation.createMovimiento, validate, movimientoController.createMovimiento)
    .get(authenticate, tenancy, movimientoController.getMovimientos);

export default router;
