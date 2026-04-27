import { Request, Response } from 'express';
import * as versionService from './version.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { cleanFilters } from '../../utils/cleanFilters';

export const getVersiones = catchAsync(async (req: Request, res: Response) => {
    let filter: Record<string, unknown> = pick(req.query, ['nombre', 'concesionariaId', 'modeloId', 'anio', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    filter = parseNumericFields(filter, ['concesionariaId', 'modeloId', 'anio']);
    filter = cleanFilters(filter);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await versionService.getVersiones(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getVersion = catchAsync(async (req: Request, res: Response) => {
    const result = await versionService.getVersionById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createVersion = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body };

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await versionService.createVersion(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateVersion = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await versionService.updateVersion(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteVersion = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await versionService.deleteVersion(id);
    res.send(ApiResponse.success({ message: 'Versión eliminada con éxito' }));
});
