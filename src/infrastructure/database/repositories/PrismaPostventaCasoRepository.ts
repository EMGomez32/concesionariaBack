import { IPostventaCasoRepository } from '../../../domain/repositories/IPostventaCasoRepository';
import { PostventaCaso } from '../../../domain/entities/PostventaCaso';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaPostventaCasoRepository implements IPostventaCasoRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<PostventaCaso>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.postventaCaso.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                cliente: true,
                vehiculo: true,
                sucursal: true,
                items: true
            }
        });

        const total = await prisma.postventaCaso.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<PostventaCaso | null> {
        const c = await prisma.postventaCaso.findUnique({
            where: { id },
            include: { cliente: true, vehiculo: true, sucursal: true, items: true }
        });
        return c ? this.mapToEntity(c) : null;
    }

    async create(data: any): Promise<PostventaCaso> {
        const c = await prisma.postventaCaso.create({
            data: {
                ...data,
                estado: 'pendiente'
            }
        });
        return this.mapToEntity(c);
    }

    async update(id: number, data: any): Promise<PostventaCaso> {
        const c = await prisma.postventaCaso.update({
            where: { id },
            data,
        });
        return this.mapToEntity(c);
    }

    async delete(id: number): Promise<void> {
        await prisma.postventaCaso.delete({ where: { id } });
    }

    private mapToEntity(c: any): PostventaCaso {
        return new PostventaCaso(
            c.id,
            c.concesionariaId,
            c.sucursalId,
            c.clienteId,
            c.vehiculoId,
            c.ventaId,
            c.fechaReclamo,
            c.tipo ?? null,
            c.descripcion,
            c.estado,
            c.fechaCierre ?? null,
            c.createdAt,
            c.updatedAt,
            c.deletedAt ?? null,
            c.cliente,
            c.vehiculo,
            c.sucursal,
            c.items
        );
    }
}
