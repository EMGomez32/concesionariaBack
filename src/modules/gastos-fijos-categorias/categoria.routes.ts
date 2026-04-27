import express from 'express';
import * as categoriaController from './categoria.controller';
import * as categoriaValidation from './categoria.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, authorize('admin'), categoriaValidation.createCategoria, validate, categoriaController.createCategoria)
    .get(authenticate, tenancy, categoriaController.getCategorias);

router
    .route('/:id')
    .get(authenticate, tenancy, categoriaController.getCategoriaById)
    .patch(authenticate, tenancy, authorize('admin'), categoriaValidation.updateCategoria, validate, categoriaController.updateCategoria)
    .delete(authenticate, tenancy, authorize('admin'), categoriaValidation.deleteCategoria, validate, categoriaController.deleteCategoria);

export default router;
