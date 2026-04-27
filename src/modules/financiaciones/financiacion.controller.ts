import { Request, Response } from 'express';
import * as financiacionService from './financiacion.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getFinanciaciones = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['ventaId', 'financieraId', 'tipo', 'moneda', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['ventaId', 'financieraId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await financiacionService.getFinanciaciones(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getFinanciacion = catchAsync(async (req: Request, res: Response) => {
    const result = await financiacionService.getFinanciacionById(parseInt(req.params.id as string, 10));
    requireSameTenant(req.user, result.concesionariaId);
    res.send(ApiResponse.success(result));
});

export const createFinanciacion = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body, concesionariaId: user?.concesionariaId };
    const result = await financiacionService.createFinanciacion(data);
    res.status(201).send(ApiResponse.success(result));
});

export const pagarCuota = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.cuotaId as string, 10);
    const result = await financiacionService.registrarPagoCuota(id, req.body);
    res.send(ApiResponse.success(result));
});
