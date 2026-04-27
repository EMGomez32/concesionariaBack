import express from 'express';
import * as reservaController from './reserva.controller';
import * as reservaValidation from './reserva.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), reservaValidation.createReserva, validate, reservaController.createReserva)
    .get(authenticate, tenancy, reservaController.getReservas);

router
    .route('/:id')
    .get(authenticate, tenancy, reservaController.getReserva)
    .patch(authenticate, tenancy, authorize('admin', 'vendedor'), reservaValidation.updateReserva, validate, reservaController.updateReserva)
    .delete(authenticate, tenancy, authorize('admin'), reservaController.deleteReserva);

export default router;
