import express from 'express';
import * as reservaController from './reserva.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import { createReservaSchema, updateReservaSchema } from './reserva.schemas';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), validateZod(createReservaSchema), reservaController.createReserva)
    .get(authenticate, tenancy, reservaController.getReservas);

router
    .route('/:id')
    .get(authenticate, tenancy, reservaController.getReserva)
    .patch(authenticate, tenancy, authorize('admin', 'vendedor'), validateZod(updateReservaSchema), reservaController.updateReserva)
    .delete(authenticate, tenancy, authorize('admin'), reservaController.deleteReserva);

export default router;
