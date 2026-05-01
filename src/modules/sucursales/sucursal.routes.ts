import express from 'express';
import * as sucursalController from './sucursal.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createSucursalSchema, updateSucursalSchema } from './sucursal.schemas';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), validateZod(createSucursalSchema), sucursalController.createSucursal)
    .get(authenticate, tenancy, sucursalController.getSucursales);

router
    .route('/:id')
    .get(authenticate, tenancy, sucursalController.getSucursal)
    .patch(authenticate, tenancy, authorize('admin'), validateZod(updateSucursalSchema), sucursalController.updateSucursal)
    .delete(authenticate, tenancy, authorize('admin'), sucursalController.deleteSucursal);

export default router;
