import { body } from 'express-validator';

export const createArchivo = [
    body('vehiculoId').isInt().withMessage('vehiculoId debe ser un número'),
    body('url').isURL().withMessage('URL inválida'),
    body('nombre').notEmpty().withMessage('Nombre de archivo obligatorio'),
    body('tipo').optional().isString(),
    body('orden').optional().isInt(),
];
