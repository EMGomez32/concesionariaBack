import express from 'express';
import * as vehiculoController from './vehiculo.controller';
import * as vehiculoValidation from './vehiculo.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), vehiculoValidation.createVehiculo, validate, vehiculoController.createVehiculo)
    .get(authenticate, tenancy, vehiculoController.getVehiculos);

router
    .route('/:id')
    .get(authenticate, tenancy, vehiculoController.getVehiculo)
    .patch(authenticate, tenancy, authorize('admin', 'vendedor'), vehiculoValidation.updateVehiculo, validate, vehiculoController.updateVehiculo)
    .delete(authenticate, tenancy, authorize('admin'), vehiculoController.deleteVehiculo);

export default router;
