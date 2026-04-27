import { body } from 'express-validator';

export const createModelo = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').isString(),
    body('marcaId').isInt().withMessage('marcaId debe ser un número'),
    body('concesionariaId').optional().isInt().withMessage('concesionariaId debe ser un número'),
    body('activo').optional().isBoolean(),
];

export const updateModelo = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('activo').optional().isBoolean(),
];
