import { Prisma, Concesionaria } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getConcesionarias = async (
    filter: Prisma.ConcesionariaWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Concesionaria>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const concesionarias = await prisma.concesionaria.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
    });

    const total = await prisma.concesionaria.count({ where: filter });

    return {
        results: concesionarias,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getConcesionariaById = async (id: number) => {
    const concesionaria = await prisma.concesionaria.findUnique({
        where: { id },
        include: { subscription: { include: { plan: true } } }
    });
    if (!concesionaria) {
        throw new ApiError(404, 'Concesionaria no encontrada', 'NOT_FOUND');
    }
    return concesionaria;
};

export const createConcesionaria = async (data: Prisma.ConcesionariaCreateInput): Promise<Concesionaria> => {
    return prisma.concesionaria.create({ data });
};

export const updateConcesionaria = async (id: number, data: Prisma.ConcesionariaUpdateInput): Promise<Concesionaria> => {
    await getConcesionariaById(id);
    return prisma.concesionaria.update({
        where: { id },
        data,
    });
};

/**
 * Soft-delete: marca `deletedAt` en lugar de borrar el registro.
 * IMPORTANTE: Concesionaria es la entidad raíz multi-tenant. Un hard-delete
 * dispararía cascadas FK que bajan TODA la data de un tenant. Aunque la
 * extensión Prisma intercepta `delete` y lo convierte en update, hacemos el
 * soft-delete explícito acá para no depender de magic intercepts.
 */
export const deleteConcesionaria = async (id: number): Promise<Concesionaria> => {
    await getConcesionariaById(id);
    return prisma.concesionaria.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
};
