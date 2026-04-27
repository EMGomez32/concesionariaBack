import { body, param } from 'express-validator';

export const createCategoria = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('activo').optional().isBoolean(),
];

export const updateCategoria = [
    param('id').isInt().withMessage('id debe ser un entero'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('activo').optional().isBoolean(),
];

export const deleteCategoria = [
    param('id').isInt().withMessage('id debe ser un entero'),
];
