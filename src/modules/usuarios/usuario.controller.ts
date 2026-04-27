import { Request, Response } from 'express';
import * as usuarioService from './usuario.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';
import { requireSameTenant } from '../../utils/requireSameTenant';
import * as auditoriaService from '../auditoria/auditoria.service';

export const getUsuarios = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['nombre', 'email', 'concesionariaId', 'sucursalId', 'activo']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['concesionariaId', 'sucursalId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await usuarioService.getUsuarios(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getUsuario = catchAsync(async (req: Request, res: Response) => {
    const result = await usuarioService.getUsuarioById(parseInt(req.params.id as string, 10));

    requireSameTenant(req.user, result.concesionariaId);

    res.send(ApiResponse.success(result));
});

/**
 * Alta de usuario por flujo de invitación.
 * El admin envía solo los datos básicos (nombre, email, sucursalId, roleIds);
 * el sistema crea el usuario en estado pendiente y dispara email de activación.
 * El password lo crea el propio usuario al activar.
 */
export const createUsuario = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const { nombre, email, sucursalId, roleIds } = req.body;

    const concesionariaId = user && !user.roles.includes('super_admin')
        ? user.concesionariaId
        : (req.body.concesionariaId ?? null);

    const result = await usuarioService.createUsuario({
        nombre,
        email,
        concesionariaId,
        sucursalId: sucursalId ?? null,
        roleIds,
        invitadoPorUsuarioId: user?.userId,
    });

    // La auditoría de "invite" la registra el use case; acá no duplicamos.
    res.status(201).send(ApiResponse.success(result));
});

export const updateUsuario = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const user = req.user;

    const current = await usuarioService.getUsuarioById(id);
    requireSameTenant(user, current.concesionariaId);

    const result = await usuarioService.updateUsuario(id, req.body);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Usuario',
            entidadId: id,
            accion: 'update',
            detalle: `Usuario ${id} actualizado`
        });
    }

    res.send(ApiResponse.success(result));
});

export const deleteUsuario = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const user = req.user;

    const current = await usuarioService.getUsuarioById(id);
    requireSameTenant(user, current.concesionariaId);

    await usuarioService.deleteUsuario(id);

    if (user) {
        await auditoriaService.createAuditLog({
            concesionariaId: user.concesionariaId as number,
            usuarioId: user.userId,
            entidad: 'Usuario',
            entidadId: id,
            accion: 'delete_soft',
            detalle: `Usuario ${id} eliminado`
        });
    }

    res.send(ApiResponse.success({ message: 'Usuario eliminado con éxito' }));
});
