import { Prisma, PostventaCaso } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getCasos = async (
    filter: Prisma.PostventaCasoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<PostventaCaso>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.postventaCaso.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            vehiculo: true,
            sucursal: true,
            items: true
        }
    }) as any;

    const total = await prisma.postventaCaso.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getCasoById = async (id: number) => {
    const result = await prisma.postventaCaso.findUnique({
        where: { id },
        include: { cliente: true, vehiculo: true, sucursal: true, items: true }
    });
    if (!result) throw new ApiError(404, 'Caso no encontrado');
    return result;
};

export const createCaso = async (data: Prisma.PostventaCasoUncheckedCreateInput) => {
    return prisma.postventaCaso.create({
        data: {
            ...data,
            estado: 'pendiente'
        }
    });
};

export const updateCaso = async (id: number, data: Prisma.PostventaCasoUpdateInput) => {
    return prisma.postventaCaso.update({
        where: { id },
        data
    });
};

export const deleteCaso = async (id: number) => {
    return prisma.postventaCaso.delete({ where: { id } });
};
