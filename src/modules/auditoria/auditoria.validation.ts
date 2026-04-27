import { param, query } from 'express-validator';

export const getAuditLogs = [
    query('entidad').optional().isString(),
    query('accion').optional().isString(),
    query('usuarioId').optional().isInt(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt(),
    query('page').optional().isInt(),
];

export const getAuditLogById = [
    param('id').isInt().withMessage('id debe ser un entero'),
];
