import { body } from 'express-validator';

export const createFinanciera = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('contacto').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('activo').optional().isBoolean(),
];

export const updateFinanciera = [
    body('nombre').optional().notEmpty(),
    body('contacto').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('activo').optional().isBoolean(),
];
