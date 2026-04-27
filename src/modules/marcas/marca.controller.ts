import { Request, Response } from 'express';
import * as marcaService from './marca.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { cleanFilters } from '../../utils/cleanFilters';

export const getMarcas = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['nombre', 'concesionariaId', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    filter = parseNumericFields(filter, ['concesionariaId']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await marcaService.getMarcas(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getMarca = catchAsync(async (req: Request, res: Response) => {
    const result = await marcaService.getMarcaById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createMarca = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body };

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await marcaService.createMarca(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateMarca = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await marcaService.updateMarca(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteMarca = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await marcaService.deleteMarca(id);
    res.send(ApiResponse.success({ message: 'Marca eliminada con éxito' }));
});
