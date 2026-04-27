import { body } from 'express-validator';

export const createReserva = [
    body('sucursalId').isInt().withMessage('sucursalId debe ser un número'),
    body('vendedorId').isInt().withMessage('vendedorId debe ser un número'),
    body('clienteId').isInt().withMessage('clienteId debe ser un número'),
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('monto').isDecimal().withMessage('Monto debe ser un número'),
    body('moneda').isIn(['ARS', 'USD']).withMessage('Moneda inválida'),
    body('fechaVencimiento').isISO8601().withMessage('Fecha de vencimiento inválida'),
    body('observaciones').optional().isString(),
];

export const updateReserva = [
    body('estado').optional().isIn(['activa', 'completada', 'cancelada', 'vencida']),
    body('monto').optional().isDecimal(),
    body('fechaVencimiento').optional().isISO8601(),
    body('observaciones').optional().isString(),
];
