import { Request, Response } from 'express';
import * as movimientoService from './movimiento.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';

export const getMovimientos = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['vehiculoId', 'desdeSucursalId', 'hastaSucursalId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['vehiculoId', 'desdeSucursalId', 'hastaSucursalId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await movimientoService.getMovimientos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const createMovimiento = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = {
        ...req.body,
        registradoPorId: user?.userId
    };

    const result = await movimientoService.createMovimiento(data);
    res.status(201).send(ApiResponse.success(result));
});
