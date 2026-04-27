import { ICategoriaGastoRepository } from '../../../domain/repositories/ICategoriaGastoRepository';
import { CategoriaGasto } from '../../../domain/entities/CategoriaGasto';
import prisma from '../prisma';

export class PrismaCategoriaGastoRepository implements ICategoriaGastoRepository {
    async findAll(concesionariaId: number): Promise<CategoriaGasto[]> {
        const results = await prisma.categoriaGastoVehiculo.findMany({
            where: { concesionariaId },
            orderBy: { nombre: 'asc' }
        });
        return results.map(this.mapToEntity);
    }

    async findById(id: number): Promise<CategoriaGasto | null> {
        const c = await prisma.categoriaGastoVehiculo.findUnique({ where: { id } });
        return c ? this.mapToEntity(c) : null;
    }

    async create(data: any): Promise<CategoriaGasto> {
        const c = await prisma.categoriaGastoVehiculo.create({ data });
        return this.mapToEntity(c);
    }

    async update(id: number, data: any): Promise<CategoriaGasto> {
        const c = await prisma.categoriaGastoVehiculo.update({
            where: { id },
            data,
        });
        return this.mapToEntity(c);
    }

    async delete(id: number): Promise<void> {
        await prisma.categoriaGastoVehiculo.delete({ where: { id } });
    }

    async countGastos(id: number): Promise<number> {
        return prisma.gastoVehiculo.count({ where: { categoriaId: id } });
    }

    private mapToEntity(c: any): CategoriaGasto {
        return new CategoriaGasto(c.id, c.concesionariaId, c.nombre, c.createdAt, c.updatedAt, c.deletedAt);
    }
}
