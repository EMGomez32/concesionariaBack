import { body } from 'express-validator';

export const createVersion = [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').isString(),
    body('modeloId').isInt().withMessage('modeloId debe ser un número'),
    body('concesionariaId').optional().isInt().withMessage('concesionariaId debe ser un número'),
    body('anio').optional().isInt({ min: 1900, max: 2100 }).withMessage('Año inválido'),
    body('precioSugerido').optional().isFloat({ min: 0 }).withMessage('precioSugerido debe ser un número positivo'),
    body('activo').optional().isBoolean(),
];

export const updateVersion = [
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('anio').optional().isInt({ min: 1900, max: 2100 }).withMessage('Año inválido'),
    body('precioSugerido').optional().isFloat({ min: 0 }).withMessage('precioSugerido debe ser un número positivo'),
    body('activo').optional().isBoolean(),
];
