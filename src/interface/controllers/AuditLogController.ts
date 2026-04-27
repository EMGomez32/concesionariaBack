import { Request, Response, NextFunction } from 'express';
import { PrismaAuditLogRepository } from '../../infrastructure/database/repositories/PrismaAuditLogRepository';
import { GetAuditLogs } from '../../application/use-cases/auditoria/GetAuditLogs';
import { GetAuditLogById } from '../../application/use-cases/auditoria/GetAuditLogById';

const repository = new PrismaAuditLogRepository();
const getAuditLogsUC = new GetAuditLogs(repository);
const getByIdUC = new GetAuditLogById(repository);

function buildFilters(rawQuery: any) {
    const { limit, page, sortBy, sortOrder, startDate, endDate, ...filters } = rawQuery;

    if (startDate || endDate) {
        const range: any = {};
        if (startDate) range.gte = new Date(startDate as string);
        if (endDate) range.lte = new Date(endDate as string);
        filters.createdAt = range;
    }

    return { filters, options: { limit, page, sortBy, sortOrder } };
}

export class AuditLogController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { filters, options } = buildFilters(req.query);
            const result = await getAuditLogsUC.execute(filters, options as any);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await getByIdUC.execute(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async exportCsv(req: Request, res: Response, next: NextFunction) {
        try {
            const { filters } = buildFilters(req.query);
            const result = await getAuditLogsUC.execute(filters, { limit: 10000 } as any);

            const escape = (v: unknown): string => {
                if (v === null || v === undefined) return '';
                const s = String(v);
                return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };

            const headers = ['id', 'fecha', 'usuarioId', 'usuarioNombre', 'usuarioEmail', 'entidad', 'entidadId', 'accion', 'detalle', 'ip', 'userAgent'];
            const rows = (result.results as any[]).map(r => [
                r.id,
                r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
                r.usuarioId,
                r.usuario?.nombre,
                r.usuario?.email,
                r.entidad,
                r.entidadId,
                r.accion,
                r.detalle,
                r.ip,
                r.userAgent,
            ].map(escape).join(','));

            const csv = [headers.join(','), ...rows].join('\n');
            const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            // BOM so Excel detects UTF-8 correctly.
            res.send('﻿' + csv);
        } catch (error) {
            next(error);
        }
    }
}
