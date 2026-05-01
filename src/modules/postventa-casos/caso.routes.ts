import express from 'express';
import * as casoController from './caso.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import { createCasoSchema, updateCasoSchema } from './caso.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin', 'postventa'),
        validateZod(createCasoSchema),
        casoController.createCaso,
    )
    .get(authenticate, tenancy, casoController.getCasos);

router
    .route('/:id')
    .get(authenticate, tenancy, casoController.getCaso)
    .patch(
        authenticate,
        tenancy,
        authorize('admin', 'postventa'),
        validateZod(updateCasoSchema),
        casoController.updateCaso,
    )
    .delete(authenticate, tenancy, authorize('admin'), casoController.deleteCaso);

// HU-84: total de items del caso (Sprint 4 cont — port desde interface/).
router.get('/:id/total', authenticate, tenancy, casoController.getCasoTotal);

export default router;
