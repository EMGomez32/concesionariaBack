import { Prisma, IngresoVehiculo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getIngresos = async (
    filter: Prisma.IngresoVehiculoWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<IngresoVehiculo>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.ingresoVehiculo.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            vehiculo: true,
            sucursal: true,
            clienteOrigen: true,
            proveedorOrigen: true,
            registradoPor: { select: { nombre: true, email: true } }
        }
    }) as any;

    const total = await prisma.ingresoVehiculo.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createIngreso = async (data: any) => {
    const { vehiculoId, sucursalId, registradoPorId, fechaIngreso, tipoIngreso, valorTomado, ...rest } = data;

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) throw new ApiError(404, 'Vehículo no encontrado');

    return prisma.$transaction(async (tx) => {
        const ingreso = await tx.ingresoVehiculo.create({
            data: {
                ...rest,
                vehiculoId,
                sucursalId,
                registradoPorId,
                fechaIngreso: new Date(fechaIngreso),
                tipoIngreso,
                valorTomado,
                concesionariaId: vehiculo.concesionariaId
            }
        });

        await tx.vehiculo.update({
            where: { id: vehiculoId },
            data: { sucursalId }
        });

        await tx.vehiculoMovimiento.create({
            data: {
                vehiculoId,
                concesionariaId: vehiculo.concesionariaId,
                tipo: 'ingreso',
                fecha: new Date(),
                hastaSucursalId: sucursalId,
                registradoPorId,
                motivo: `Ingreso registrado: ${tipoIngreso}`
            }
        });

        return ingreso;
    });
};

export const getIngresoById = async (id: number) => {
    const result = await prisma.ingresoVehiculo.findUnique({
        where: { id },
        include: {
            vehiculo: true,
            sucursal: true,
            clienteOrigen: true,
            proveedorOrigen: true,
            registradoPor: { select: { nombre: true, email: true } }
        }
    });
    if (!result) throw new ApiError(404, 'Ingreso no encontrado');
    return result;
};

export const deleteIngreso = async (id: number) => {
    return prisma.ingresoVehiculo.delete({ where: { id } });
};
