import express from 'express';
import * as concesionariaController from './concesionaria.controller';
import * as concesionariaValidation from './concesionaria.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

router
    .route('/')
    .post(authenticate, authorize('super_admin'), concesionariaValidation.createConcesionaria, validate, concesionariaController.createConcesionaria)
    .get(authenticate, authorize('super_admin'), concesionariaController.getConcesionarias);

router
    .route('/:id')
    .get(authenticate, concesionariaController.getConcesionaria)
    .patch(authenticate, authorize('super_admin', 'admin'), concesionariaValidation.updateConcesionaria, validate, concesionariaController.updateConcesionaria)
    .delete(authenticate, authorize('super_admin'), concesionariaController.deleteConcesionaria);

export default router;
