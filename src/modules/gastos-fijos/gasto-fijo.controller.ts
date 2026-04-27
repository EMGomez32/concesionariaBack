import { Request, Response } from 'express';
import * as gastoFijoService from './gasto-fijo.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import pick from '../../utils/pick';

export const getGastosFijos = catchAsync(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = pick(req.query, ['categoriaId', 'sucursalId', 'anio', 'mes']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await gastoFijoService.getGastosFijos(filter, options);
    res.send(ApiResponse.success(result));
});

export const getGastoFijoById = catchAsync(async (req: Request, res: Response) => {
    const result = await gastoFijoService.getGastoFijoById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createGastoFijo = catchAsync(async (req: Request, res: Response) => {
    const data = {
        ...req.body,
        concesionariaId: req.user?.concesionariaId
    };
    const result = await gastoFijoService.createGastoFijo(data);
    res.status(201).send(ApiResponse.success(result, 'Gasto fijo registrado correctamente'));
});

export const updateGastoFijo = catchAsync(async (req: Request, res: Response) => {
    const result = await gastoFijoService.updateGastoFijo(parseInt(req.params.id as string, 10), req.body);
    res.send(ApiResponse.success(result, 'Gasto fijo actualizado correctamente'));
});

export const deleteGastoFijo = catchAsync(async (req: Request, res: Response) => {
    await gastoFijoService.deleteGastoFijo(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(null, 'Gasto fijo eliminado correctamente'));
});
