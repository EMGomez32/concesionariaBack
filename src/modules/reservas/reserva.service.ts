import { Prisma, Reserva } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';

export const getReservas = async (
    filter: Prisma.ReservaWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<Reserva>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.reserva.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            vehiculo: true,
            creadaPor: { select: { nombre: true, email: true } },
            sucursal: true
        }
    });

    const total = await prisma.reserva.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const getReservaById = async (id: number) => {
    const reserva = await prisma.reserva.findUnique({
        where: { id },
        include: { cliente: true, vehiculo: true, sucursal: true, creadaPor: true }
    });
    if (!reserva) throw new ApiError(404, 'Reserva no encontrada');
    return reserva;
};

export const createReserva = async (data: Prisma.ReservaUncheckedCreateInput) => {
    const { vehiculoId } = data;

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
    if (!vehiculo) throw new ApiError(404, 'Vehículo no encontrado');
    if (vehiculo.estado === 'reservado' || vehiculo.estado === 'vendido') {
        throw new ApiError(400, 'El vehículo no está disponible para reserva');
    }

    return prisma.$transaction(async (tx) => {
        const reserva = await tx.reserva.create({
            data: {
                ...data,
                concesionariaId: vehiculo.concesionariaId,
                estado: 'activa'
            }
        });

        await tx.vehiculo.update({
            where: { id: vehiculoId },
            data: { estado: 'reservado' }
        });

        return reserva;
    });
};

export const updateReserva = async (id: number, data: Prisma.ReservaUpdateInput) => {
    const current = await getReservaById(id);

    return prisma.$transaction(async (tx) => {
        const updated = await tx.reserva.update({
            where: { id },
            data
        });

        // Si se cancela o vence, liberamos el vehículo
        if ((data.estado === 'cancelada' || data.estado === 'vencida') && current.estado === 'activa') {
            await tx.vehiculo.update({
                where: { id: current.vehiculoId },
                data: { estado: 'publicado' }
            });
        }

        return updated;
    });
};

export const deleteReserva = async (id: number) => {
    const current = await getReservaById(id);

    return prisma.$transaction(async (tx) => {
        // Si la reserva estaba activa, liberamos el vehículo al borrarla físicamente o lógicamente
        if (current.estado === 'activa') {
            await tx.vehiculo.update({
                where: { id: current.vehiculoId },
                data: { estado: 'publicado' }
            });
        }
        return tx.reserva.delete({ where: { id } });
    });
};
