import express from 'express';
import * as marcaController from './marca.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createMarcaSchema, updateMarcaSchema } from './marca.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(createMarcaSchema),
        marcaController.createMarca,
    )
    .get(authenticate, tenancy, marcaController.getMarcas);

router
    .route('/:id')
    .get(authenticate, tenancy, marcaController.getMarca)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateMarcaSchema),
        marcaController.updateMarca,
    )
    .delete(authenticate, tenancy, authorize('admin'), marcaController.deleteMarca);

export default router;
