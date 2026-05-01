import express from 'express';
import * as itemController from './item.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { validateZod } from '../../middlewares/validateZod';
import { createItemSchema } from './item.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin', 'postventa'),
        validateZod(createItemSchema),
        itemController.createItem,
    );

router
    .route('/caso/:casoId')
    .get(authenticate, tenancy, itemController.getItems);

router
    .route('/:id')
    .delete(authenticate, tenancy, authorize('admin', 'postventa'), itemController.deleteItem);

export default router;
