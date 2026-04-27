import express from 'express';
import * as versionController from './version.controller';
import * as versionValidation from './version.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), versionValidation.createVersion, validate, versionController.createVersion)
    .get(authenticate, tenancy, versionController.getVersiones);

router
    .route('/:id')
    .get(authenticate, tenancy, versionController.getVersion)
    .patch(authenticate, tenancy, authorize('admin'), versionValidation.updateVersion, validate, versionController.updateVersion)
    .delete(authenticate, tenancy, authorize('admin'), versionController.deleteVersion);

export default router;
