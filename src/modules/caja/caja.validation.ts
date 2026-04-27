import { body } from 'express-validator';

const TIPOS_CAJA = ['efectivo', 'mercado_pago', 'banco', 'otro'];
const TIPOS_MOV = ['ingreso', 'egreso'];

export const createCaja = [
    body('nombre').isString().notEmpty().withMessage('Nombre obligatorio'),
    body('tipo').isIn(TIPOS_CAJA).withMessage('Tipo de caja inválido'),
    body('moneda').optional().isString(),
    body('concesionariaId').optional().isInt(),
];

export const updateCaja = [
    body('nombre').optional().isString().notEmpty(),
    body('tipo').optional().isIn(TIPOS_CAJA),
    body('moneda').optional().isString(),
    body('activo').optional().isBoolean(),
];

export const createMovimiento = [
    body('cajaId').isInt().withMessage('cajaId debe ser un número'),
    body('tipo').isIn(TIPOS_MOV).withMessage('Tipo inválido'),
    body('fecha').isISO8601().withMessage('Fecha inválida'),
    body('monto').isFloat({ gt: 0 }).withMessage('Monto debe ser mayor a 0'),
    body('descripcion').optional().isString(),
    body('origen').optional().isIn(['manual', 'venta', 'gasto', 'cierre_diferencia', 'ajuste']),
];

export const cerrarDia = [
    body('cajaId').isInt().withMessage('cajaId debe ser un número'),
    body('fecha').isISO8601().withMessage('Fecha inválida'),
    body('saldoReal').optional({ nullable: true }).isFloat().withMessage('saldoReal debe ser un número'),
    body('observaciones').optional({ nullable: true }).isString(),
];
