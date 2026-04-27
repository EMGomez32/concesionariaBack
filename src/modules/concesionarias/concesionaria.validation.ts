import { body } from 'express-validator';

export const createConcesionaria = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('cuit').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('telefono').optional().isString(),
];

export const updateConcesionaria = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('cuit').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('telefono').optional().isString(),
];
