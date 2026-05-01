import express from 'express';
import * as vehiculoController from './vehiculo.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import {
    createVehiculoSchema,
    updateVehiculoSchema,
    transferVehiculoSchema,
} from './vehiculo.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin', 'vendedor'),
        validateZod(createVehiculoSchema),
        vehiculoController.createVehiculo,
    )
    .get(authenticate, tenancy, vehiculoController.getVehiculos);

router
    .route('/:id')
    .get(authenticate, tenancy, vehiculoController.getVehiculo)
    .patch(
        authenticate,
        tenancy,
        authorize('admin', 'vendedor'),
        validateZod(updateVehiculoSchema),
        vehiculoController.updateVehiculo,
    )
    .delete(authenticate, tenancy, authorize('admin'), vehiculoController.deleteVehiculo);

// Transferir entre sucursales (Sprint 4 cont — port desde interface/).
router.post(
    '/:id/transferir',
    authenticate,
    tenancy,
    authorize('admin', 'vendedor'),
    validateZod(transferVehiculoSchema),
    vehiculoController.transferirVehiculo,
);

export default router;
