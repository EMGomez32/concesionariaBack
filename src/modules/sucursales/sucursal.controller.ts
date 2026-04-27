import { Request, Response } from 'express';
import * as sucursalService from './sucursal.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';
import * as auditoriaService from '../auditoria/auditoria.service';
import { cleanFilters } from '../../utils/cleanFilters';

export const getSucursales = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['nombre', 'concesionariaId', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['concesionariaId']);
    
    // Clean empty filters
    filter = cleanFilters(filter);

    const user = req.user;
    console.log('🔍 getSucursales - User:', user);
    console.log('🔍 Filter before user check:', filter);
    
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }
    
    console.log('🔍 Filter after user check:', filter);
    console.log('🔍 Options:', options);

    const result = await sucursalService.getSucursales(filter, options);
    console.log('📦 Result from service:', result);
    
    const response = ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    });
    
    console.log('📤 Sending response:', JSON.stringify(response));
    
    res.send(response);
});

export const getSucursal = catchAsync(async (req: Request, res: Response) => {
    const result = await sucursalService.getSucursalById(parseInt(req.params.id as string, 10));

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

export const createSucursal = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await sucursalService.createSucursal(data);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Sucursal',
            entidadId: result.id,
            accion: 'create',
            detalle: `Sucursal ${result.nombre} creada`
        });
    }

    res.status(201).send(ApiResponse.success(result));
});

export const updateSucursal = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const user = req.user;

    const current = await sucursalService.getSucursalById(id);
    requireSameTenant(user, current.concesionariaId);

    const result = await sucursalService.updateSucursal(id, req.body);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Sucursal',
            entidadId: id,
            accion: 'update',
            detalle: `Sucursal ${id} actualizada`
        });
    }

    res.send(ApiResponse.success(result));
});

export const deleteSucursal = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const user = req.user;

    const current = await sucursalService.getSucursalById(id);
    requireSameTenant(user, current.concesionariaId);

    await sucursalService.deleteSucursal(id);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Sucursal',
            entidadId: id,
            accion: 'delete_soft',
            detalle: `Sucursal ${id} eliminada`
        });
    }

    res.send(ApiResponse.success({ message: 'Sucursal eliminada con éxito' }));
});
