import { body } from 'express-validator';

export const createVenta = [
    body('sucursalId').isInt().withMessage('sucursalId debe ser un número'),
    body('clienteId').isInt().withMessage('clienteId debe ser un número'),
    body('vendedorId').isInt().withMessage('vendedorId debe ser un número'),
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('presupuestoId').optional().isInt(),
    body('reservaId').optional().isInt(),
    body('montoTotal').isDecimal(),
    body('moneda').isIn(['ARS', 'USD']),
    body('items').optional().isArray(),
    body('externos').optional().isArray(),
    body('pagos').optional().isArray(),
    body('canjes').optional().isArray(),
];

export const updateVenta = [
    body('estado').optional().isIn(['pendiente', 'finalizada', 'cancelada']),
    body('observaciones').optional().isString(),
];
