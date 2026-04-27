import { IReservaRepository } from '../../../domain/repositories/IReservaRepository';
import { Reserva } from '../../../domain/entities/Reserva';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaReservaRepository implements IReservaRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Reserva>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

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
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Reserva | null> {
        const r = await prisma.reserva.findUnique({
            where: { id },
            include: { cliente: true, vehiculo: true, sucursal: true, creadaPor: true }
        });
        return r ? this.mapToEntity(r) : null;
    }

    async create(data: any): Promise<Reserva> {
        const r = await prisma.reserva.create({ data });
        return this.mapToEntity(r);
    }

    async update(id: number, data: any): Promise<Reserva> {
        const r = await prisma.reserva.update({
            where: { id },
            data,
        });
        return this.mapToEntity(r);
    }

    async delete(id: number): Promise<void> {
        await prisma.reserva.delete({ where: { id } });
    }

    private mapToEntity(r: any): Reserva {
        return new Reserva(
            r.id,
            r.concesionariaId,
            r.sucursalId,
            r.vehiculoId,
            r.clienteId,
            r.usuarioId,
            Number(r.montoReserva),
            r.fechaReserva,
            r.fechaVencimiento,
            r.estado,
            r.observaciones,
            r.createdAt,
            r.updatedAt,
            r.deletedAt,
            r.cliente,
            r.vehiculo,
            r.sucursal,
            r.creadaPor
        );
    }
}
