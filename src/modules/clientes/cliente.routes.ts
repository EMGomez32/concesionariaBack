import express from 'express';
import * as clienteController from './cliente.controller';
import * as clienteValidation from './cliente.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, clienteValidation.createCliente, validate, clienteController.createCliente)
    .get(authenticate, tenancy, clienteController.getClientes);

router
    .route('/:id')
    .get(authenticate, tenancy, clienteController.getCliente)
    .patch(authenticate, tenancy, clienteValidation.updateCliente, validate, clienteController.updateCliente)
    .delete(authenticate, tenancy, clienteController.deleteCliente);

export default router;
