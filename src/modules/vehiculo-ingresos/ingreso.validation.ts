import { body, param, query } from 'express-validator';

export const createIngreso = [
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un entero'),
    body('sucursalId').isInt().withMessage('sucursalId debe ser un entero'),
    body('tipoIngreso')
        .isIn(['compra_proveedor', 'compra_particular', 'permuta', 'consignacion', 'otro'])
        .withMessage('tipoIngreso no válido'),
    body('fechaIngreso').isISO8601().withMessage('fechaIngreso debe ser una fecha válida'),
    body('valorTomado').optional({ nullable: true }).isDecimal(),
    body('observaciones').optional().isString(),
    body('clienteOrigenId').optional({ nullable: true }).isInt(),
    body('proveedorOrigenId').optional({ nullable: true }).isInt(),
    body('presupuestoId').optional({ nullable: true }).isInt(),
    body('ventaId').optional({ nullable: true }).isInt(),
];

export const getIngresos = [
    query('tipoIngreso').optional().isString(),
    query('sucursalId').optional().isInt(),
    query('vehiculoId').optional().isInt(),
    query('limit').optional().isInt(),
    query('page').optional().isInt(),
];

export const getIngresoById = [
    param('id').isInt().withMessage('id debe ser un entero'),
];

export const deleteIngreso = [
    param('id').isInt().withMessage('id debe ser un entero'),
];
