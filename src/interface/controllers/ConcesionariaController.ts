import { Request, Response, NextFunction } from 'express';
import { PrismaConcesionariaRepository } from '../../infrastructure/database/repositories/PrismaConcesionariaRepository';
import { GetConcesionarias } from '../../application/use-cases/concesionarias/GetConcesionarias';
import { GetConcesionariaById } from '../../application/use-cases/concesionarias/GetConcesionariaById';
import { CreateConcesionaria } from '../../application/use-cases/concesionarias/CreateConcesionaria';
import { UpdateConcesionaria } from '../../application/use-cases/concesionarias/UpdateConcesionaria';
import { DeleteConcesionaria } from '../../application/use-cases/concesionarias/DeleteConcesionaria';
import { audit } from '../../infrastructure/security/audit';

const repository = new PrismaConcesionariaRepository();
const getConcesionariasUC = new GetConcesionarias(repository);
const getConcesionariaByIdUC = new GetConcesionariaById(repository);
const createConcesionariaUC = new CreateConcesionaria(repository);
const updateConcesionariaUC = new UpdateConcesionaria(repository);
const deleteConcesionariaUC = new DeleteConcesionaria(repository);

export class ConcesionariaController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit, page, sortBy, sortOrder, ...filters } = req.query;
            const result = await getConcesionariasUC.execute(filters, { limit, page, sortBy, sortOrder } as any);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await getConcesionariaByIdUC.execute(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await createConcesionariaUC.execute(req.body);
            await audit({
                entidad: 'Concesionaria',
                accion: 'create',
                entidadId: (result as any)?.id,
                detalle: `Concesionaria ${(result as any)?.nombre ?? (result as any)?.id} creada`,
                concesionariaId: (result as any)?.id,
            });
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await updateConcesionariaUC.execute(id, req.body);
            await audit({
                entidad: 'Concesionaria',
                accion: 'update',
                entidadId: id,
                detalle: `Concesionaria ${(result as any)?.nombre ?? id} actualizada`,
                concesionariaId: id,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            await deleteConcesionariaUC.execute(id);
            await audit({
                entidad: 'Concesionaria',
                accion: 'delete_soft',
                entidadId: id,
                detalle: `Concesionaria ${id} eliminada`,
                concesionariaId: id,
            });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
