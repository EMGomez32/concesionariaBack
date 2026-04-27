import { body } from 'express-validator';

export const createMovimiento = [
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('hastaSucursalId').isInt().withMessage('hastaSucursalId debe ser un número'),
    body('motivo').optional().isString(),
    body('fechaMovimiento').optional().isISO8601(),
];
