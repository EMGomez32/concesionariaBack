import { Request, Response } from 'express';
import * as auditoriaService from './auditoria.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import pick from '../../utils/pick';

export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const filter: any = pick(req.query, ['entidad', 'accion', 'usuarioId', 'startDate', 'endDate']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    // Map date filters
    if (filter.startDate || filter.endDate) {
        filter.createdAt = {};
        if (filter.startDate) filter.createdAt.gte = new Date(filter.startDate);
        if (filter.endDate) filter.createdAt.lte = new Date(filter.endDate);
        delete filter.startDate;
        delete filter.endDate;
    }

    // Force tenancy
    filter.concesionariaId = req.user?.concesionariaId;

    const result = await auditoriaService.getAuditLogs(filter, options);
    res.send(ApiResponse.success(result));
});

export const getAuditLogById = catchAsync(async (req: Request, res: Response) => {
    const result = await auditoriaService.getAuditLogById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const exportAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const filter: any = pick(req.query, ['entidad', 'accion', 'usuarioId', 'startDate', 'endDate']);

    if (filter.startDate || filter.endDate) {
        filter.createdAt = {};
        if (filter.startDate) filter.createdAt.gte = new Date(filter.startDate);
        if (filter.endDate) filter.createdAt.lte = new Date(filter.endDate);
        delete filter.startDate;
        delete filter.endDate;
    }

    filter.concesionariaId = req.user?.concesionariaId;

    const result = await auditoriaService.getAuditLogs(filter, { limit: 10000 });

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
    res.send('﻿' + csv);
});
