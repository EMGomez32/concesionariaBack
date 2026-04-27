import { body } from 'express-validator';

export const createMarca = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').isString(),
    body('concesionariaId').optional().isInt().withMessage('concesionariaId debe ser un número'),
    body('activo').optional().isBoolean(),
];

export const updateMarca = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('activo').optional().isBoolean(),
];
