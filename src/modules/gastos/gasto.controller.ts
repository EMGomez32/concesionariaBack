import { Request, Response } from 'express';
import * as gastoService from './gasto.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';

export const getGastos = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['tipo', 'categoriaId', 'vehiculoId', 'sucursalId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['categoriaId', 'vehiculoId', 'sucursalId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await gastoService.getGastos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const createGasto = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body, concesionariaId: user?.concesionariaId };
    const result = await gastoService.createGasto(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateGasto = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await gastoService.updateGasto(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteGasto = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await gastoService.deleteGasto(id);
    res.send(ApiResponse.success({ message: 'Gasto eliminado' }));
});
