import { IGastoRepository } from '../../../domain/repositories/IGastoRepository';
import { Gasto } from '../../../domain/entities/Gasto';
import prisma from '../prisma';
import { QueryOptions, PaginatedResponse } from '../../../types/common';

export class PrismaGastoRepository implements IGastoRepository {
    async findAll(filter: any = {}, options: QueryOptions = {}): Promise<PaginatedResponse<Gasto>> {
        const limit = Number(options.limit) || 20;
        const page = Number(options.page) || 1;
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder || 'desc';

        const results = await prisma.gastoVehiculo.findMany({
            where: filter,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { [sortBy as string]: sortOrder },
            include: {
                categoria: true,
                vehiculo: { include: { sucursal: true } },
                proveedor: true
            }
        });

        const total = await prisma.gastoVehiculo.count({ where: filter });

        return {
            results: results.map(this.mapToEntity),
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: total,
        };
    }

    async findById(id: number): Promise<Gasto | null> {
        const g = await prisma.gastoVehiculo.findUnique({
            where: { id },
            include: { categoria: true, vehiculo: true, proveedor: true }
        });
        return g ? this.mapToEntity(g) : null;
    }

    async create(data: any): Promise<Gasto> {
        const g = await prisma.gastoVehiculo.create({ data });
        return this.mapToEntity(g);
    }

    async update(id: number, data: any): Promise<Gasto> {
        const g = await prisma.gastoVehiculo.update({
            where: { id },
            data,
        });
        return this.mapToEntity(g);
    }

    async delete(id: number): Promise<void> {
        await prisma.gastoVehiculo.delete({ where: { id } });
    }

    private mapToEntity(g: any): Gasto {
        return new Gasto(
            g.id,
            g.concesionariaId,
            g.sucursalId,
            g.vehiculoId,
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
            g.vehiculo,
            g.proveedor
        );
    }
}
