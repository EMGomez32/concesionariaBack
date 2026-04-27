import { body } from 'express-validator';

export const createPresupuesto = [
    body('sucursalId').isInt().withMessage('sucursalId debe ser un número'),
    body('clienteId').isInt().withMessage('clienteId debe ser un número'),
    body('vendedorId').isInt().withMessage('vendedorId debe ser un número'),
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('moneda').isIn(['ARS', 'USD']),
    body('montoTotal').isDecimal(),
    body('items').optional().isArray(),
    body('externos').optional().isArray(),
    body('canjes').optional().isArray(),
    body('fechaVencimiento').isISO8601(),
];

export const updatePresupuesto = [
    body('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado', 'vencido']),
    body('montoTotal').optional().isDecimal(),
    body('observaciones').optional().isString(),
];
