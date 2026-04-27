import { Request, Response, NextFunction } from 'express';
import { PrismaUsuarioRepository } from '../../infrastructure/database/repositories/PrismaUsuarioRepository';
import { GetUsuarios } from '../../application/use-cases/usuarios/GetUsuarios';
import { GetUsuarioById } from '../../application/use-cases/usuarios/GetUsuarioById';
import { CreateUsuario } from '../../application/use-cases/usuarios/CreateUsuario';
import { UpdateUsuario } from '../../application/use-cases/usuarios/UpdateUsuario';
import { DeleteUsuario } from '../../application/use-cases/usuarios/DeleteUsuario';
import { ResetPassword } from '../../application/use-cases/usuarios/ResetPassword';
import { cleanFilters } from '../../utils/cleanFilters';
import { audit } from '../../infrastructure/security/audit';
import { context } from '../../infrastructure/security/context';

const repository = new PrismaUsuarioRepository();
const getUsuariosUC = new GetUsuarios(repository);
const getUsuarioByIdUC = new GetUsuarioById(repository);
const createUsuarioUC = new CreateUsuario(repository);
const updateUsuarioUC = new UpdateUsuario(repository);
const deleteUsuarioUC = new DeleteUsuario(repository);
const resetPasswordUC = new ResetPassword(repository);

export class UsuarioController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit, page, sortBy, sortOrder, ...filters } = req.query;
            const result = await getUsuariosUC.execute(cleanFilters(filters), { limit, page, sortBy, sortOrder } as any);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await getUsuarioByIdUC.execute(id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            // Para admin (no super_admin) la concesionaria se hereda del JWT.
            // Para super_admin, debe venir explícita en el body.
            const user = context.getUser();
            const isSuperAdmin = user?.roles?.includes('super_admin');
            const body = isSuperAdmin
                ? req.body
                : { ...req.body, concesionariaId: user?.concesionariaId };

            const result = await createUsuarioUC.execute(body);
            // La auditoría 'invite' la registra el use case via inviteUsuario;
            // no se duplica aquí.
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const result = await updateUsuarioUC.execute(id, req.body);
            await audit({
                entidad: 'Usuario',
                accion: 'update',
                entidadId: id,
                detalle: `Usuario ${(result as any)?.nombre ?? (result as any)?.email ?? id} actualizado`,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            await deleteUsuarioUC.execute(id);
            await audit({
                entidad: 'Usuario',
                accion: 'delete_soft',
                entidadId: id,
                detalle: `Usuario ${id} eliminado`,
            });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id as string, 10);
            const { password } = req.body ?? {};
            await resetPasswordUC.execute(id, password);
            await audit({
                entidad: 'Usuario',
                accion: 'update',
                entidadId: id,
                detalle: `Reset de contraseña para usuario ${id}`,
            });
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
