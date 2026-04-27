import { Request, Response } from 'express';
import * as proveedorService from './proveedor.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getProveedores = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['nombre', 'tipo', 'concesionariaId', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await proveedorService.getProveedores(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getProveedor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await proveedorService.getProveedorById(id);
    requireSameTenant(req.user, result.concesionariaId);
    res.send(ApiResponse.success(result));
});

export const createProveedor = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await proveedorService.createProveedor(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateProveedor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await proveedorService.getProveedorById(id);
    requireSameTenant(req.user, current.concesionariaId);

    const result = await proveedorService.updateProveedor(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteProveedor = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await proveedorService.getProveedorById(id);
    requireSameTenant(req.user, current.concesionariaId);

    await proveedorService.deleteProveedor(id);
    res.send(ApiResponse.success({ message: 'Proveedor eliminado con éxito' }));
});
