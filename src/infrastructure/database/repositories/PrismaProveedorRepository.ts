import { IProveedorRepository } from '../../../domain/repositories/IProveedorRepository';
import { Proveedor } from '../../../domain/entities/Proveedor';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaProveedorRepository implements IProveedorRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Proveedor>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        // Multi-tenancy and Soft-delete are handled automatically by our Prisma extension!
        const results = await prisma.proveedor.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
        });

        const total = await prisma.proveedor.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Proveedor | null> {
        const p = await prisma.proveedor.findUnique({ where: { id } });
        return p ? this.mapToEntity(p) : null;
    }

    async create(data: any): Promise<Proveedor> {
        const p = await prisma.proveedor.create({ data });
        return this.mapToEntity(p);
    }

    async update(id: number, data: any): Promise<Proveedor> {
        const p = await prisma.proveedor.update({
            where: { id },
            data,
        });
        return this.mapToEntity(p);
    }

    async delete(id: number): Promise<void> {
        await prisma.proveedor.delete({ where: { id } });
    }

    async countGastos(id: number): Promise<number> {
        return prisma.gastoVehiculo.count({ where: { proveedorId: id } });
    }

    async countPostventaItems(id: number): Promise<number> {
        return prisma.postventaItem.count({ where: { proveedorId: id } });
    }

    private mapToEntity(p: any): Proveedor {
        return new Proveedor(
            p.id,
            p.concesionariaId,
            p.nombre,
            p.tipo,
            p.telefono,
            p.email,
            p.direccion,
            p.activo,
            p.createdAt,
            p.updatedAt,
            p.deletedAt
        );
    }
}
