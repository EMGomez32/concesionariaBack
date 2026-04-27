import { Prisma, Presupuesto } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getPresupuestos = async (
    filter: Prisma.PresupuestoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Presupuesto>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.presupuesto.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            vendedor: { select: { nombre: true, email: true } },
            items: true
        }
    });

    const total = await prisma.presupuesto.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getPresupuestoById = async (id: number) => {
    const result = await prisma.presupuesto.findUnique({
        where: { id },
        include: {
            cliente: true,
            items: true,
            extras: true,
            canje: true,
            vendedor: true
        }
    });
    if (!result) throw new ApiError(404, 'Presupuesto no encontrado');
    return result;
};

export const createPresupuesto = async (data: any) => {
    const { items, externos, canjes, canje, ...presupuestoData } = data;

    const canjeData = canjes || canje; // Handle both arrays / single from data

    return prisma.presupuesto.create({
        data: {
            ...presupuestoData,
            estado: 'borrador',
            items: {
                create: items || []
            },
            extras: {
                create: externos || []
            },
            ...(canjeData ? { canje: { create: canjeData } } : {})
        },
        include: {
            items: true,
            extras: true,
            canje: true
        }
    });
};

export const updatePresupuesto = async (id: number, data: Prisma.PresupuestoUpdateInput) => {
    await getPresupuestoById(id);
    return prisma.presupuesto.update({
        where: { id },
        data
    });
};

export const deletePresupuesto = async (id: number) => {
    await getPresupuestoById(id);
    return prisma.presupuesto.delete({ where: { id } });
};
