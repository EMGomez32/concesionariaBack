import { body } from 'express-validator';

export const createItem = [
    body('casoId').isInt().withMessage('casoId debe ser un número'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria'),
    body('costo').optional().isDecimal(),
    body('precio').optional().isDecimal(),
];
