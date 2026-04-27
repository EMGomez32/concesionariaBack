import { body } from 'express-validator';

export const createFinanciacion = [
    body('ventaId').isInt().withMessage('ventaId debe ser un número'),
    body('financieraId').isInt().withMessage('financieraId debe ser un número'),
    body('montoTotal').isDecimal().withMessage('Monto total inválido'),
    body('cantidadCuotas').isInt({ min: 1 }).withMessage('Cantidad de cuotas debe ser al menos 1'),
    body('moneda').isIn(['ARS', 'USD']),
    body('tipo').isIn(['PROPIA', 'EXTERNA', 'BANCARIA']),
    body('fechaInicio').isISO8601().withMessage('Fecha de inicio inválida'),
    body('tasaInteres').optional().isDecimal(),
];

export const updateCuota = [
    body('estado').isIn(['PENDIENTE', 'PAGADA', 'VENCIDA', 'CANCELADA']),
    body('montoPagado').optional().isDecimal(),
    body('fechaPago').optional().isISO8601(),
];
