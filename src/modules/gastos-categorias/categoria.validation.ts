import { body } from 'express-validator';

export const createCategoria = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('descripcion').optional().isString(),
];

export const updateCategoria = [
    body('nombre').optional().notEmpty(),
    body('descripcion').optional().isString(),
];
