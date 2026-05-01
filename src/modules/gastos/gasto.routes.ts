import express from 'express';
import * as gastoController from './gasto.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import { createGastoSchema, updateGastoSchema } from './gasto.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin', 'vendedor'),
        validateZod(createGastoSchema),
        gastoController.createGasto,
    )
    .get(authenticate, tenancy, gastoController.getGastos);

// Total agregado de gastos con filtros (Sprint 4 cont — port desde interface/).
router.get('/total', authenticate, tenancy, gastoController.getGastoTotal);

router
    .route('/:id')
    .get(authenticate, tenancy, gastoController.getGasto)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateGastoSchema),
        gastoController.updateGasto,
    )
    .delete(authenticate, tenancy, authorize('admin'), gastoController.deleteGasto);

export default router;
