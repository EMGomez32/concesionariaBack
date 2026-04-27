import { Request, Response } from 'express';
import * as ventaService from './venta.service';
import * as auditoriaService from '../auditoria/auditoria.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getVentas = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['estado', 'clienteId', 'vehiculoId', 'vendedorId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['clienteId', 'vehiculoId', 'vendedorId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await ventaService.getVentas(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getVenta = catchAsync(async (req: Request, res: Response) => {
    const result = await ventaService.getVentaById(parseInt(req.params.id as string, 10));

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

export const createVenta = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;
    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }
    const result = await ventaService.createVenta(data);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Venta',
            entidadId: result.id,
            accion: 'create',
            detalle: `Venta creada para vehículo ${result.vehiculoId}`
        });
    }

    res.status(201).send(ApiResponse.success(result));
});

export const updateVenta = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await ventaService.getVentaById(id);
    requireSameTenant(req.user, current.concesionariaId);
    const result = await ventaService.updateVenta(id, req.body);

    const user = req.user;
    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Venta',
            entidadId: id,
            accion: 'update',
            detalle: `Venta ${id} actualizada`
        });
    }

    res.send(ApiResponse.success(result));
});

export const deleteVenta = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await ventaService.getVentaById(id);
    requireSameTenant(req.user, current.concesionariaId);
    await ventaService.deleteVenta(id);

    const user = req.user;
    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Venta',
            entidadId: id,
            accion: 'delete_soft',
            detalle: `Venta ${id} eliminada`
        });
    }

    res.send(ApiResponse.success({ message: 'Venta eliminada' }));
});
