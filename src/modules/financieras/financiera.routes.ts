import express from 'express';
import * as financieraController from './financiera.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import {
    createFinancieraSchema,
    updateFinancieraSchema,
} from './financiera.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(createFinancieraSchema),
        financieraController.createFinanciera,
    )
    .get(authenticate, tenancy, financieraController.getFinancieras);

router
    .route('/:id')
    .get(authenticate, tenancy, financieraController.getFinanciera)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateFinancieraSchema),
        financieraController.updateFinanciera,
    )
    .delete(authenticate, tenancy, authorize('admin'), financieraController.deleteFinanciera);

export default router;
