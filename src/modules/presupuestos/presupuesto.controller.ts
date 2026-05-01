import { Request, Response } from 'express';
import * as presupuestoService from './presupuesto.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getPresupuestos = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['estado', 'clienteId', 'vehiculoId', 'vendedorId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['clienteId', 'vehiculoId', 'vendedorId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await presupuestoService.getPresupuestos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getPresupuesto = catchAsync(async (req: Request, res: Response) => {
    const result = await presupuestoService.getPresupuestoById(parseInt(req.params.id as string, 10));

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

export const createPresupuesto = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;
    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }
    const result = await presupuestoService.createPresupuesto(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updatePresupuesto = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await presupuestoService.getPresupuestoById(id);
    requireSameTenant(req.user, current.concesionariaId);
    const result = await presupuestoService.updatePresupuesto(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deletePresupuesto = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await presupuestoService.getPresupuestoById(id);
    requireSameTenant(req.user, current.concesionariaId);
    await presupuestoService.deletePresupuesto(id);
    res.send(ApiResponse.success({ message: 'Presupuesto eliminado' }));
});

/**
 * HU-60: total del presupuesto = sum(items.precioFinal) + sum(extras.monto)
 *        - canje.valorTomado.
 * Migrado desde interface/controllers/PresupuestoController.total.
 */
export const getPresupuestoTotal = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await presupuestoService.getPresupuestoTotal(id);
    res.send(ApiResponse.success(result));
});

/**
 * Convertir presupuesto aceptado en venta. Reusa modules/ventas/createVenta
 * (que ya tiene SELECT FOR UPDATE para evitar TOCTOU). Migrado desde
 * application/use-cases/presupuestos/ConvertPresupuestoToVenta.
 */
export const convertirEnVenta = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await presupuestoService.getPresupuestoById(id);
    requireSameTenant(req.user, current.concesionariaId);
    const venta = await presupuestoService.convertirEnVenta(id, req.body);
    res.status(201).send(ApiResponse.success(venta));
});
