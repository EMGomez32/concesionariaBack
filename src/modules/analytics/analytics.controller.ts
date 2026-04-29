import { Request, Response } from 'express';
import * as analyticsService from './analytics.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

/**
 * Construye el filtro a partir de query params, aplicando reglas de tenancy:
 * - super_admin puede pasar concesionariaId explícito; si no, ve todo (sin filtro).
 * - admin/etc fuerzan concesionariaId al de su sesión (lo lee del contexto).
 */
const buildFilter = (req: Request): analyticsService.AnalyticsFilter => {
    const user = req.user;
    const isSuper = !!user?.roles.includes('super_admin');

    const parseDate = (v: unknown): Date | undefined => {
        if (typeof v !== 'string' || !v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
    };
    const parseInt10 = (v: unknown): number | undefined => {
        if (typeof v !== 'string' || !v) return undefined;
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
    };

    const concesionariaId: number | undefined = isSuper
        ? parseInt10(req.query.concesionariaId)
        : (user?.concesionariaId ?? undefined);

    return {
        from: parseDate(req.query.from),
        to: parseDate(req.query.to),
        sucursalId: parseInt10(req.query.sucursalId),
        concesionariaId,
    };
};

export const getOverview = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getOverview(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getVentas = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getVentas(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getStock = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getStock(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getFinanciacion = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getFinanciacion(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getCaja = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getCaja(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getGastos = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getGastos(buildFilter(req));
    res.send(ApiResponse.success(data));
});

export const getPostventa = catchAsync(async (req: Request, res: Response) => {
    const data = await analyticsService.getPostventa(buildFilter(req));
    res.send(ApiResponse.success(data));
});
