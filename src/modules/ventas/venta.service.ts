import { Prisma, Venta } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getVentas = async (
    filter: Prisma.VentaWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Venta>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.venta.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            vehiculo: true,
            vendedor: { select: { nombre: true, email: true } }
        }
    });

    const total = await prisma.venta.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getVentaById = async (id: number) => {
    const result = await prisma.venta.findUnique({
        where: { id },
        include: {
            cliente: true,
            vehiculo: true,
            extras: true,
            pagos: true,
            canjes: true,
            vendedor: true,
            presupuesto: true
        }
    });
    if (!result) throw new ApiError(404, 'Venta no encontrada');
    return result;
};

export const createVenta = async (data: any) => {
    const { items, externos, pagos, canjes, reservaId, presupuestoId, ...ventaData } = data;

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: ventaData.vehiculoId } });
    if (!vehiculo) throw new ApiError(404, 'Vehículo no encontrado');
    if (vehiculo.estado === 'vendido') throw new ApiError(400, 'El vehículo ya está vendido');

    return prisma.$transaction(async (tx) => {
        // 1. Crear la venta
        const venta = await tx.venta.create({
            data: {
                ...ventaData,
                estado: 'finalizada',
                concesionariaId: vehiculo.concesionariaId,
                presupuestoId,
                extras: { create: externos || [] },
                pagos: { create: pagos || [] },
                canjes: { create: canjes || [] }
            }
        });

        // 2. Marcar vehículo como vendido
        await tx.vehiculo.update({
            where: { id: ventaData.vehiculoId },
            data: { estado: 'vendido' }
        });

        // 3. Si hay reserva, completarla
        if (reservaId) {
            await tx.reserva.update({
                where: { id: reservaId },
                data: { estado: 'convertida_en_venta' }
            });
        }

        // 4. Si hay presupuesto, aprobarlo
        if (presupuestoId) {
            await tx.presupuesto.update({
                where: { id: presupuestoId },
                data: { estado: 'aceptado' }
            });
        }

        return venta;
    });
};

export const updateVenta = async (id: number, data: Prisma.VentaUpdateInput) => {
    await getVentaById(id);
    return prisma.venta.update({
        where: { id },
        data
    });
};

export const deleteVenta = async (id: number) => {
    const current = await getVentaById(id);

    return prisma.$transaction(async (tx) => {
        // Si borramos la venta, el vehículo vuelve a estar 'publicado'
        await tx.vehiculo.update({
            where: { id: current.vehiculoId },
            data: { estado: 'publicado' }
        });
        return tx.venta.delete({ where: { id } });
    });
};
