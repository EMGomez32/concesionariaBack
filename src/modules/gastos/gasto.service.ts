import type { Prisma, GastoVehiculo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import type { QueryOptions, PaginatedResponse } from '../../types/common';

export const getGastos = async (
    filter: Prisma.GastoVehiculoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<GastoVehiculo>> => {
    const limit = Number(options.limit) || 20;
    const page = Number(options.page) || 1;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const results = await prisma.gastoVehiculo.findMany({
        where: filter,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
            categoria: true,
            vehiculo: {
                include: { sucursal: true }
            },
            proveedor: true
        }
    }) as any;

    const total = await prisma.gastoVehiculo.count({ where: filter });

    return {
        results,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    };
};

export const getGastoById = async (id: number): Promise<GastoVehiculo> => {
    const gasto = await prisma.gastoVehiculo.findUnique({
        where: { id },
        include: { categoria: true, vehiculo: true, proveedor: true },
    });
    if (!gasto) throw new ApiError(404, 'Gasto no encontrado', 'NOT_FOUND');
    return gasto as GastoVehiculo;
};

/**
 * Total agregado con filtros opcionales. Migrado desde
 * interface/controllers/GastoController.total (Sprint 4 cont).
 */
export const getGastoTotal = async (
    filter: Record<string, unknown>,
): Promise<{ total: number; count: number; filters: Record<string, unknown> }> => {
    const r = await prisma.gastoVehiculo.aggregate({
        _sum: { monto: true },
        _count: true,
        where: filter as Prisma.GastoVehiculoWhereInput,
    });
    return {
        total: Number(r._sum.monto ?? 0),
        count: r._count,
        filters: filter,
    };
};

export const createGasto = async (data: Prisma.GastoVehiculoUncheckedCreateInput): Promise<GastoVehiculo> => {
    return prisma.gastoVehiculo.create({ data });
};

export const updateGasto = async (id: number, data: Prisma.GastoVehiculoUpdateInput): Promise<GastoVehiculo> => {
    return prisma.gastoVehiculo.update({
        where: { id },
        data
    });
};

export const deleteGasto = async (id: number): Promise<GastoVehiculo> => {
    return prisma.gastoVehiculo.delete({ where: { id } });
};
