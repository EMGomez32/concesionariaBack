import { Prisma, Proveedor } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getProveedores = async (
    filter: Prisma.ProveedorWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Proveedor>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.proveedor.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
    });

    const total = await prisma.proveedor.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getProveedorById = async (id: number): Promise<Proveedor> => {
    const proveedor = await prisma.proveedor.findUnique({
        where: { id },
    });
    if (!proveedor) {
        throw new ApiError(404, 'Proveedor no encontrado', 'NOT_FOUND');
    }
    return proveedor;
};

export const createProveedor = async (data: Prisma.ProveedorUncheckedCreateInput): Promise<Proveedor> => {
    return prisma.proveedor.create({ data });
};

export const updateProveedor = async (id: number, data: Prisma.ProveedorUpdateInput): Promise<Proveedor> => {
    await getProveedorById(id);
    return prisma.proveedor.update({
        where: { id },
        data,
    });
};

export const deleteProveedor = async (id: number): Promise<Proveedor> => {
    await getProveedorById(id);

    // No permitir borrar si tiene gastos asociados
    const hasGastos = await prisma.gastoVehiculo.count({ where: { proveedorId: id } });
    if (hasGastos > 0) {
        throw new ApiError(400, 'No se puede eliminar el proveedor porque tiene gastos asociados', 'HAS_RELATIONS');
    }

    return prisma.proveedor.delete({
        where: { id },
    });
};
