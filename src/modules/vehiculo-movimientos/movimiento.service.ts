import { Prisma, VehiculoMovimiento } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getMovimientos = async (
    filter: Prisma.VehiculoMovimientoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<VehiculoMovimiento>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.vehiculoMovimiento.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            vehiculo: true,
            desdeSucursal: true,
            hastaSucursal: true,
            registradoPor: { select: { nombre: true, email: true } }
        }
    }) as any;

    const total = await prisma.vehiculoMovimiento.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createMovimiento = async (data: any) => {
    const { vehiculoId, hastaSucursalId, registradoPorId, motivo } = data;

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) throw new ApiError(404, 'Vehículo no encontrado');

    const desdeSucursalId = vehiculo.sucursalId;

    if (desdeSucursalId === hastaSucursalId) {
        throw new ApiError(400, 'La sucursal de destino debe ser diferente a la de origen');
    }

    return prisma.$transaction(async (tx) => {
        const movimiento = await tx.vehiculoMovimiento.create({
            data: {
                vehiculoId,
                desdeSucursalId,
                hastaSucursalId,
                registradoPorId,
                tipo: 'traslado',
                motivo,
                concesionariaId: vehiculo.concesionariaId
            }
        });

        await tx.vehiculo.update({
            where: { id: vehiculoId },
            data: { sucursalId: hastaSucursalId }
        });

        return movimiento;
    });
};
