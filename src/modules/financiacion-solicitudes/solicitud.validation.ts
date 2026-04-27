import { body } from 'express-validator';

export const createSolicitud = [
    body('clienteId').isInt().withMessage('clienteId debe ser un número'),
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('financieraId').isInt().withMessage('financieraId debe ser un número'),
    body('montoSolicitado').isDecimal(),
    body('moneda').isIn(['ARS', 'USD']),
    body('plazoEstimado').optional().isInt(),
];

export const updateSolicitud = [
    body('estado').isIn(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA']),
    body('observaciones').optional().isString(),
];
