import { IPresupuestoRepository } from '../../../domain/repositories/IPresupuestoRepository';
import { Presupuesto } from '../../../domain/entities/Presupuesto';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaPresupuestoRepository implements IPresupuestoRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Presupuesto>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.presupuesto.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                cliente: true,
                vendedor: { select: { nombre: true, email: true } },
                items: true
            }
        });

        const total = await prisma.presupuesto.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Presupuesto | null> {
        const p = await prisma.presupuesto.findUnique({
            where: { id },
            include: {
                cliente: true,
                items: true,
                extras: true,
                canje: true,
                vendedor: true
            }
        });
        return p ? this.mapToEntity(p) : null;
    }

    async create(data: any): Promise<Presupuesto> {
        const { items, externos, canjes, canje, ...presupuestoData } = data;
        const canjeData = canjes || canje;

        const p = await prisma.presupuesto.create({
            data: {
                ...presupuestoData,
                estado: 'borrador',
                items: { create: items || [] },
                extras: { create: externos || [] },
                ...(canjeData ? { canje: { create: canjeData } } : {})
            }
        });
        return this.mapToEntity(p);
    }

    async update(id: number, data: any): Promise<Presupuesto> {
        const p = await prisma.presupuesto.update({
            where: { id },
            data,
        });
        return this.mapToEntity(p);
    }

    async delete(id: number): Promise<void> {
        await prisma.presupuesto.delete({ where: { id } });
    }

    async countByYearAndConcesionaria(year: number, concesionariaId: number): Promise<number> {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        return prisma.presupuesto.count({
            where: {
                concesionariaId,
                createdAt: { gte: start, lt: end },
            },
        });
    }

    private mapToEntity(p: any): Presupuesto {
        return new Presupuesto(
            p.id,
            p.concesionariaId,
            p.sucursalId,
            p.clienteId,
            p.vendedorId,
            p.vehiculoId,
            p.nroPresupuesto,
            p.fecha,
            Number(p.subtotal),
            Number(p.total),
            p.estado,
            p.createdAt,
            p.updatedAt,
            p.deletedAt,
            p.cliente,
            p.vendedor,
            p.items
        );
    }
}
