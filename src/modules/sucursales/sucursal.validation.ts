import { body } from 'express-validator';

export const createSucursal = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('direccion').optional().isString(),
    body('telefono').optional().isString(),
    body('concesionariaId').isInt().withMessage('concesionariaId debe ser un número'),
];

export const updateSucursal = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('direccion').optional().isString(),
    body('telefono').optional().isString(),
    body('activo').optional().isBoolean(),
];
