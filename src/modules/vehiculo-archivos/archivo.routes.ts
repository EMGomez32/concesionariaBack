import express from 'express';
import * as archivoController from './archivo.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createArchivoSchema } from './archivo.schemas';
import { uploadSingle } from '../../interface/middlewares/upload.middleware';

const router = express.Router();

router
    .route('/')
    .post(
        authenticate,
        tenancy,
        validateZod(createArchivoSchema),
        archivoController.createArchivo,
    );

// Upload multipart con multer (Sprint 4 cont — port desde interface/).
// El uploadSingle middleware vive en interface/ por ahora — está bien
// porque es shared entre vehiculo-archivo y solicitud-financiacion.
router.post('/upload', authenticate, tenancy, uploadSingle, archivoController.uploadArchivo);

router
    .route('/vehiculo/:vehiculoId')
    .get(authenticate, tenancy, archivoController.getArchivos);

router
    .route('/:id')
    .delete(authenticate, tenancy, archivoController.deleteArchivo);

export default router;
