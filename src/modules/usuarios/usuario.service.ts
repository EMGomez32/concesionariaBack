import { Prisma, Usuario } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import bcrypt from 'bcrypt';
import { QueryOptions, PaginatedResponse } from '../../types/common';
import { inviteUsuario as inviteUsuarioUseCase } from '../account/account.service';

export const getUsuarios = async (
    filter: Prisma.UsuarioWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Usuario>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.usuario.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            roles: {
                include: { rol: true }
            },
            sucursal: true,
            concesionaria: {
                select: {
                    id: true,
                    nombre: true,
                },
            },
        }
    });

    const total = await prisma.usuario.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getUsuarioById = async (id: number) => {
    const usuario = await prisma.usuario.findUnique({
        where: { id },
        include: {
            roles: {
                include: { rol: true }
            },
            sucursal: true,
            concesionaria: {
                select: {
                    id: true,
                    nombre: true,
                },
            },
        }
    });
    if (!usuario) {
        throw new ApiError(404, 'Usuario no encontrado', 'NOT_FOUND');
    }
    return usuario;
};

/**
 * Alta de usuario vía flujo de invitación.
 * No acepta password — el usuario la crea al activar su cuenta vía email.
 *
 * El parámetro `invitadoPorUsuarioId` lo pasa el controller a partir de
 * req.user para registrar quién creó la invitación en auditoría.
 */
export const createUsuario = async (data: {
    nombre: string;
    email: string;
    concesionariaId: number | null;
    sucursalId: number | null;
    roleIds: number[];
    invitadoPorUsuarioId?: number;
}) => {
    return inviteUsuarioUseCase({
        nombre: data.nombre,
        email: data.email,
        concesionariaId: data.concesionariaId,
        sucursalId: data.sucursalId,
        roleIds: data.roleIds,
        invitadoPorUsuarioId: data.invitadoPorUsuarioId,
    });
};

// Mass-assignment guard: solo estos campos son editables vía este endpoint.
// `concesionariaId`, `passwordHash`, `emailVerificado`, `estado` quedan
// excluidos para que un cliente no pueda escalar privilegios o cambiar
// de tenant mandándolos en el body.
const USUARIO_UPDATE_ALLOWED = [
    'nombre',
    'email',
    'telefono',
    'direccion',
    'activo',
    'sucursalId',
] as const;

export const updateUsuario = async (id: number, data: any) => {
    const { password, roleIds } = data;

    const updateData: any = {};
    for (const key of USUARIO_UPDATE_ALLOWED) {
        if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (roleIds) {
        // Para simplificar, borramos los roles anteriores y creamos los nuevos
        // Aunque en un sistema de soft-delete real, borrar físico puede ser delicado,
        // UsuarioRol también tiene soft-delete en el schema.
        await prisma.usuarioRol.deleteMany({ where: { usuarioId: id } });
        updateData.roles = {
            create: roleIds.map((rolId: number) => ({ rolId }))
        };
    }

    return prisma.usuario.update({
        where: { id },
        data: updateData,
    });
};

export const deleteUsuario = async (id: number) => {
    await getUsuarioById(id);
    return prisma.usuario.delete({
        where: { id },
    });
};
