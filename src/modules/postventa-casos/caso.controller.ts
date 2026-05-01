import { Request, Response } from 'express';
import * as casoService from './caso.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getCasos = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['estado', 'clienteId', 'vehiculoId', 'sucursalId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['clienteId', 'vehiculoId', 'sucursalId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await casoService.getCasos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getCaso = catchAsync(async (req: Request, res: Response) => {
    const result = await casoService.getCasoById(parseInt(req.params.id as string, 10));
    requireSameTenant(req.user, result.concesionariaId);
    res.send(ApiResponse.success(result));
});

export const createCaso = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body, concesionariaId: user?.concesionariaId };
    const result = await casoService.createCaso(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateCaso = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await casoService.updateCaso(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteCaso = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await casoService.deleteCaso(id);
    res.send(ApiResponse.success({ message: 'Caso eliminado' }));
});

/**
 * HU-84: total de items del caso (suma de monto + count).
 * Migrado desde interface/controllers/PostventaCasoController.ts.
 */
export const getCasoTotal = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await casoService.getCasoTotal(id);
    res.send(ApiResponse.success(result));
});
