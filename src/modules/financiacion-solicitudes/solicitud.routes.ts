import express from 'express';
import * as solicitudController from './solicitud.controller';
import * as solicitudValidation from './solicitud.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin', 'vendedor'), solicitudValidation.createSolicitud, validate, solicitudController.createSolicitud)
    .get(authenticate, tenancy, solicitudController.getSolicitudes);

router
    .route('/:id')
    .patch(authenticate, tenancy, authorize('admin', 'vendedor'), solicitudValidation.updateSolicitud, validate, solicitudController.updateSolicitud)
    .delete(authenticate, tenancy, authorize('admin'), solicitudController.deleteSolicitud);

export default router;
