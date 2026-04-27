import { body } from 'express-validator';

export const createGasto = [
    body('monto').isDecimal().withMessage('Monto debe ser un número'),
    body('moneda').isIn(['ARS', 'USD']),
    body('tipo').isIn(['FIJO', 'VEHICULO']),
    body('categoriaId').isInt().withMessage('categoriaId debe ser un número'),
    body('vehiculoId').optional().isInt(),
    body('sucursalId').isInt().withMessage('sucursalId debe ser un número'),
    body('fechaGasto').isISO8601(),
    body('descripcion').optional().isString(),
    body('proveedorId').optional().isInt(),
];

export const updateGasto = [
    body('monto').optional().isDecimal(),
    body('descripcion').optional().isString(),
    body('fechaGasto').optional().isISO8601(),
];
