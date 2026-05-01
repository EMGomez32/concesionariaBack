import express from 'express';
import * as solicitudController from './solicitud.controller';
import * as solicitudValidation from './solicitud.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';
import { uploadSingle } from '../../interface/middlewares/upload.middleware';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        authorize('admin', 'vendedor'),
        solicitudValidation.createSolicitud,
        validate,
        solicitudController.createSolicitud,
    )
    .get(authenticate, tenancy, solicitudController.getSolicitudes);

router
    .route('/:id')
    .get(authenticate, tenancy, solicitudController.getSolicitud)
    .patch(
        authenticate,
        tenancy,
        authorize('admin', 'vendedor'),
        solicitudValidation.updateSolicitud,
        validate,
        solicitudController.updateSolicitud,
    )
    .delete(authenticate, tenancy, authorize('admin'), solicitudController.deleteSolicitud);

// ─── Sub-recursos: archivos (Sprint 4 cont — port desde interface/) ───
router.get('/:id/archivos', authenticate, tenancy, solicitudController.listArchivos);

router.post(
    '/:id/archivos/upload',
    authenticate,
    tenancy,
    uploadSingle,
    solicitudController.uploadArchivo,
);

router.delete(
    '/:id/archivos/:archivoId',
    authenticate,
    tenancy,
    authorize('admin', 'vendedor'),
    solicitudController.deleteArchivo,
);

export default router;
