import { Request, Response } from 'express';
import * as clienteService from './cliente.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getClientes = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['nombre', 'dni', 'email', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await clienteService.getClientes(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getCliente = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await clienteService.getClienteById(id);

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

export const createCliente = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await clienteService.createCliente(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateCliente = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await clienteService.getClienteById(id);
    requireSameTenant(req.user, current.concesionariaId);

    const result = await clienteService.updateCliente(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteCliente = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await clienteService.getClienteById(id);
    requireSameTenant(req.user, current.concesionariaId);

    await clienteService.deleteCliente(id);
    res.send(ApiResponse.success({ message: 'Cliente eliminado con éxito' }));
});
