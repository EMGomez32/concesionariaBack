import express from 'express';
import * as sucursalController from './sucursal.controller';
import * as sucursalValidation from './sucursal.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), sucursalValidation.createSucursal, validate, sucursalController.createSucursal)
    .get(authenticate, tenancy, sucursalController.getSucursales);

router
    .route('/:id')
    .get(authenticate, tenancy, sucursalController.getSucursal)
    .patch(authenticate, tenancy, authorize('admin'), sucursalValidation.updateSucursal, validate, sucursalController.updateSucursal)
    .delete(authenticate, tenancy, authorize('admin'), sucursalController.deleteSucursal);

export default router;
