import { Request, Response } from 'express';
import * as ingresoService from './ingreso.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import pick from '../../utils/pick';

export const getIngresos = catchAsync(async (req: Request, res: Response) => {
    const filter: Record<string, unknown> = pick(req.query, ['tipoIngreso', 'sucursalId', 'vehiculoId']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await ingresoService.getIngresos(filter, options);
    res.send(ApiResponse.success(result));
});

export const getIngresoById = catchAsync(async (req: Request, res: Response) => {
    const result = await ingresoService.getIngresoById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createIngreso = catchAsync(async (req: Request, res: Response) => {
    const data = {
        ...req.body,
        registradoPorId: req.user?.userId
    };

    const result = await ingresoService.createIngreso(data);
    res.status(201).send(ApiResponse.success(result, 'Ingreso registrado correctamente'));
});

export const deleteIngreso = catchAsync(async (req: Request, res: Response) => {
    await ingresoService.deleteIngreso(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(null, 'Ingreso eliminado correctamente'));
});
