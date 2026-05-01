import express from 'express';
import * as clienteController from './cliente.controller';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import { createClienteSchema, updateClienteSchema } from './cliente.schemas';

const router = express.Router();

router
    .route('/')
    .post(authenticate, tenancy, validateZod(createClienteSchema), clienteController.createCliente)
    .get(authenticate, tenancy, clienteController.getClientes);

router
    .route('/:id')
    .get(authenticate, tenancy, clienteController.getCliente)
    .patch(authenticate, tenancy, validateZod(updateClienteSchema), clienteController.updateCliente)
    .delete(authenticate, tenancy, clienteController.deleteCliente);

export default router;
