import { body } from 'express-validator';

export const createCliente = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('dni').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('observaciones').optional().isString(),
];

export const updateCliente = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('dni').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('observaciones').optional().isString(),
];
