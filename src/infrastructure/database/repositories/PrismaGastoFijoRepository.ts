import { IGastoFijoRepository } from '../../../domain/repositories/IGastoFijoRepository';
import { GastoFijo } from '../../../domain/entities/GastoFijo';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaGastoFijoRepository implements IGastoFijoRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<GastoFijo>> {
        const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const limitNum = Number(limit);
        const pageNum = Number(page);

        const results = await prisma.gastoFijo.findMany({
            where: filter,
            take: limitNum,
            skip: (pageNum - 1) * limitNum,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                categoria: true,
                sucursal: true,
                proveedor: true
            }
        });

        const total = await prisma.gastoFijo.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<GastoFijo | null> {
        const g = await prisma.gastoFijo.findUnique({
            where: { id },
            include: { categoria: true, sucursal: true, proveedor: true }
        });
        return g ? this.mapToEntity(g) : null;
    }

    async create(data: any): Promise<GastoFijo> {
        const g = await prisma.gastoFijo.create({ data });
        return this.mapToEntity(g);
    }

    async update(id: number, data: any): Promise<GastoFijo> {
        const g = await prisma.gastoFijo.update({
            where: { id },
            data,
        });
        return this.mapToEntity(g);
    }

    async delete(id: number): Promise<void> {
        await prisma.gastoFijo.delete({ where: { id } });
    }

    private mapToEntity(g: any): GastoFijo {
        return new GastoFijo(
            g.id,
            g.concesionariaId,
            g.sucursalId,
            g.categoriaId,
            g.proveedorId,
            g.usuarioId,
            g.descripcion,
            Number(g.monto),
            g.fecha,
            g.createdAt,
            g.updatedAt,
            g.deletedAt,
            g.categoria,
            g.sucursal,
            g.proveedor
        );
    }
}
