import { ISucursalRepository } from '../../../domain/repositories/ISucursalRepository';
import { Sucursal } from '../../../domain/entities/Sucursal';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaSucursalRepository implements ISucursalRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Sucursal>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.sucursal.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                concesionaria: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
        });

        const total = await prisma.sucursal.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Sucursal | null> {
        const s = await prisma.sucursal.findUnique({ where: { id } });
        return s ? this.mapToEntity(s) : null;
    }

    async create(data: any): Promise<Sucursal> {
        const s = await prisma.sucursal.create({ data });
        return this.mapToEntity(s);
    }

    async update(id: number, data: any): Promise<Sucursal> {
        const s = await prisma.sucursal.update({
            where: { id },
            data,
        });
        return this.mapToEntity(s);
    }

    async delete(id: number): Promise<void> {
        await prisma.sucursal.delete({ where: { id } });
    }

    private mapToEntity(s: any): Sucursal {
        return new Sucursal(
            s.id,
            s.concesionariaId,
            s.nombre,
            s.direccion,
            s.ciudad,
            s.email,
            s.telefono,
            s.activo,
            s.createdAt,
            s.updatedAt,
            s.deletedAt
        );
    }
}
