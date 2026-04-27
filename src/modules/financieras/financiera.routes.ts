import express from 'express';
import * as financieraController from './financiera.controller';
import * as financieraValidation from './financiera.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), financieraValidation.createFinanciera, validate, financieraController.createFinanciera)
    .get(authenticate, tenancy, financieraController.getFinancieras);

router
    .route('/:id')
    .patch(authenticate, tenancy, authorize('admin'), financieraValidation.updateFinanciera, validate, financieraController.updateFinanciera)
    .delete(authenticate, tenancy, authorize('admin'), financieraController.deleteFinanciera);

export default router;
