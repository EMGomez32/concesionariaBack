import express from 'express';
import * as casoController from './caso.controller';
import * as casoValidation from './caso.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'postventa'), casoValidation.createCaso, validate, casoController.createCaso)
    .get(authenticate, tenancy, casoController.getCasos);

router
    .route('/:id')
    .get(authenticate, tenancy, casoController.getCaso)
    .patch(authenticate, tenancy, authorize('admin', 'postventa'), casoValidation.updateCaso, validate, casoController.updateCaso)
    .delete(authenticate, tenancy, authorize('admin'), casoController.deleteCaso);

export default router;
