import express from 'express';
import * as gastoFijoController from './gasto-fijo.controller';
import * as gastoFijoValidation from './gasto-fijo.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), gastoFijoValidation.createGastoFijo, validate, gastoFijoController.createGastoFijo)
    .get(authenticate, tenancy, gastoFijoValidation.getGastosFijos, validate, gastoFijoController.getGastosFijos);

router
    .route('/:id')
    .get(authenticate, tenancy, gastoFijoValidation.getGastoFijoById, validate, gastoFijoController.getGastoFijoById)
    .patch(authenticate, tenancy, authorize('admin'), gastoFijoValidation.updateGastoFijo, validate, gastoFijoController.updateGastoFijo)
    .delete(authenticate, tenancy, authorize('admin'), gastoFijoValidation.deleteGastoFijo, validate, gastoFijoController.deleteGastoFijo);

export default router;
