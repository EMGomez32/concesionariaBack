import express from 'express';
import * as proveedorController from './proveedor.controller';
import * as proveedorValidation from './proveedor.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, proveedorValidation.createProveedor, validate, proveedorController.createProveedor)
    .get(authenticate, tenancy, proveedorController.getProveedores);

router
    .route('/:id')
    .get(authenticate, tenancy, proveedorController.getProveedor)
    .patch(authenticate, tenancy, proveedorValidation.updateProveedor, validate, proveedorController.updateProveedor)
    .delete(authenticate, tenancy, proveedorController.deleteProveedor);

export default router;
