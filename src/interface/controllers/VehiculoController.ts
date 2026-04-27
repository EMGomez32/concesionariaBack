import { Request, Response, NextFunction } from 'express';
import { PrismaVehiculoRepository } from '../../infrastructure/database/repositories/PrismaVehiculoRepository';
import { GetVehiculos } from '../../application/use-cases/vehiculos/GetVehiculos';
import { GetVehiculoById } from '../../application/use-cases/vehiculos/GetVehiculoById';
import { CreateVehiculo } from '../../application/use-cases/vehiculos/CreateVehiculo';
import { UpdateVehiculo } from '../../application/use-cases/vehiculos/UpdateVehiculo';
import { DeleteVehiculo } from '../../application/use-cases/vehiculos/DeleteVehiculo';
import { TransferVehiculo } from '../../application/use-cases/vehiculos/TransferVehiculo';
import { audit } from '../../infrastructure/security/audit';

const repository = new PrismaVehiculoRepository();
const getVehiculosUC = new GetVehiculos(repository);
const getVehiculoByIdUC = new GetVehiculoById(repository);
const createVehiculoUC = new CreateVehiculo(repository);
const updateVehiculoUC = new UpdateVehiculo(repository);
const deleteVehiculoUC = new DeleteVehiculo(repository);
const transferVehiculoUC = new TransferVehiculo(repository);

export class VehiculoController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit, page, sortBy, sortOrder, ...filters } = req.query;
            const result = await getVehiculosUC.execute(filters, { limit, page, sortBy, sortOrder } as any);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await getVehiculoByIdUC.execute(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await createVehiculoUC.execute(req.body);
            const label = (result as any)?.patente ?? (result as any)?.marca ?? (result as any)?.id;
            await audit({
                entidad: 'Vehiculo',
                accion: 'create',
                entidadId: (result as any)?.id,
                detalle: `Vehiculo ${label} creado`,
            });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await updateVehiculoUC.execute(id, req.body);
            await audit({
                entidad: 'Vehiculo',
                accion: 'update',
                entidadId: id,
                detalle: `Vehiculo ${id} actualizado`,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            await deleteVehiculoUC.execute(id);
            await audit({
                entidad: 'Vehiculo',
                accion: 'delete_soft',
                entidadId: id,
                detalle: `Vehiculo ${id} eliminado`,
            });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async transferir(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const { sucursalDestinoId, motivo } = req.body;
            const result = await transferVehiculoUC.execute(id, Number(sucursalDestinoId), motivo);
            await audit({
                entidad: 'Vehiculo',
                accion: 'update',
                entidadId: id,
                detalle: `Vehículo transferido a sucursal ${sucursalDestinoId}`,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}
