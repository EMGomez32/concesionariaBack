import { body } from 'express-validator';

export const createCaso = [
    body('clienteId').isInt().withMessage('clienteId debe ser un número'),
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
    body('sucursalId').isInt().withMessage('sucursalId debe ser un número'),
    body('observaciones').optional().isString(),
];

export const updateCaso = [
    body('estado').optional().isIn(['abierto', 'en_proceso', 'esperando_repuestos', 'finalizado', 'cancelado']),
    body('observaciones').optional().isString(),
    body('fechaCierre').optional().isISO8601(),
];
