import express from 'express';
import * as gastoFijoController from './gasto-fijo.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import { createGastoFijoSchema, updateGastoFijoSchema } from './gasto-fijo.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(createGastoFijoSchema),
        gastoFijoController.createGastoFijo,
    )
    .get(authenticate, tenancy, gastoFijoController.getGastosFijos);

// Total agregado por año/mes/sucursal/categoría (Sprint 4 cont — port).
router.get('/total', authenticate, tenancy, gastoFijoController.getGastosFijosTotal);

router
    .route('/:id')
    .get(authenticate, tenancy, gastoFijoController.getGastoFijoById)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateGastoFijoSchema),
        gastoFijoController.updateGastoFijo,
    )
    .delete(authenticate, tenancy, authorize('admin'), gastoFijoController.deleteGastoFijo);

export default router;
