import { query } from 'express-validator';

const dateField = (name: string) =>
    query(name)
        .optional()
        .isISO8601()
        .withMessage(`${name} debe ser fecha ISO 8601 (YYYY-MM-DD)`);

const intField = (name: string) =>
    query(name)
        .optional()
        .isInt({ min: 1 })
        .withMessage(`${name} debe ser un entero positivo`);

export const analyticsQuery = [
    dateField('from'),
    dateField('to'),
    intField('sucursalId'),
    intField('concesionariaId'),
];
