import { Request, Response } from 'express';
import * as vehiculoService from './vehiculo.service';
import * as auditoriaService from '../auditoria/auditoria.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';

export const getVehiculos = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['marca', 'modelo', 'estado', 'tipo', 'dominio', 'sucursalId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['sucursalId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await vehiculoService.getVehiculos(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getVehiculo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await vehiculoService.getVehiculoById(id);

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

export const createVehiculo = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = req.body;

    if (user && !user.roles.includes('super_admin')) {
        data.concesionariaId = user.concesionariaId;
    }

    const result = await vehiculoService.createVehiculo(data);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Vehiculo',
            entidadId: result.id,
            accion: 'create',
            detalle: `Vehículo ${result.marca} ${result.modelo} creado`
        });
    }

    res.status(201).send(ApiResponse.success(result));
});

export const updateVehiculo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await vehiculoService.getVehiculoById(id);
    requireSameTenant(req.user, current.concesionariaId);

    const result = await vehiculoService.updateVehiculo(id, req.body);

    const user = req.user;
    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Vehiculo',
            entidadId: id,
            accion: 'update',
            detalle: `Vehículo ${id} actualizado`
        });
    }

    res.send(ApiResponse.success(result));
});

export const deleteVehiculo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const current = await vehiculoService.getVehiculoById(id);
    requireSameTenant(req.user, current.concesionariaId);

    await vehiculoService.deleteVehiculo(id);

    const user = req.user;
    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Vehiculo',
            entidadId: id,
            accion: 'delete_soft',
            detalle: `Vehículo ${id} eliminado`
        });
    }

    res.send(ApiResponse.success({ message: 'Vehículo eliminado con éxito' }));
});

/**
 * Transfiere un vehículo de una sucursal a otra (mismo tenant).
 * Crea un VehiculoMovimiento de tipo "traslado" en la misma transacción.
 * Migrado desde interface/controllers/VehiculoController.ts (Sprint 4 cont).
 */
export const transferirVehiculo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const { sucursalDestinoId, motivo } = req.body;
    const user = req.user;

    const current = await vehiculoService.getVehiculoById(id);
    requireSameTenant(user, current.concesionariaId);

    const result = await vehiculoService.transferirVehiculo(
        id,
        Number(sucursalDestinoId),
        motivo,
    );

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Vehiculo',
            entidadId: id,
            accion: 'update',
            detalle: `Vehículo transferido a sucursal ${sucursalDestinoId}`,
        });
    }

    res.send(ApiResponse.success(result));
});
