import { Request, Response } from 'express';
import * as modeloService from './modelo.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { cleanFilters } from '../../utils/cleanFilters';

export const getModelos = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['nombre', 'concesionariaId', 'marcaId', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    filter = parseNumericFields(filter, ['concesionariaId', 'marcaId']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await modeloService.getModelos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getModelo = catchAsync(async (req: Request, res: Response) => {
    const result = await modeloService.getModeloById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createModelo = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body };

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await modeloService.createModelo(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateModelo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await modeloService.updateModelo(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteModelo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await modeloService.deleteModelo(id);
    res.send(ApiResponse.success({ message: 'Modelo eliminado con éxito' }));
});
