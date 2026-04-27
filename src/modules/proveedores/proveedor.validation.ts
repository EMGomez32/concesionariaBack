import { body } from 'express-validator';

export const createProveedor = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('tipo').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('activo').optional().isBoolean(),
];

export const updateProveedor = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('tipo').optional().isString(),
    body('telefono').optional().isString(),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('direccion').optional().isString(),
    body('activo').optional().isBoolean(),
];
