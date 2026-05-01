import { Prisma, GastoFijo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getGastosFijos = async (
    filter: Prisma.GastoFijoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<GastoFijo>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.gastoFijo.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            categoria: true,
            sucursal: true,
            proveedor: true
        }
    }) as any;

    const total = await prisma.gastoFijo.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createGastoFijo = async (data: Prisma.GastoFijoUncheckedCreateInput): Promise<GastoFijo> => {
    return prisma.gastoFijo.create({ data });
};

export const getGastoFijoById = async (id: number) => {
    const result = await prisma.gastoFijo.findUnique({
        where: { id },
        include: { categoria: true, sucursal: true, proveedor: true }
    });
    if (!result) throw new ApiError(404, 'Gasto fijo no encontrado');
    return result;
};

export const updateGastoFijo = async (id: number, data: Prisma.GastoFijoUpdateInput) => {
    return prisma.gastoFijo.update({
        where: { id },
        data
    });
};

export const deleteGastoFijo = async (id: number) => {
    return prisma.gastoFijo.delete({ where: { id } });
};

/**
 * Total agregado por año/mes/sucursal/categoría. Migrado desde
 * interface/controllers/GastoFijoController.total (Sprint 4 cont).
 */
export const getTotal = async (filter: {
    anio?: number;
    mes?: number;
    sucursalId?: number;
    categoriaId?: number;
    concesionariaId?: number;
}) => {
    if (!filter.anio) {
        throw new ApiError(400, 'El parámetro `anio` es obligatorio', 'VALIDATION_ERROR');
    }
    const where: Prisma.GastoFijoWhereInput = { anio: filter.anio };
    if (filter.mes != null) where.mes = filter.mes;
    if (filter.sucursalId != null) where.sucursalId = filter.sucursalId;
    if (filter.categoriaId != null) where.categoriaId = filter.categoriaId;
    if (filter.concesionariaId != null) where.concesionariaId = filter.concesionariaId;

    const r = await prisma.gastoFijo.aggregate({
        _sum: { monto: true },
        _count: true,
        where,
    });
    return {
        total: Number(r._sum.monto ?? 0),
        count: r._count,
        filters: filter,
    };
};
