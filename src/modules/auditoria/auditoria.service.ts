import type { Prisma, AuditLog } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import type { QueryOptions, PaginatedResponse } from '../../types/common';

export const getAuditLogs = async (
    filter: Prisma.AuditLogWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<AuditLog>> => {
    const limit = Number(options.limit) || 50;
    const page = Number(options.page) || 1;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const results = await prisma.auditLog.findMany({
        where: filter,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
            usuario: { select: { nombre: true, email: true } }
        }
    }) as any;

    const total = await prisma.auditLog.count({ where: filter });

    return {
        results,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    };
};

export const getAuditLogById = async (id: number) => {
    const result = await prisma.auditLog.findUnique({
        where: { id },
        include: { usuario: { select: { nombre: true, email: true } } }
    });
    if (!result) throw new ApiError(404, 'Registro de auditoría no encontrado');
    return result;
};

export const createAuditLog = async (data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> => {
    return prisma.auditLog.create({ data });
};
