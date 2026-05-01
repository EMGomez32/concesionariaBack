import express from 'express';
import * as modeloController from './modelo.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createModeloSchema, updateModeloSchema } from './modelo.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(createModeloSchema),
        modeloController.createModelo,
    )
    .get(authenticate, tenancy, modeloController.getModelos);

router
    .route('/:id')
    .get(authenticate, tenancy, modeloController.getModelo)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateModeloSchema),
        modeloController.updateModelo,
    )
    .delete(authenticate, tenancy, authorize('admin'), modeloController.deleteModelo);

export default router;
