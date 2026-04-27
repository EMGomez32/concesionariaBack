import { Request, Response, NextFunction } from 'express';
import { PrismaCategoriaGastoFijoRepository } from '../../infrastructure/database/repositories/PrismaCategoriaGastoFijoRepository';
import { GetCategoriasGastoFijo } from '../../application/use-cases/gastos-fijos-categorias/GetCategoriasGastoFijo';
import { CreateCategoriaGastoFijo } from '../../application/use-cases/gastos-fijos-categorias/CreateCategoriaGastoFijo';
import { DeleteCategoriaGastoFijo } from '../../application/use-cases/gastos-fijos-categorias/DeleteCategoriaGastoFijo';
import { context } from '../../infrastructure/security/context';
import { audit } from '../../infrastructure/security/audit';

const repository = new PrismaCategoriaGastoFijoRepository();
const getCategoriasUC = new GetCategoriasGastoFijo(repository);
const createCategoriaUC = new CreateCategoriaGastoFijo(repository);
const deleteCategoriaUC = new DeleteCategoriaGastoFijo(repository);

export class CategoriaGastoFijoController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = context.getTenantId();
            const result = await getCategoriasUC.execute(tenantId!);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await createCategoriaUC.execute(req.body);
            await audit({
                entidad: 'CategoriaGastoFijo',
                accion: 'create',
                entidadId: (result as any)?.id,
                detalle: `CategoriaGastoFijo ${(result as any)?.nombre ?? (result as any)?.id} creada`,
            });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            await deleteCategoriaUC.execute(id);
            await audit({
                entidad: 'CategoriaGastoFijo',
                accion: 'delete_soft',
                entidadId: id,
                detalle: `CategoriaGastoFijo ${id} eliminada`,
            });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
