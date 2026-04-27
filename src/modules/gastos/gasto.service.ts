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
