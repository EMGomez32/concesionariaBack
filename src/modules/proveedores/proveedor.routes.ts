import express from 'express';
import * as proveedorController from './proveedor.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createProveedorSchema, updateProveedorSchema } from './proveedor.schemas';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, validateZod(createProveedorSchema), proveedorController.createProveedor)
    .get(authenticate, tenancy, proveedorController.getProveedores);

router
    .route('/:id')
    .get(authenticate, tenancy, proveedorController.getProveedor)
    .patch(authenticate, tenancy, validateZod(updateProveedorSchema), proveedorController.updateProveedor)
    .delete(authenticate, tenancy, proveedorController.deleteProveedor);

export default router;
