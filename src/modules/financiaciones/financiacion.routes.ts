import express from 'express';
import * as financiacionController from './financiacion.controller';
import * as financiacionValidation from './financiacion.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'cobrador'), financiacionValidation.createFinanciacion, validate, financiacionController.createFinanciacion)
    .get(authenticate, tenancy, financiacionController.getFinanciaciones);

router
    .route('/:id')
    .get(authenticate, tenancy, financiacionController.getFinanciacion);

router
    .route('/cuotas/:cuotaId/pagar')
    .patch(authenticate, tenancy, authorize('admin', 'cobrador'), financiacionValidation.updateCuota, validate, financiacionController.pagarCuota);

export default router;
