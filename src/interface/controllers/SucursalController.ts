import { Request, Response, NextFunction } from 'express';
import { PrismaSucursalRepository } from '../../infrastructure/database/repositories/PrismaSucursalRepository';
import { GetSucursales } from '../../application/use-cases/sucursales/GetSucursales';
import { GetSucursalById } from '../../application/use-cases/sucursales/GetSucursalById';
import { CreateSucursal } from '../../application/use-cases/sucursales/CreateSucursal';
import { UpdateSucursal } from '../../application/use-cases/sucursales/UpdateSucursal';
import { DeleteSucursal } from '../../application/use-cases/sucursales/DeleteSucursal';

const repository = new PrismaSucursalRepository();
const getSucursalesUC = new GetSucursales(repository);
const getSucursalByIdUC = new GetSucursalById(repository);
const createSucursalUC = new CreateSucursal(repository);
const updateSucursalUC = new UpdateSucursal(repository);
const deleteSucursalUC = new DeleteSucursal(repository);

export class SucursalController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit, page, sortBy, sortOrder, ...filters } = req.query;
            const result = await getSucursalesUC.execute(filters, { limit, page, sortBy, sortOrder } as any);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await getSucursalByIdUC.execute(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await createSucursalUC.execute(req.body);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await updateSucursalUC.execute(id, req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            await deleteSucursalUC.execute(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
