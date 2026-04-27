import express from 'express';
import * as itemController from './item.controller';
import * as itemValidation from './item.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'postventa'), itemValidation.createItem, validate, itemController.createItem);

router
    .route('/caso/:casoId')
    .get(authenticate, tenancy, itemController.getItems);

router
    .route('/:id')
    .delete(authenticate, tenancy, authorize('admin', 'postventa'), itemController.deleteItem);

export default router;
