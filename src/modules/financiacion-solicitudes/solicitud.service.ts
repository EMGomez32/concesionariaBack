import { Prisma, SolicitudFinanciacion } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getSolicitudes = async (
    filter: Prisma.SolicitudFinanciacionWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<SolicitudFinanciacion>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.solicitudFinanciacion.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            financiera: true
        }
    }) as any;

    const total = await prisma.solicitudFinanciacion.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createSolicitud = async (data: Prisma.SolicitudFinanciacionUncheckedCreateInput) => {
    return prisma.solicitudFinanciacion.create({
        data: {
            ...data,
            estado: 'pendiente'
        }
    });
};

export const updateSolicitud = async (id: number, data: Prisma.SolicitudFinanciacionUpdateInput) => {
    return prisma.solicitudFinanciacion.update({
        where: { id },
        data
    });
};

export const deleteSolicitud = async (id: number) => {
    return prisma.solicitudFinanciacion.delete({ where: { id } });
};
