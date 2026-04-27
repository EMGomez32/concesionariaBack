import { Request, Response } from 'express';
import * as reservaService from './reserva.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getReservas = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['estado', 'clienteId', 'vehiculoId', 'sucursalId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['clienteId', 'vehiculoId', 'sucursalId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await reservaService.getReservas(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getReserva = catchAsync(async (req: Request, res: Response) => {
    const result = await reservaService.getReservaById(parseInt(req.params.id as string, 10));
    requireSameTenant(req.user, result.concesionariaId);
    res.send(ApiResponse.success(result));
});

export const createReserva = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await reservaService.createReserva(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateReserva = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await reservaService.getReservaById(id);
    requireSameTenant(req.user, current.concesionariaId);

    const result = await reservaService.updateReserva(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteReserva = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await reservaService.getReservaById(id);
    requireSameTenant(req.user, current.concesionariaId);

    await reservaService.deleteReserva(id);
    res.send(ApiResponse.success({ message: 'Reserva eliminada con éxito' }));
});
