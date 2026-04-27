import express from 'express';
import * as ventaController from './venta.controller';
import * as ventaValidation from './venta.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), ventaValidation.createVenta, validate, ventaController.createVenta)
    .get(authenticate, tenancy, ventaController.getVentas);

router
    .route('/:id')
    .get(authenticate, tenancy, ventaController.getVenta)
    .patch(authenticate, tenancy, authorize('admin'), ventaValidation.updateVenta, validate, ventaController.updateVenta)
    .delete(authenticate, tenancy, authorize('admin'), ventaController.deleteVenta);

export default router;
