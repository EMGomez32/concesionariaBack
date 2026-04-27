import type { Prisma, Cliente } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import type { QueryOptions, PaginatedResponse } from '../../types/common';

export const getClientes = async (
    filter: Prisma.ClienteWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Cliente>> => {
    const limit = Number(options.limit) || 20;
    const page = Number(options.page) || 1;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const results = await prisma.cliente.findMany({
        where: filter,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { [sortBy]: sortOrder },
    });

    const total = await prisma.cliente.count({ where: filter });

    return {
        results,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    };
};

export const getClienteById = async (id: number): Promise<Cliente> => {
    const cliente = await prisma.cliente.findUnique({
        where: { id },
    });
    if (!cliente) {
        throw new ApiError(404, 'Cliente no encontrado', 'NOT_FOUND');
    }
    return cliente;
};

export const createCliente = async (data: Prisma.ClienteUncheckedCreateInput): Promise<Cliente> => {
    return prisma.cliente.create({ data });
};

export const updateCliente = async (id: number, data: Prisma.ClienteUpdateInput): Promise<Cliente> => {
    await getClienteById(id);
    return prisma.cliente.update({
        where: { id },
        data,
    });
};

export const deleteCliente = async (id: number): Promise<Cliente> => {
    await getClienteById(id);

    // No permitir borrar si tiene ventas asociadas
    const hasVentas = await prisma.venta.count({ where: { clienteId: id } });
    if (hasVentas > 0) {
        throw new ApiError(400, 'No se puede eliminar el cliente porque tiene ventas asociadas', 'HAS_RELATIONS');
    }

    // No permitir borrar si tiene presupuestos
    const hasPresupuestos = await prisma.presupuesto.count({ where: { clienteId: id } });
    if (hasPresupuestos > 0) {
        throw new ApiError(400, 'No se puede eliminar el cliente porque tiene presupuestos asociados', 'HAS_RELATIONS');
    }

    return prisma.cliente.delete({
        where: { id },
    });
};
