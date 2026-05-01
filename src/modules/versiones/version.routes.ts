import express from 'express';
import * as versionController from './version.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createVersionSchema, updateVersionSchema } from './version.schemas';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(createVersionSchema),
        versionController.createVersion,
    )
    .get(authenticate, tenancy, versionController.getVersiones);

router
    .route('/:id')
    .get(authenticate, tenancy, versionController.getVersion)
    .patch(
        authenticate,
        tenancy,
        authorize('admin'),
        validateZod(updateVersionSchema),
        versionController.updateVersion,
    )
    .delete(authenticate, tenancy, authorize('admin'), versionController.deleteVersion);

export default router;
