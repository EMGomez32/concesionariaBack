import express from 'express';
import * as archivoController from './archivo.controller';
import * as archivoValidation from './archivo.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, archivoValidation.createArchivo, validate, archivoController.createArchivo);

router
    .route('/vehiculo/:vehiculoId')
    .get(authenticate, tenancy, archivoController.getArchivos);

router
    .route('/:id')
    .delete(authenticate, tenancy, archivoController.deleteArchivo);

export default router;
